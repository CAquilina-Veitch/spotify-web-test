import React, { useState, useCallback, useEffect, useRef } from 'react';
import { makeSpotifyRequest, getAudioFeatures, mapAudioFeaturesToGraph, createPlaylist, addTrackToPlaylist } from '../utils/spotify';

// Playlist zone definitions
const PLAYLIST_ZONES = {
  'sad-calm': { 
    name: 'Chill & Melancholy', 
    color: '#4A90E2',
    x: 100, y: 100, width: 200, height: 200,
    playlistName: 'Sad & Calm Vibes'
  },
  'happy-calm': { 
    name: 'Peaceful & Happy', 
    color: '#7ED321',
    x: 900, y: 100, width: 200, height: 200,
    playlistName: 'Happy & Calm Vibes'
  },
  'sad-intense': { 
    name: 'Emotional & Intense', 
    color: '#BD10E0',
    x: 100, y: 570, width: 200, height: 200,
    playlistName: 'Sad & Intense Vibes'
  },
  'happy-intense': { 
    name: 'Energetic & Upbeat', 
    color: '#F5A623',
    x: 900, y: 570, width: 200, height: 200,
    playlistName: 'Happy & Intense Vibes'
  }
};

function MusicGraph() {
  const svgRef = useRef(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const [songPosition, setSongPosition] = useState({ x: 600, y: 400 }); // Center of graph
  const [hoveredZone, setHoveredZone] = useState(null);
  const [message, setMessage] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [savedPositions, setSavedPositions] = useState({});
  const pollIntervalRef = useRef(null);


  // Load saved positions from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('spotifyTrackPositions');
    if (saved) {
      setSavedPositions(JSON.parse(saved));
    }
  }, []);

  // Save position to localStorage
  const saveTrackPosition = (trackId, happiness, intensity) => {
    const newPositions = {
      ...savedPositions,
      [trackId]: {
        happiness,
        intensity,
        lastUpdated: new Date().toISOString()
      }
    };
    setSavedPositions(newPositions);
    localStorage.setItem('spotifyTrackPositions', JSON.stringify(newPositions));
  };


  // Convert SVG coordinates to happiness/intensity values
  const svgToValues = (x, y) => {
    // Graph area is 1000x670 starting at (100, 100)
    const happiness = Math.round(Math.max(0, Math.min(10, ((x - 100) / 1000) * 10)));
    const intensity = Math.round(Math.max(0, Math.min(10, 10 - ((y - 100) / 670) * 10)));
    return { happiness, intensity };
  };

  // Convert happiness/intensity values to SVG coordinates  
  const valuesToSvg = (happiness, intensity) => {
    const x = 100 + (happiness / 10) * 1000;
    const y = 100 + ((10 - intensity) / 10) * 670;
    return { x, y };
  };

  // Fetch current track and its audio features
  const fetchCurrentTrack = useCallback(async () => {
    setLoading(true);
    try {
      // Get current track
      const trackResponse = await makeSpotifyRequest('/me/player/currently-playing');
      if (trackResponse.status === 204) {
        setCurrentTrack(null);
        setLoading(false);
        return;
      }

      const trackData = await trackResponse.json();
      if (!trackData.item) {
        setCurrentTrack(null);
        setLoading(false);
        return;
      }

      // Get audio features
      const audioFeatures = await getAudioFeatures(trackData.item.id);

      const position = mapAudioFeaturesToGraph(audioFeatures);
      
      const track = {
        id: trackData.item.id,
        name: trackData.item.name,
        artist: trackData.item.artists.map(a => a.name).join(', '),
        image: trackData.item.album.images[0]?.url,
        uri: trackData.item.uri,
        audioFeatures,
        ...position
      };

      setCurrentTrack(track);
      
      // Check if we have a saved position for this track
      const savedPosition = savedPositions[track.id];
      if (savedPosition) {
        const { x, y } = valuesToSvg(savedPosition.happiness, savedPosition.intensity);
        setSongPosition({ x, y });
      } else {
        // Position song based on its audio features
        setSongPosition({ x: track.x, y: track.y });
      }
      
    } catch (error) {
      console.error('Error fetching current track:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize graph with current track and start polling
  useEffect(() => {
    fetchCurrentTrack();
    
    // Poll for track changes every 5 seconds
    pollIntervalRef.current = setInterval(() => {
      fetchCurrentTrack();
    }, 5000);
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [fetchCurrentTrack]);

  // Check if point is inside a playlist zone
  const checkPlaylistZone = (x, y) => {
    for (const [zoneId, zone] of Object.entries(PLAYLIST_ZONES)) {
      if (x >= zone.x && x <= zone.x + zone.width && 
          y >= zone.y && y <= zone.y + zone.height) {
        return zoneId;
      }
    }
    return null;
  };

  // Handle mouse down on song
  const handleMouseDown = (e) => {
    if (!currentTrack) return;
    e.preventDefault();
    
    setDragging(true);
    const rect = svgRef.current.getBoundingClientRect();
    dragStartRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // Handle mouse move during drag
  const handleMouseMove = useCallback((e) => {
    if (!dragging || !currentTrack || !svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = 1200 / rect.width;
    const scaleY = 800 / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // Constrain to graph area (account for circle radius of 40)
    const constrainedX = Math.max(140, Math.min(1060, x));
    const constrainedY = Math.max(140, Math.min(730, y));
    
    setSongPosition({ x: constrainedX, y: constrainedY });
    
    // Check if over playlist zone
    const zone = checkPlaylistZone(constrainedX, constrainedY);
    setHoveredZone(zone);
  }, [dragging, currentTrack]);

  // Handle mouse up - end drag
  const handleMouseUp = useCallback(async () => {
    if (!dragging || !currentTrack) return;
    
    setDragging(false);
    
    // Save the final position
    const { happiness, intensity } = svgToValues(songPosition.x, songPosition.y);
    saveTrackPosition(currentTrack.id, happiness, intensity);
    
    // If dropped in a playlist zone, add to playlist
    if (hoveredZone) {
      try {
        const zone = PLAYLIST_ZONES[hoveredZone];
        setMessage(`Adding "${currentTrack.name}" to ${zone.playlistName}...`);
        
        // Create playlist if it doesn't exist, then add track
        const playlist = await createPlaylist(zone.playlistName, `Auto-generated playlist for ${zone.name} songs`);
        await addTrackToPlaylist(playlist.id, currentTrack.uri);
        
        setMessage(`✓ Added "${currentTrack.name}" to ${zone.playlistName}!`);
        setTimeout(() => setMessage(''), 3000);
        
      } catch (error) {
        console.error('Error adding to playlist:', error);
        setMessage(`❌ Failed to add to playlist: ${error.message}`);
        setTimeout(() => setMessage(''), 3000);
      }
    }
    
    setHoveredZone(null);
  }, [dragging, currentTrack, hoveredZone, songPosition, saveTrackPosition]);

  // Add global mouse event listeners when dragging
  useEffect(() => {
    if (dragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  // Create grid lines for the graph
  const createGridLines = () => {
    const lines = [];
    // Vertical lines (happiness)
    for (let i = 0; i <= 10; i++) {
      lines.push(
        <line
          key={`v-${i}`}
          x1={100 + i * 100}
          y1={100}
          x2={100 + i * 100}
          y2={770}
          stroke="#404040"
          strokeWidth="1"
          opacity="0.5"
        />
      );
    }
    // Horizontal lines (intensity)
    for (let i = 0; i <= 10; i++) {
      lines.push(
        <line
          key={`h-${i}`}
          x1={100}
          y1={100 + i * 67}
          x2={1100}
          y2={100 + i * 67}
          stroke="#404040"
          strokeWidth="1"
          opacity="0.5"
        />
      );
    }
    return lines;
  };

  // Get current happiness and intensity values
  const currentValues = svgToValues(songPosition.x, songPosition.y);

  return (
    <div className="music-graph">
      <div className="graph-header">
        <h2>🎵 Music Graph</h2>
        <p>Drag songs to categorize by happiness and intensity</p>
        <div className="graph-controls">
          <button onClick={fetchCurrentTrack} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh Current Track'}
          </button>
          {currentTrack && (
            <div className="current-values">
              Happiness: {currentValues.happiness} | Intensity: {currentValues.intensity}
              {savedPositions[currentTrack.id] && ' (saved)'}
            </div>
          )}
        </div>
        {message && (
          <div className="message">{message}</div>
        )}
      </div>

      <div className="graph-container">
        <svg 
          ref={svgRef}
          className="music-scatter-plot"
          width="1200" 
          height="800" 
          viewBox="0 0 1200 800"
        >
          {/* Background */}
          <rect width="1200" height="800" fill="#1a1a1a" />
          
          {/* Graph area background */}
          <rect x="100" y="100" width="1000" height="670" fill="#2a2a2a" stroke="#404040" strokeWidth="2" />
          
          {/* Grid lines */}
          {createGridLines()}
          
          {/* Playlist zones */}
          {Object.entries(PLAYLIST_ZONES).map(([zoneId, zone]) => (
            <g key={zoneId}>
              <rect
                x={zone.x}
                y={zone.y}
                width={zone.width}
                height={zone.height}
                fill={zone.color}
                opacity={hoveredZone === zoneId ? 0.3 : 0.1}
                stroke={zone.color}
                strokeWidth="2"
                strokeDasharray="5,5"
              />
              <text
                x={zone.x + zone.width / 2}
                y={zone.y + zone.height / 2}
                textAnchor="middle"
                fill={zone.color}
                fontSize="14"
                fontWeight="bold"
              >
                {zone.name}
              </text>
            </g>
          ))}
          
          {/* Axis labels */}
          <text x="600" y="790" textAnchor="middle" fill="#b3b3b3" fontSize="16" fontWeight="bold">
            Happiness →
          </text>
          <text x="50" y="435" textAnchor="middle" fill="#b3b3b3" fontSize="16" fontWeight="bold" transform="rotate(-90 50 435)">
            Intensity →
          </text>
          
          {/* Axis numbers */}
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
            <g key={`axis-${i}`}>
              <text x={100 + i * 100} y="95" textAnchor="middle" fill="#b3b3b3" fontSize="12">
                {i}
              </text>
              <text x="85" y={770 - i * 67 + 5} textAnchor="middle" fill="#b3b3b3" fontSize="12">
                {i}
              </text>
            </g>
          ))}
          
          {/* Current track */}
          {currentTrack && (
            <g>
              {/* Track with album artwork */}
              <g
                style={{ cursor: dragging ? 'grabbing' : 'grab' }}
                onMouseDown={handleMouseDown}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                {/* Outer glow/border */}
                <circle
                  cx={songPosition.x}
                  cy={songPosition.y}
                  r={isHovered ? 42 : 40}
                  fill="none"
                  stroke={dragging ? "#1ed760" : "#1db954"}
                  strokeWidth="3"
                  opacity={0.8}
                />
                
                {/* Album artwork circle */}
                {currentTrack.image ? (
                  <>
                    <defs>
                      <clipPath id="albumClip">
                        <circle cx={songPosition.x} cy={songPosition.y} r="37" />
                      </clipPath>
                    </defs>
                    <image
                      x={songPosition.x - 37}
                      y={songPosition.y - 37}
                      width="74"
                      height="74"
                      href={currentTrack.image}
                      clipPath="url(#albumClip)"
                      style={{ pointerEvents: 'none' }}
                    />
                  </>
                ) : (
                  <circle
                    cx={songPosition.x}
                    cy={songPosition.y}
                    r="37"
                    fill="#1db954"
                  />
                )}
              </g>
              
              {/* Track info on hover */}
              <title>{`${currentTrack.name} by ${currentTrack.artist}`}</title>
            </g>
          )}
          
        </svg>
      </div>
    </div>
  );
}

export default MusicGraph;