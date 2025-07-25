// Encode and decode queue data for URL sharing

// Extract track ID from Spotify URI
export function extractTrackId(uri) {
  // Handle both formats: "spotify:track:id" and just "id"
  if (uri.startsWith('spotify:track:')) {
    return uri.split(':')[2];
  }
  return uri;
}

// Reconstruct full Spotify URI from track ID
export function buildTrackUri(trackId) {
  if (trackId.startsWith('spotify:track:')) {
    return trackId;
  }
  return `spotify:track:${trackId}`;
}

// Encode queue data to base64 URL-safe string
export function encodeQueue(tracks) {
  // Extract just the track IDs
  const trackIds = tracks.map(track => {
    if (typeof track === 'string') {
      return extractTrackId(track);
    }
    return extractTrackId(track.uri || track.id);
  });
  
  // Join with commas
  const idsString = trackIds.join(',');
  
  // Convert to base64 (URL-safe)
  const base64 = btoa(idsString)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  return base64;
}

// Decode base64 URL-safe string back to track URIs
export function decodeQueue(encodedData) {
  try {
    // Convert from URL-safe base64
    const base64 = encodedData
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    // Pad if necessary
    const padded = base64 + '==='.slice(0, (4 - base64.length % 4) % 4);
    
    // Decode from base64
    const idsString = atob(padded);
    
    // Split and convert back to URIs
    const trackIds = idsString.split(',').filter(id => id.length > 0);
    const trackUris = trackIds.map(id => buildTrackUri(id));
    
    return trackUris;
  } catch (error) {
    console.error('Error decoding queue data:', error);
    throw new Error('Invalid queue data');
  }
}

// Generate shareable URL
export function generateShareUrl(tracks) {
  const encoded = encodeQueue(tracks);
  const baseUrl = window.location.origin + window.location.pathname.replace(/\/$/, '');
  return `${baseUrl}#share?q=${encoded}`;
}

// Parse share URL
export function parseShareUrl(url) {
  try {
    const urlObj = new URL(url);
    const hash = urlObj.hash;
    
    if (hash.includes('share?q=')) {
      const encodedData = hash.split('share?q=')[1];
      return decodeQueue(encodedData);
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing share URL:', error);
    return null;
  }
}

// Check if current URL is a share link
export function isShareUrl() {
  return window.location.hash.includes('share?q=');
}

// Get queue data from current URL
export function getQueueFromUrl() {
  if (!isShareUrl()) {
    return null;
  }
  
  const encodedData = window.location.hash.split('share?q=')[1];
  if (!encodedData) {
    return null;
  }
  
  return decodeQueue(encodedData);
}

// Calculate approximate URL length
export function calculateUrlLength(tracks) {
  const encoded = encodeQueue(tracks);
  const url = generateShareUrl(tracks);
  return {
    encodedLength: encoded.length,
    totalUrlLength: url.length,
    isWithinLimit: url.length < 2000, // Conservative limit for broad compatibility
    trackCount: tracks.length
  };
}