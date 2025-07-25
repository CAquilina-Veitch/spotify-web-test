import { useState, useEffect } from 'react';
import { makeSpotifyRequest, togglePlayback, skipToNext, skipToPrevious, seekToPosition, setShuffle, setRepeat } from '../utils/spotify';

function NowPlaying({ onTrackDragStart, onTrackDragEnd, mobileDragData, setMobileDragData, setMobileDragPreview }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [shuffleState, setShuffleState] = useState(false);
  const [repeatState, setRepeatState] = useState('off');

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
      setShuffleState(data.shuffle_state || false);
      setRepeatState(data.repeat_state || 'off');
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

  // Touch event handlers for mobile
  const handleTouchStart = (e) => {
    if (!currentTrack || !currentTrack.item) return;
    
    const touch = e.touches[0];
    
    // Create song data to transfer
    const songData = {
      id: currentTrack.item.id,
      name: currentTrack.item.name,
      artist: currentTrack.item.artists.map(a => a.name).join(', '),
      image: currentTrack.item.album.images[0]?.url,
      trackUri: currentTrack.item.uri,
      trackId: currentTrack.item.id
    };
    
    setMobileDragData(songData);
    setMobileDragPreview({
      x: touch.clientX,
      y: touch.clientY,
      image: currentTrack.item.album.images[0]?.url,
      type: 'song'
    });
    
    setIsDragging(true);
  };
  
  const handleTouchMove = (e) => {
    if (!mobileDragData) return;
    
    const touch = e.touches[0];
    setMobileDragPreview(prev => prev ? {
      ...prev,
      x: touch.clientX,
      y: touch.clientY
    } : null);
  };
  
  const handleTouchEnd = (e) => {
    setIsDragging(false);
    setMobileDragPreview(null);
    // Keep mobileDragData for the drop target to use
  };

  const handlePlayPause = async () => {
    try {
      const newState = await togglePlayback();
      setIsPlaying(newState);
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  const handleSkipNext = async () => {
    try {
      await skipToNext();
      // Refresh current track after a short delay
      setTimeout(() => fetchCurrentTrack(false), 300);
    } catch (error) {
      console.error('Error skipping to next:', error);
    }
  };

  const handleSkipPrevious = async () => {
    try {
      await skipToPrevious();
      // Refresh current track after a short delay
      setTimeout(() => fetchCurrentTrack(false), 300);
    } catch (error) {
      console.error('Error skipping to previous:', error);
    }
  };

  const handleProgressClick = (e) => {
    if (!currentTrack || !currentTrack.item) return;
    
    const progressBar = e.currentTarget;
    const clickX = e.nativeEvent.offsetX;
    const barWidth = progressBar.offsetWidth;
    const percentage = clickX / barWidth;
    const newPosition = Math.floor(percentage * currentTrack.item.duration_ms);
    
    seekToPosition(newPosition);
  };

  const handleShuffleToggle = async () => {
    try {
      const newState = !shuffleState;
      await setShuffle(newState);
      setShuffleState(newState);
    } catch (error) {
      console.error('Error toggling shuffle:', error);
    }
  };

  const handleRepeatToggle = async () => {
    try {
      let newState;
      if (repeatState === 'off') {
        newState = 'context';
      } else if (repeatState === 'context') {
        newState = 'track';
      } else {
        newState = 'off';
      }
      await setRepeat(newState);
      setRepeatState(newState);
    } catch (error) {
      console.error('Error toggling repeat:', error);
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
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
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
      
      <div className="playback-controls">
        <button 
          className={`control-button shuffle ${shuffleState ? 'active' : ''}`}
          onClick={handleShuffleToggle}
          title="Toggle shuffle"
        >
          🔀
        </button>
        <button 
          className="control-button"
          onClick={handleSkipPrevious}
          title="Previous track"
        >
          ⏮️
        </button>
        <button 
          className="control-button play-pause"
          onClick={handlePlayPause}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>
        <button 
          className="control-button"
          onClick={handleSkipNext}
          title="Next track"
        >
          ⏭️
        </button>
        <button 
          className={`control-button repeat ${repeatState !== 'off' ? 'active' : ''}`}
          onClick={handleRepeatToggle}
          title={`Repeat: ${repeatState}`}
        >
          {repeatState === 'track' ? '🔂' : '🔁'}
        </button>
      </div>
      
      <div className="progress-section">
        <div className="progress-info">
          <span className="current-time">{formatTime(currentTrack.progress_ms)}</span>
          <span className="total-time">{formatTime(track.duration_ms)}</span>
        </div>
        <div 
          className="progress-bar"
          onClick={handleProgressClick}
          style={{ cursor: 'pointer' }}
        >
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