import { useState, useEffect } from 'react';
import { makeSpotifyRequest } from '../utils/spotify';

function PlaylistPanel() {
  const [playlists, setPlaylists] = useState([]);
  const [filteredPlaylists, setFilteredPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    fetchPlaylists();
  }, []);

  useEffect(() => {
    // Filter playlists based on search term
    const filtered = playlists.filter(playlist =>
      playlist.name.toLowerCase().includes(searchFilter.toLowerCase())
    );
    setFilteredPlaylists(filtered);
  }, [searchFilter, playlists]);

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

  if (loading) {
    return (
      <div className="playlist-panel loading">
        <div className="panel-header">
          <h3>📁 Your Playlists</h3>
        </div>
        <div className="loading-content">
          <div className="spinner"></div>
          <p>Loading playlists...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="playlist-panel error">
        <div className="panel-header">
          <h3>📁 Your Playlists</h3>
        </div>
        <div className="error-content">
          <p>Error: {error}</p>
          <button onClick={fetchPlaylists}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="playlist-panel">
      <div className="panel-header">
        <h3>📁 Your Playlists</h3>
        <div className="search-container">
          <input
            type="text"
            placeholder="Search playlists..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="playlist-search"
          />
        </div>
      </div>

      <div className="playlists-list">
        {filteredPlaylists.length === 0 ? (
          <div className="no-playlists">
            {searchFilter ? 'No playlists found' : 'No playlists available'}
          </div>
        ) : (
          filteredPlaylists.map((playlist) => {
            const handleDragStart = (e) => {
              const playlistData = {
                id: playlist.id,
                name: playlist.name,
                image: playlist.images && playlist.images[0] ? playlist.images[0].url : null,
                trackCount: playlist.tracks ? playlist.tracks.total : 0,
                description: playlist.description || ''
              };
              e.dataTransfer.setData('application/json', JSON.stringify(playlistData));
              e.dataTransfer.effectAllowed = 'copy';
            };

            return (
              <div 
                key={playlist.id} 
                className="playlist-item"
                draggable={true}
                onDragStart={handleDragStart}
              >
                <div className="playlist-image-container">
                  {playlist.images && playlist.images[0] ? (
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
                  <div className="playlist-name">{playlist.name}</div>
                  <div className="playlist-details">
                    {playlist.tracks ? playlist.tracks.total : 0} tracks
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default PlaylistPanel;