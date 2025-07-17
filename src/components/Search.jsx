import { useState } from 'react';
import { makeSpotifyRequest } from '../utils/spotify';

function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({
    tracks: [],
    artists: [],
    albums: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('tracks');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await makeSpotifyRequest(
        `/search?q=${encodeURIComponent(query)}&type=track,artist,album&limit=20`
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults({
        tracks: data.tracks.items,
        artists: data.artists.items,
        albums: data.albums.items
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const playTrack = async (trackUri) => {
    try {
      await makeSpotifyRequest('/me/player/play', {
        method: 'PUT',
        body: JSON.stringify({
          uris: [trackUri]
        })
      });
    } catch (error) {
      console.error('Error playing track:', error);
    }
  };

  const playAlbum = async (albumUri) => {
    try {
      await makeSpotifyRequest('/me/player/play', {
        method: 'PUT',
        body: JSON.stringify({
          context_uri: albumUri
        })
      });
    } catch (error) {
      console.error('Error playing album:', error);
    }
  };

  const playArtistTopTracks = async (artistId) => {
    try {
      // Get artist's top tracks
      const response = await makeSpotifyRequest(`/artists/${artistId}/top-tracks?market=US`);
      if (!response.ok) return;
      
      const data = await response.json();
      if (data.tracks.length > 0) {
        await makeSpotifyRequest('/me/player/play', {
          method: 'PUT',
          body: JSON.stringify({
            uris: data.tracks.map(track => track.uri)
          })
        });
      }
    } catch (error) {
      console.error('Error playing artist tracks:', error);
    }
  };

  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds.padStart(2, '0')}`;
  };

  const renderTracks = () => (
    <div className="search-results">
      {results.tracks.map((track) => (
        <div 
          key={track.id} 
          className="search-item track-item"
          onClick={() => playTrack(track.uri)}
        >
          {track.album.images[0] && (
            <img 
              src={track.album.images[0].url} 
              alt={track.album.name}
              className="item-image"
            />
          )}
          <div className="item-info">
            <div className="item-name">{track.name}</div>
            <div className="item-details">
              {track.artists.map(artist => artist.name).join(', ')} • {track.album.name}
            </div>
          </div>
          <div className="item-duration">{formatDuration(track.duration_ms)}</div>
        </div>
      ))}
    </div>
  );

  const renderArtists = () => (
    <div className="search-results">
      {results.artists.map((artist) => (
        <div 
          key={artist.id} 
          className="search-item artist-item"
          onClick={() => playArtistTopTracks(artist.id)}
        >
          {artist.images[0] && (
            <img 
              src={artist.images[0].url} 
              alt={artist.name}
              className="item-image artist-image"
            />
          )}
          <div className="item-info">
            <div className="item-name">{artist.name}</div>
            <div className="item-details">
              {artist.followers.total.toLocaleString()} followers
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderAlbums = () => (
    <div className="search-results">
      {results.albums.map((album) => (
        <div 
          key={album.id} 
          className="search-item album-item"
          onClick={() => playAlbum(album.uri)}
        >
          {album.images[0] && (
            <img 
              src={album.images[0].url} 
              alt={album.name}
              className="item-image"
            />
          )}
          <div className="item-info">
            <div className="item-name">{album.name}</div>
            <div className="item-details">
              {album.artists.map(artist => artist.name).join(', ')} • {album.release_date.split('-')[0]}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="search">
      <h2>Search Music</h2>
      
      <form onSubmit={handleSearch} className="search-form">
        <div className="search-input-container">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for tracks, artists, or albums..."
            className="search-input"
          />
          <button type="submit" className="search-button" disabled={loading}>
            {loading ? '⏳' : '🔍'}
          </button>
        </div>
      </form>

      {error && (
        <div className="search-error">
          <p>Error: {error}</p>
        </div>
      )}

      {(results.tracks.length > 0 || results.artists.length > 0 || results.albums.length > 0) && (
        <div className="search-content">
          <div className="search-tabs">
            <button 
              className={`tab ${activeTab === 'tracks' ? 'active' : ''}`}
              onClick={() => setActiveTab('tracks')}
            >
              Tracks ({results.tracks.length})
            </button>
            <button 
              className={`tab ${activeTab === 'artists' ? 'active' : ''}`}
              onClick={() => setActiveTab('artists')}
            >
              Artists ({results.artists.length})
            </button>
            <button 
              className={`tab ${activeTab === 'albums' ? 'active' : ''}`}
              onClick={() => setActiveTab('albums')}
            >
              Albums ({results.albums.length})
            </button>
          </div>

          <div className="search-results-container">
            {activeTab === 'tracks' && renderTracks()}
            {activeTab === 'artists' && renderArtists()}
            {activeTab === 'albums' && renderAlbums()}
          </div>
        </div>
      )}
    </div>
  );
}

export default Search;