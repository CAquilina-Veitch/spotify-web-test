import { useState, useEffect } from 'react';
import { makeSpotifyRequest } from '../utils/spotify';
import { generateShareUrl, calculateUrlLength } from '../utils/queueEncoding';
import './QueueBuilder.css';

function QueueBuilder({ onClose }) {
  const [queue, setQueue] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [urlStats, setUrlStats] = useState(null);

  // Search for tracks
  const searchTracks = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const response = await makeSpotifyRequest(`/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=10`);
      const data = await response.json();
      setSearchResults(data.tracks.items);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  // Add track to queue
  const addToQueue = (track) => {
    if (queue.find(t => t.id === track.id)) {
      return; // Already in queue
    }
    
    const newQueue = [...queue, {
      id: track.id,
      uri: track.uri,
      name: track.name,
      artists: track.artists.map(a => a.name).join(', '),
      image: track.album.images[0]?.url
    }];
    
    setQueue(newQueue);
    updateUrlStats(newQueue);
  };

  // Remove track from queue
  const removeFromQueue = (trackId) => {
    const newQueue = queue.filter(t => t.id !== trackId);
    setQueue(newQueue);
    updateUrlStats(newQueue);
  };

  // Move track in queue
  const moveTrack = (fromIndex, toIndex) => {
    const newQueue = [...queue];
    const [removed] = newQueue.splice(fromIndex, 1);
    newQueue.splice(toIndex, 0, removed);
    setQueue(newQueue);
  };

  // Update URL stats
  const updateUrlStats = (tracks) => {
    const stats = calculateUrlLength(tracks);
    setUrlStats(stats);
  };

  // Generate share link
  const generateShare = () => {
    const url = generateShareUrl(queue);
    setShareUrl(url);
    setShowShare(true);
  };

  // Copy to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Share via Web Share API
  const shareViaAPI = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Spotify Queue',
          text: `Check out my ${queue.length} song queue!`,
          url: shareUrl
        });
      } catch (error) {
        console.error('Share failed:', error);
      }
    }
  };

  // Handle drop from other components
  useEffect(() => {
    const handleDrop = (e) => {
      e.preventDefault();
      const trackData = e.dataTransfer.getData('application/json');
      if (trackData) {
        try {
          const track = JSON.parse(trackData);
          addToQueue(track);
        } catch (error) {
          console.error('Error parsing dropped data:', error);
        }
      }
    };

    const handleDragOver = (e) => {
      e.preventDefault();
    };

    const queueArea = document.querySelector('.queue-builder');
    if (queueArea) {
      queueArea.addEventListener('drop', handleDrop);
      queueArea.addEventListener('dragover', handleDragOver);
      
      return () => {
        queueArea.removeEventListener('drop', handleDrop);
        queueArea.removeEventListener('dragover', handleDragOver);
      };
    }
  }, [queue]);

  return (
    <div className="queue-builder-overlay">
      <div className="queue-builder">
        <div className="queue-header">
          <h2>Build Your Queue</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="queue-content">
          {/* Search Section */}
          <div className="search-section">
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search for songs to add..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchTracks()}
              />
              <button onClick={searchTracks} disabled={searching}>
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map(track => (
                  <div key={track.id} className="search-result-item">
                    <img src={track.album.images[2]?.url} alt={track.name} />
                    <div className="track-info">
                      <div className="track-name">{track.name}</div>
                      <div className="track-artist">{track.artists.map(a => a.name).join(', ')}</div>
                    </div>
                    <button 
                      className="add-button"
                      onClick={() => addToQueue(track)}
                      disabled={queue.find(t => t.id === track.id)}
                    >
                      {queue.find(t => t.id === track.id) ? '✓' : '+'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Queue Section */}
          <div className="queue-section">
            <div className="queue-header-info">
              <h3>Your Queue ({queue.length} songs)</h3>
              {urlStats && (
                <div className={`url-warning ${!urlStats.isWithinLimit ? 'warning' : ''}`}>
                  {urlStats.isWithinLimit 
                    ? `✓ URL length OK (${urlStats.totalUrlLength} chars)`
                    : `⚠ URL may be too long (${urlStats.totalUrlLength} chars)`
                  }
                </div>
              )}
            </div>

            {queue.length === 0 ? (
              <div className="empty-queue">
                <p>Your queue is empty</p>
                <p className="hint">Search for songs or drag tracks from your playlists</p>
              </div>
            ) : (
              <div className="queue-list">
                {queue.map((track, index) => (
                  <div key={track.id} className="queue-item" draggable>
                    <div className="drag-handle">≡</div>
                    <img src={track.image} alt={track.name} />
                    <div className="track-info">
                      <div className="track-name">{track.name}</div>
                      <div className="track-artist">{track.artists}</div>
                    </div>
                    <button 
                      className="remove-button"
                      onClick={() => removeFromQueue(track.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {queue.length > 0 && (
              <div className="queue-actions">
                <button className="share-button" onClick={generateShare}>
                  Share Queue
                </button>
                <button className="clear-button" onClick={() => {
                  setQueue([]);
                  setUrlStats(null);
                }}>
                  Clear All
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Share Modal */}
        {showShare && (
          <div className="share-modal">
            <div className="share-content">
              <h3>Share Your Queue</h3>
              <p>Anyone with this link can import your {queue.length} songs to their Spotify queue!</p>
              
              <div className="share-url">
                <input 
                  type="text" 
                  value={shareUrl} 
                  readOnly 
                  onClick={(e) => e.target.select()}
                />
              </div>

              <div className="share-actions">
                <button onClick={copyToClipboard}>Copy Link</button>
                {navigator.share && (
                  <button onClick={shareViaAPI}>Share...</button>
                )}
              </div>

              <button className="close-share" onClick={() => setShowShare(false)}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default QueueBuilder;