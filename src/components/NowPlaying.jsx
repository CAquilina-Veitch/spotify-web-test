import { useState, useEffect } from 'react';
import { makeSpotifyRequest } from '../utils/spotify';
import PlaybackControls from './PlaybackControls';
import './PlaybackControls.css';

function NowPlaying() {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentTrack();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchCurrentTrack, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchCurrentTrack = async () => {
    try {
      setError(null);
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
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handlePlayStateChange = (newPlayState) => {
    setIsPlaying(newPlayState);
    // Refresh track info after a short delay
    setTimeout(fetchCurrentTrack, 500);
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
        <button onClick={fetchCurrentTrack}>Retry</button>
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
            className="album-art"
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
      
      <PlaybackControls 
        isPlaying={isPlaying} 
        onPlayStateChange={handlePlayStateChange}
      />
    </div>
  );
}

export default NowPlaying;