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
    } catch (error) {
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
    } catch (error) {
      throw new Error('Authentication required');
    }
  }

  return response;
}

// Logout function
export function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('expires_at');
  localStorage.removeItem('code_verifier');
}