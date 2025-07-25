import { useState, useEffect, useRef } from 'react';
import { getCompleteQueue, getAudioFeatures, makeSpotifyRequest } from '../utils/spotify';
import './LiveQueue.css';

function LiveQueue({ onTrackDragStart, onTrackDragEnd, mobileDragData, setMobileDragData, setMobileDragPreview }) {
  const [queueData, setQueueData] = useState({
    recent: [],
    current: null,
    upcoming: [],
    is_playing: false,
    progress_ms: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const refreshInterval = useRef(null);
  const searchTimeout = useRef(null);
  const audioFeaturesCache = useRef(new Map());

  // Fetch queue data
  const fetchQueueData = async () => {
    try {
      const data = await getCompleteQueue();
      setQueueData(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching queue data:', error);
      setError('Failed to load queue');
    } finally {
      setLoading(false);
    }
  };

  // Search for tracks with debouncing
  const searchTracks = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setSearching(true);
    try {
      const response = await makeSpotifyRequest(`/search?q=${encodeURIComponent(query)}&type=track&limit=6`);
      const data = await response.json();
      setSearchResults(data.tracks.items);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Handle search input with debouncing
  const handleSearchInput = (value) => {
    setSearchQuery(value);
    
    // Clear existing timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // Set new timeout for debounced search
    searchTimeout.current = setTimeout(() => {
      searchTracks(value);
    }, 500);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
  };

  // Setup polling
  useEffect(() => {
    fetchQueueData();

    // Poll every 5 seconds when tab is visible
    const startPolling = () => {
      if (refreshInterval.current) clearInterval(refreshInterval.current);
      refreshInterval.current = setInterval(fetchQueueData, 5000);
    };

    const stopPolling = () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
        refreshInterval.current = null;
      }
    };

    // Handle visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    startPolling();

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Get cached or fetch audio features
  const getTrackAudioFeatures = async (trackId) => {
    if (audioFeaturesCache.current.has(trackId)) {
      return audioFeaturesCache.current.get(trackId);
    }

    try {
      const features = await getAudioFeatures(trackId);
      audioFeaturesCache.current.set(trackId, features);
      return features;
    } catch (error) {
      console.error('Error fetching audio features:', error);
      return null;
    }
  };

  // Handle track drag start
  const handleDragStart = async (e, track, type) => {
    const audioFeatures = await getTrackAudioFeatures(track.id);
    
    const trackData = {
      id: track.id,
      uri: track.uri,
      name: track.name,
      artists: track.artists?.map(a => a.name).join(', ') || 'Unknown Artist',
      image: track.album?.images?.[0]?.url || '',
      audioFeatures,
      type: 'song'
    };

    e.dataTransfer.setData('application/json', JSON.stringify(trackData));
    e.dataTransfer.effectAllowed = 'copy';

    if (onTrackDragStart) {
      onTrackDragStart(trackData);
    }
  };

  // Handle track drag end
  const handleDragEnd = (e) => {
    if (onTrackDragEnd) {
      onTrackDragEnd();
    }
  };

  // Handle mobile touch events
  const handleTouchStart = async (e, track, type) => {
    e.preventDefault();
    
    const audioFeatures = await getTrackAudioFeatures(track.id);
    const trackData = {
      id: track.id,
      uri: track.uri,
      name: track.name,
      artists: track.artists?.map(a => a.name).join(', ') || 'Unknown Artist',
      image: track.album?.images?.[0]?.url || '',
      audioFeatures,
      type: 'song'
    };

    setMobileDragData(trackData);
    
    const touch = e.touches[0];
    setMobileDragPreview({
      x: touch.clientX,
      y: touch.clientY,
      image: trackData.image,
      type: 'song'
    });
  };

  // Render track icon
  const renderTrackIcon = (track, type, index) => {
    if (!track) {
      return (
        <div key={`empty-${type}-${index}`} className={`queue-track empty-track ${type}`}>
          <div className="track-placeholder">•</div>
        </div>
      );
    }

    const imageUrl = track.album?.images?.[2]?.url || track.album?.images?.[0]?.url;
    const isCurrentTrack = type === 'current';

    return (
      <div
        key={track.id}
        className={`queue-track ${type} ${isCurrentTrack ? 'current-playing' : ''}`}
        draggable
        onDragStart={(e) => handleDragStart(e, track, type)}
        onDragEnd={handleDragEnd}
        onTouchStart={(e) => handleTouchStart(e, track, type)}
        title={`${track.name} - ${track.artists?.map(a => a.name).join(', ') || 'Unknown'}`}
      >
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={track.name}
            className="track-image"
          />
        ) : (
          <div className="track-placeholder">♪</div>
        )}
        {isCurrentTrack && queueData.is_playing && (
          <div className="playing-indicator">
            <div className="playing-bars">
              <div className="bar"></div>
              <div className="bar"></div>
              <div className="bar"></div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="live-queue">
        <div className="queue-header">
          <h3>Queue</h3>
        </div>
        <div className="queue-tracks">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="queue-track loading">
              <div className="track-placeholder">•</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="live-queue">
        <div className="queue-header">
          <h3>Queue</h3>
        </div>
        <div className="queue-error">
          <p>{error}</p>
          <button onClick={fetchQueueData} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const allTracks = [
    ...queueData.recent.reverse(), // Show most recent last
    queueData.current,
    ...queueData.upcoming
  ];

  // Ensure we have exactly 7 slots
  while (allTracks.length < 7) {
    allTracks.push(null);
  }

  // Render search result icon
  const renderSearchResult = (track, index) => {
    const imageUrl = track.album?.images?.[2]?.url || track.album?.images?.[0]?.url;

    return (
      <div
        key={track.id}
        className="search-result-track"
        draggable
        onDragStart={(e) => handleDragStart(e, track, 'search')}
        onDragEnd={handleDragEnd}
        onTouchStart={(e) => handleTouchStart(e, track, 'search')}
        title={`${track.name} - ${track.artists?.map(a => a.name).join(', ') || 'Unknown'}`}
      >
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={track.name}
            className="track-image"
          />
        ) : (
          <div className="track-placeholder">♪</div>
        )}
      </div>
    );
  };

  return (
    <div className="live-queue">
      <div className="queue-header">
        <h3>Queue</h3>
        <div className="queue-status">
          {queueData.is_playing ? '▶' : '⏸'}
        </div>
      </div>

      {/* Search Section */}
      <div className="search-section">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search songs..."
            value={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button onClick={clearSearch} className="clear-search">
              ×
            </button>
          )}
        </div>

        {/* Search Results */}
        {showSearchResults && (
          <div className={`search-results ${searching ? 'loading' : ''}`}>
            {searching ? (
              <div className="search-loading">Searching...</div>
            ) : searchResults.length > 0 ? (
              <div className="search-results-grid">
                {searchResults.map((track, index) => renderSearchResult(track, index))}
              </div>
            ) : (
              <div className="no-results">No songs found</div>
            )}
          </div>
        )}
      </div>
      
      <div className="queue-tracks">
        {allTracks.slice(0, 7).map((track, index) => {
          let type = 'upcoming';
          
          if (index < queueData.recent.length) {
            type = 'recent';
          } else if (index === queueData.recent.length && queueData.current) {
            type = 'current';
          }
          
          return renderTrackIcon(track, type, index);
        })}
      </div>

      <div className="queue-legend">
        <div className="legend-item">
          <div className="legend-dot recent"></div>
          <span>Recent</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot current"></div>
          <span>Now</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot upcoming"></div>
          <span>Next</span>
        </div>
      </div>
    </div>
  );
}

export default LiveQueue;