import { useState, useEffect } from 'react';
import { makeSpotifyRequest } from '../utils/spotify';

function NowPlaying({ onTrackDragStart, onTrackDragEnd }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    fetchCurrentTrack(false); // Initial fetch - show errors
    // Poll for updates every 5 seconds
    const interval = setInterval(() => fetchCurrentTrack(true), 5000); // Background polls - suppress errors
    return () => clearInterval(interval);
  }, []);

  const fetchCurrentTrack = async (isBackgroundPoll = false) => {
    try {
      if (!isBackgroundPoll) {
        setError(null);
      }
      setIsPolling(isBackgroundPoll);
      
      const response = await makeSpotifyRequest('/me/player/currently-playing');
      
      if (response.status === 204) {
        // No track currently playing
        setCurrentTrack(null);
        setIsPlaying(false);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch current track');
      }

      const data = await response.json();
      setCurrentTrack(data);
      setIsPlaying(data.is_playing);
      setLoading(false);
      
      // Clear error on successful fetch
      if (error) {
        setError(null);
      }
    } catch (error) {
      // Only show errors for user-initiated fetches, not background polls
      if (!isBackgroundPoll) {
        setError(error.message);
      }
      setLoading(false);
    } finally {
      setIsPolling(false);
    }
  };


  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds.padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (!currentTrack || !currentTrack.item) return 0;
    return (currentTrack.progress_ms / currentTrack.item.duration_ms) * 100;
  };

  const handleDragStart = (e) => {
    if (!currentTrack || !currentTrack.item) return;
    
    setIsDragging(true);
    
    // Create song data to transfer
    const songData = {
      id: currentTrack.item.id,
      name: currentTrack.item.name,
      artist: currentTrack.item.artists.map(a => a.name).join(', '),
      image: currentTrack.item.album.images[0]?.url,
      uri: currentTrack.item.uri
    };
    
    e.dataTransfer.setData('application/json', JSON.stringify(songData));
    e.dataTransfer.effectAllowed = 'copy';
    
    if (onTrackDragStart) {
      onTrackDragStart(songData);
    }
  };

  const handleDragEnd = (e) => {
    setIsDragging(false);
    if (onTrackDragEnd) {
      onTrackDragEnd();
    }
  };

  if (loading) {
    return (
      <div className="now-playing loading">
        <div className="spinner"></div>
        <p>Loading current track...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="now-playing error">
        <p>Error: {error}</p>
        <button onClick={() => fetchCurrentTrack(false)}>Retry</button>
      </div>
    );
  }

  if (!currentTrack || !currentTrack.item) {
    return (
      <div className="now-playing no-track">
        <p>No track currently playing</p>
        <p>Start playing music on Spotify to see it here!</p>
      </div>
    );
  }

  const track = currentTrack.item;
  const artists = track.artists.map(artist => artist.name).join(', ');
  const albumArt = track.album.images[0]?.url || null;

  return (
    <div className="now-playing">
      <div className="track-info">
        {albumArt && (
          <img 
            src={albumArt} 
            alt={`${track.album.name} album cover`}
            className={`album-art ${isDragging ? 'dragging' : ''}`}
            draggable={true}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          />
        )}
        <div className="track-details">
          <h2 className="track-name">{track.name}</h2>
          <p className="artists">{artists}</p>
          <p className="album">{track.album.name}</p>
          <div className="playback-status">
            <span className={`status ${isPlaying ? 'playing' : 'paused'}`}>
              {isPlaying ? '▶️ Playing' : '⏸️ Paused'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="progress-section">
        <div className="progress-info">
          <span className="current-time">{formatTime(currentTrack.progress_ms)}</span>
          <span className="total-time">{formatTime(track.duration_ms)}</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${getProgressPercentage()}%` }}
          ></div>
        </div>
      </div>
      
    </div>
  );
}

export default NowPlaying;