import { useState, useEffect } from 'react';
import { makeSpotifyRequest, playPlaylist } from '../utils/spotify';

function PlaylistPanel({ mobileDragData, setMobileDragData, setMobileDragPreview }) {
  const [playlists, setPlaylists] = useState([]);
  const [filteredPlaylists, setFilteredPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [draggingPlaylist, setDraggingPlaylist] = useState(null);
  const [draggedOverPlaylist, setDraggedOverPlaylist] = useState(null);

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
      
      // Get saved playlist order from localStorage
      const savedOrder = localStorage.getItem('spotify_playlist_order');
      let orderedPlaylists = data.items;
      
      if (savedOrder) {
        try {
          const orderMap = JSON.parse(savedOrder);
          // Sort playlists based on saved order
          orderedPlaylists = [...data.items].sort((a, b) => {
            const orderA = orderMap[a.id] !== undefined ? orderMap[a.id] : 999;
            const orderB = orderMap[b.id] !== undefined ? orderMap[b.id] : 999;
            return orderA - orderB;
          });
        } catch (e) {
          console.error('Error parsing saved playlist order:', e);
        }
      }
      
      setPlaylists(orderedPlaylists);
      setLoading(false);
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const savePlaylistOrder = (orderedPlaylists) => {
    const orderMap = {};
    orderedPlaylists.forEach((playlist, index) => {
      orderMap[playlist.id] = index;
    });
    localStorage.setItem('spotify_playlist_order', JSON.stringify(orderMap));
  };

  const handlePlaylistDragOver = (e, targetPlaylistId) => {
    e.preventDefault();
    setDraggedOverPlaylist(targetPlaylistId);
  };

  const handlePlaylistDrop = (e, targetPlaylistId) => {
    e.preventDefault();
    
    if (draggingPlaylist && draggingPlaylist !== targetPlaylistId) {
      const draggedIndex = playlists.findIndex(p => p.id === draggingPlaylist);
      const targetIndex = playlists.findIndex(p => p.id === targetPlaylistId);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const newPlaylists = [...playlists];
        const [draggedPlaylist] = newPlaylists.splice(draggedIndex, 1);
        newPlaylists.splice(targetIndex, 0, draggedPlaylist);
        
        setPlaylists(newPlaylists);
        savePlaylistOrder(newPlaylists);
      }
    }
    
    setDraggedOverPlaylist(null);
  };

  const resetPlaylistOrder = () => {
    localStorage.removeItem('spotify_playlist_order');
    fetchPlaylists();
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
        <div className="header-row">
          <h3>📁 Your Playlists</h3>
          <button 
            className="reset-order-button"
            onClick={resetPlaylistOrder}
            title="Reset playlist order"
          >
            ↻
          </button>
        </div>
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
            const playlistData = {
              id: playlist.id,
              name: playlist.name,
              image: playlist.images && playlist.images[0] ? playlist.images[0].url : null,
              trackCount: playlist.tracks ? playlist.tracks.total : 0,
              description: playlist.description || '',
              playlistId: playlist.id
            };

            const handleDragStart = (e) => {
              e.dataTransfer.setData('application/json', JSON.stringify(playlistData));
              e.dataTransfer.effectAllowed = 'copy';
              setDraggingPlaylist(playlist.id);
            };
            
            const handleDragEnd = () => {
              setDraggingPlaylist(null);
            };
            
            // Touch event handlers for mobile
            const handleTouchStart = (e) => {
              const touch = e.touches[0];
              
              setMobileDragData(playlistData);
              setMobileDragPreview({
                x: touch.clientX,
                y: touch.clientY,
                image: playlistData.image,
                type: 'playlist'
              });
              
              setDraggingPlaylist(playlist.id);
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
              setDraggingPlaylist(null);
              setMobileDragPreview(null);
              // Keep mobileDragData for the drop target to use
            };

            const handlePlayPlaylist = async (e) => {
              e.stopPropagation();
              try {
                await playPlaylist(playlist.id);
              } catch (error) {
                console.error('Error playing playlist:', error);
              }
            };

            return (
              <div 
                key={playlist.id} 
                className={`playlist-item ${draggingPlaylist === playlist.id ? 'dragging' : ''} ${draggedOverPlaylist === playlist.id ? 'drag-over' : ''}`}
                draggable={true}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handlePlaylistDragOver(e, playlist.id)}
                onDragLeave={() => setDraggedOverPlaylist(null)}
                onDrop={(e) => handlePlaylistDrop(e, playlist.id)}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
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
                <button 
                  className="playlist-play-button"
                  onClick={handlePlayPlaylist}
                  title="Play playlist"
                >
                  ▶️
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default PlaylistPanel;