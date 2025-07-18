// Spotify Web API configuration
const CLIENT_ID = 'd99bb196bf4a4d05bd7ee06d9d6cdb61'; // Replace with your Spotify app client ID
const REDIRECT_URI = window.location.hostname === 'localhost' 
  ? 'http://localhost:4173/spotify-web-test/callback' 
  : 'https://caquilina-veitch.github.io/spotify-web-test/callback';
const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'playlist-modify-public',
  'playlist-modify-private',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-library-read',
  'user-library-modify'
].join(' ');

// Generate random string for PKCE
function generateRandomString(length) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// Generate code challenge for PKCE
async function generateCodeChallenge(codeVerifier) {
  function base64encode(string) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(string)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return base64encode(digest);
}

// Start authentication flow
export async function authenticateSpotify() {
  const codeVerifier = generateRandomString(128);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  
  // Store code verifier in localStorage
  localStorage.setItem('code_verifier', codeVerifier);
  
  // Build authorization URL
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
  });

  // Redirect to Spotify authorization
  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
}

// Exchange authorization code for access token
export async function getAccessToken(code) {
  const codeVerifier = localStorage.getItem('code_verifier');
  
  if (!codeVerifier) {
    throw new Error('No code verifier found');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to get access token');
  }

  const data = await response.json();
  
  // Store tokens
  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('refresh_token', data.refresh_token);
  localStorage.setItem('expires_at', Date.now() + data.expires_in * 1000);
  
  // Clean up code verifier
  localStorage.removeItem('code_verifier');
  
  return data;
}

// Get stored access token
export function getStoredAccessToken() {
  const token = localStorage.getItem('access_token');
  const expiresAt = localStorage.getItem('expires_at');
  
  if (!token || !expiresAt) {
    return null;
  }
  
  if (Date.now() > parseInt(expiresAt)) {
    // Token expired, attempt refresh
    return null;
  }
  
  return token;
}

// Refresh access token
export async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refresh_token');
  
  if (!refreshToken) {
    throw new Error('No refresh token found');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh access token');
  }

  const data = await response.json();
  
  // Update stored tokens
  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('expires_at', Date.now() + data.expires_in * 1000);
  
  // Update refresh token if provided
  if (data.refresh_token) {
    localStorage.setItem('refresh_token', data.refresh_token);
  }
  
  return data.access_token;
}

// Make authenticated API request
export async function makeSpotifyRequest(endpoint, options = {}) {
  let token = getStoredAccessToken();
  
  if (!token) {
    try {
      token = await refreshAccessToken();
    } catch {
      throw new Error('Authentication required');
    }
  }

  const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 401) {
    // Token expired, try to refresh
    try {
      token = await refreshAccessToken();
      // Retry the request
      return await fetch(`https://api.spotify.com/v1${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
    } catch {
      throw new Error('Authentication required');
    }
  }

  return response;
}

// Get audio features for a track
export async function getAudioFeatures(trackId) {
  try {
    const response = await makeSpotifyRequest(`/audio-features/${trackId}`);
    if (!response.ok) {
      throw new Error('Failed to get audio features');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching audio features:', error);
    return null;
  }
}

// Get audio features for multiple tracks
export async function getMultipleAudioFeatures(trackIds) {
  try {
    const idsString = trackIds.join(',');
    const response = await makeSpotifyRequest(`/audio-features?ids=${idsString}`);
    if (!response.ok) {
      throw new Error('Failed to get audio features');
    }
    const data = await response.json();
    return data.audio_features;
  } catch (error) {
    console.error('Error fetching multiple audio features:', error);
    return [];
  }
}

// Convert audio features to graph coordinates
export function mapAudioFeaturesToGraph(audioFeatures) {
  if (!audioFeatures) return { x: 600, y: 435, happiness: 5, intensity: 5 };
  
  // Map valence (0-1) to happiness (0-10)
  const happiness = Math.round(audioFeatures.valence * 10);
  const x = 100 + (happiness * 100); // 100px per unit on 1000px wide graph
  
  // Map energy (0-1) to intensity (0-10)
  // Higher energy = higher on graph, so we invert Y
  const intensity = Math.round(audioFeatures.energy * 10);
  const y = 100 + ((10 - intensity) * 67); // 67px per unit on 670px high graph
  
  return { x, y, happiness, intensity };
}

// Add track to playlist
export async function addTrackToPlaylist(playlistId, trackUri) {
  try {
    // Extract track ID from URI (e.g., "spotify:track:abc123" -> "abc123")
    const trackId = trackUri.split(':').pop();
    
    // Check if track is already in playlist before adding
    const isAlreadyInPlaylist = await isTrackInPlaylist(playlistId, trackId);
    if (isAlreadyInPlaylist) {
      throw new Error('Track is already in this playlist');
    }
    
    const response = await makeSpotifyRequest(`/playlists/${playlistId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({
        uris: [trackUri]
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to add track to playlist');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error adding track to playlist:', error);
    throw error;
  }
}

// Remove track from playlist
export async function removeTrackFromPlaylist(playlistId, trackUri) {
  try {
    const response = await makeSpotifyRequest(`/playlists/${playlistId}/tracks`, {
      method: 'DELETE',
      body: JSON.stringify({
        tracks: [{ uri: trackUri }]
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to remove track from playlist');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error removing track from playlist:', error);
    throw error;
  }
}

// Create a new playlist
export async function createPlaylist(name, description = '') {
  try {
    // First get current user ID
    const userResponse = await makeSpotifyRequest('/me');
    const userData = await userResponse.json();
    
    const response = await makeSpotifyRequest(`/users/${userData.id}/playlists`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        description,
        public: false
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to create playlist');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating playlist:', error);
    throw error;
  }
}

// Check if track is already in playlist
export async function isTrackInPlaylist(playlistId, trackId) {
  try {
    let offset = 0;
    const limit = 50;
    
    while (true) {
      const response = await makeSpotifyRequest(`/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}&fields=items(track(id))`);
      
      if (!response.ok) {
        throw new Error('Failed to get playlist tracks');
      }
      
      const data = await response.json();
      
      // Check if track is in this batch
      const found = data.items.some(item => item.track && item.track.id === trackId);
      if (found) {
        return true;
      }
      
      // If we've checked all tracks, break
      if (data.items.length < limit) {
        break;
      }
      
      offset += limit;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking if track is in playlist:', error);
    return false; // Assume not in playlist if error occurs
  }
}

// Check which playlists contain a specific track
export async function getPlaylistsContainingTrack(playlistIds, trackId) {
  try {
    const results = await Promise.allSettled(
      playlistIds.map(playlistId => isTrackInPlaylist(playlistId, trackId))
    );
    
    return playlistIds.filter((playlistId, index) => 
      results[index].status === 'fulfilled' && results[index].value === true
    );
  } catch (error) {
    console.error('Error checking playlists for track:', error);
    return [];
  }
}

// Logout function
export function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('expires_at');
  localStorage.removeItem('code_verifier');
}