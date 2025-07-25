import { useState, useEffect } from 'react';
import { getQueueFromUrl } from '../utils/queueEncoding';
import { addMultipleToQueue, makeSpotifyRequest } from '../utils/spotify';
import './QueueImport.css';

function QueueImport({ onClose, onSuccess }) {
  const [tracks, setTracks] = useState([]);
  const [trackDetails, setTrackDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadQueueData();
  }, []);

  const loadQueueData = async () => {
    try {
      // Get track URIs from URL
      const trackUris = getQueueFromUrl();
      if (!trackUris || trackUris.length === 0) {
        setError('No queue data found in URL');
        setLoading(false);
        return;
      }

      setTracks(trackUris);

      // Fetch track details for preview
      const trackIds = trackUris.map(uri => uri.split(':')[2]).join(',');
      const response = await makeSpotifyRequest(`/tracks?ids=${trackIds}`);
      const data = await response.json();
      
      setTrackDetails(data.tracks);
      setLoading(false);
    } catch (error) {
      console.error('Error loading queue:', error);
      setError('Failed to load queue data');
      setLoading(false);
    }
  };

  const importQueue = async () => {
    setImporting(true);
    setProgress({ current: 0, total: tracks.length });

    try {
      const results = await addMultipleToQueue(tracks, (current, total) => {
        setProgress({ current, total });
      });

      setResults(results);
      
      // Check if all succeeded
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (successCount === tracks.length) {
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 1500);
      }
    } catch (error) {
      console.error('Error importing queue:', error);
      setError('Failed to import queue');
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="queue-import-overlay">
        <div className="queue-import">
          <div className="loading-message">Loading queue data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="queue-import-overlay">
        <div className="queue-import">
          <div className="error-message">
            <h3>Error</h3>
            <p>{error}</p>
            <button onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="queue-import-overlay">
      <div className="queue-import">
        <div className="import-header">
          <h2>Import Queue</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="import-content">
          <p className="import-description">
            Ready to add {trackDetails.length} songs to your Spotify queue
          </p>

          <div className="track-preview">
            <h3>Songs to Import:</h3>
            <div className="track-list">
              {trackDetails.map((track, index) => (
                <div key={track.id} className="track-item">
                  <span className="track-number">{index + 1}</span>
                  <img src={track.album.images[2]?.url} alt={track.name} />
                  <div className="track-info">
                    <div className="track-name">{track.name}</div>
                    <div className="track-artist">
                      {track.artists.map(a => a.name).join(', ')}
                    </div>
                  </div>
                  {results && (
                    <span className={`track-status ${results[index]?.success ? 'success' : 'failed'}`}>
                      {results[index]?.success ? '✓' : '✗'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {!importing && !results && (
            <div className="import-actions">
              <button className="import-button" onClick={importQueue}>
                Add All to Queue
              </button>
              <button className="cancel-button" onClick={onClose}>
                Cancel
              </button>
            </div>
          )}

          {importing && (
            <div className="import-progress">
              <h3>Importing Songs...</h3>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              <p>{progress.current} of {progress.total} songs added</p>
            </div>
          )}

          {results && (
            <div className="import-results">
              <h3>Import Complete!</h3>
              <p>
                Successfully added {results.filter(r => r.success).length} of {results.length} songs
              </p>
              {results.some(r => !r.success) && (
                <p className="error-note">
                  Some songs couldn't be added. This might be due to regional restrictions or temporary issues.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default QueueImport;