import { useState } from 'react';
import { makeSpotifyRequest } from '../utils/spotify';

function PlaybackControls({ isPlaying, onPlayStateChange }) {
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePlayPause = async () => {
    setLoading(true);
    try {
      const endpoint = isPlaying ? '/me/player/pause' : '/me/player/play';
      const response = await makeSpotifyRequest(endpoint, {
        method: 'PUT',
      });

      if (response.ok) {
        onPlayStateChange(!isPlaying);
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipNext = async () => {
    setLoading(true);
    try {
      const response = await makeSpotifyRequest('/me/player/next', {
        method: 'POST',
      });

      if (response.ok) {
        // Trigger a refresh of the current track
        setTimeout(() => onPlayStateChange(true), 500);
      }
    } catch (error) {
      console.error('Error skipping to next track:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipPrevious = async () => {
    setLoading(true);
    try {
      const response = await makeSpotifyRequest('/me/player/previous', {
        method: 'POST',
      });

      if (response.ok) {
        // Trigger a refresh of the current track
        setTimeout(() => onPlayStateChange(true), 500);
      }
    } catch (error) {
      console.error('Error skipping to previous track:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVolumeChange = async (newVolume) => {
    try {
      const response = await makeSpotifyRequest(`/me/player/volume?volume_percent=${newVolume}`, {
        method: 'PUT',
      });

      if (response.ok) {
        setVolume(newVolume);
      }
    } catch (error) {
      console.error('Error changing volume:', error);
    }
  };

  const handleMute = async () => {
    const newMuteState = !isMuted;
    const targetVolume = newMuteState ? 0 : volume;
    
    try {
      const response = await makeSpotifyRequest(`/me/player/volume?volume_percent=${targetVolume}`, {
        method: 'PUT',
      });

      if (response.ok) {
        setIsMuted(newMuteState);
      }
    } catch (error) {
      console.error('Error muting/unmuting:', error);
    }
  };

  const handleShuffle = async () => {
    try {
      const response = await makeSpotifyRequest('/me/player/shuffle?state=true', {
        method: 'PUT',
      });

      if (response.ok) {
        // Visual feedback could be added here
        console.log('Shuffle enabled');
      }
    } catch (error) {
      console.error('Error enabling shuffle:', error);
    }
  };

  const handleRepeat = async () => {
    try {
      const response = await makeSpotifyRequest('/me/player/repeat?state=track', {
        method: 'PUT',
      });

      if (response.ok) {
        // Visual feedback could be added here
        console.log('Repeat enabled');
      }
    } catch (error) {
      console.error('Error enabling repeat:', error);
    }
  };

  return (
    <div className="playback-controls">
      <div className="main-controls">
        <button 
          className="control-button secondary" 
          onClick={handleSkipPrevious}
          disabled={loading}
          title="Previous track"
        >
          ⏮️
        </button>
        
        <button 
          className={`control-button primary ${loading ? 'loading' : ''}`}
          onClick={handlePlayPause}
          disabled={loading}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {loading ? '⏳' : (isPlaying ? '⏸️' : '▶️')}
        </button>
        
        <button 
          className="control-button secondary" 
          onClick={handleSkipNext}
          disabled={loading}
          title="Next track"
        >
          ⏭️
        </button>
      </div>

      <div className="additional-controls">
        <button 
          className="control-button small" 
          onClick={handleShuffle}
          title="Shuffle"
        >
          🔀
        </button>
        
        <button 
          className="control-button small" 
          onClick={handleRepeat}
          title="Repeat"
        >
          🔁
        </button>
      </div>

      <div className="volume-control">
        <button 
          className="control-button small" 
          onClick={handleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
        
        <input
          type="range"
          min="0"
          max="100"
          value={isMuted ? 0 : volume}
          onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
          className="volume-slider"
          title="Volume"
        />
        
        <span className="volume-display">{isMuted ? 0 : volume}%</span>
      </div>
    </div>
  );
}

export default PlaybackControls;