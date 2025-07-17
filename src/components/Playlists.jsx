import { useState, useEffect } from 'react';
import { makeSpotifyRequest } from '../utils/spotify';

function Playlists() {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistTracks, setPlaylistTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(false);

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    try {
      setError(null);
      const response = await makeSpotifyRequest('/me/playlists?limit=50');
      
      if (!response.ok) {
        throw new Error('Failed to fetch playlists');
      }

      const data = await response.json();
      setPlaylists(data.items);
      setLoading(false);
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const fetchPlaylistTracks = async (playlistId) => {
    setLoadingTracks(true);
    try {
      const response = await makeSpotifyRequest(`/playlists/${playlistId}/tracks?limit=50`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch playlist tracks');
      }

      const data = await response.json();
      setPlaylistTracks(data.items);
      setLoadingTracks(false);
    } catch (error) {
      console.error('Error fetching playlist tracks:', error);
      setLoadingTracks(false);
    }
  };

  const handlePlaylistClick = (playlist) => {
    setSelectedPlaylist(playlist);
    fetchPlaylistTracks(playlist.id);
  };

  const handleBackToPlaylists = () => {
    setSelectedPlaylist(null);
    setPlaylistTracks([]);
  };

  const playTrack = async (trackUri, contextUri) => {
    try {
      await makeSpotifyRequest('/me/player/play', {
        method: 'PUT',
        body: JSON.stringify({
          context_uri: contextUri,
          offset: { uri: trackUri }
        })
      });
    } catch (error) {
      console.error('Error playing track:', error);
    }
  };

  if (loading) {
    return (
      <div className="playlists loading">
        <div className="spinner"></div>
        <p>Loading playlists...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="playlists error">
        <p>Error: {error}</p>
        <button onClick={fetchPlaylists}>Retry</button>
      </div>
    );
  }

  if (selectedPlaylist) {
    return (
      <div className="playlists">
        <div className="playlist-header">
          <button className="back-button" onClick={handleBackToPlaylists}>
            ← Back to Playlists
          </button>
          <div className="playlist-info">
            {selectedPlaylist.images[0] && (
              <img 
                src={selectedPlaylist.images[0].url} 
                alt={selectedPlaylist.name}
                className="playlist-image"
              />
            )}
            <div>
              <h2>{selectedPlaylist.name}</h2>
              <p>{selectedPlaylist.tracks.total} tracks</p>
              <p>by {selectedPlaylist.owner.display_name}</p>
            </div>
          </div>
        </div>

        <div className="playlist-tracks">
          {loadingTracks ? (
            <div className="loading-tracks">
              <div className="spinner"></div>
              <p>Loading tracks...</p>
            </div>
          ) : (
            <div className="tracks-list">
              {playlistTracks.map((item, index) => {
                const track = item.track;
                if (!track) return null;
                
                const artists = track.artists.map(artist => artist.name).join(', ');
                
                return (
                  <div 
                    key={track.id || index} 
                    className="track-item"
                    onClick={() => playTrack(track.uri, selectedPlaylist.uri)}
                  >
                    <div className="track-number">{index + 1}</div>
                    {track.album.images[0] && (
                      <img 
                        src={track.album.images[0].url} 
                        alt={track.album.name}
                        className="track-image"
                      />
                    )}
                    <div className="track-info">
                      <div className="track-name">{track.name}</div>
                      <div className="track-artists">{artists}</div>
                    </div>
                    <div className="track-duration">
                      {Math.floor(track.duration_ms / 60000)}:{((track.duration_ms % 60000) / 1000).toFixed(0).padStart(2, '0')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="playlists">
      <h2>Your Playlists</h2>
      <div className="playlists-grid">
        {playlists.map((playlist) => (
          <div 
            key={playlist.id} 
            className="playlist-card"
            onClick={() => handlePlaylistClick(playlist)}
          >
            <div className="playlist-image-container">
              {playlist.images[0] ? (
                <img 
                  src={playlist.images[0].url} 
                  alt={playlist.name}
                  className="playlist-image"
                />
              ) : (
                <div className="placeholder-image">🎵</div>
              )}
            </div>
            <div className="playlist-info">
              <h3>{playlist.name}</h3>
              <p>{playlist.tracks.total} tracks</p>
              <p className="playlist-owner">by {playlist.owner.display_name}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Playlists;