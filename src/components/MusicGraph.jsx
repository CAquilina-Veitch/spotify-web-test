import React, { useState, useCallback, useEffect, useRef } from 'react';
import { addTrackToPlaylist, getPlaylistsContainingTrack } from '../utils/spotify';

function MusicGraph({ mobileDragData, setMobileDragData }) {
  const svgRef = useRef(null);
  const deleteZoneRef = useRef(null);
  const [objects, setObjects] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [draggedObject, setDraggedObject] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [deleteZoneActive, setDeleteZoneActive] = useState(false);
  const [circleRadius, setCircleRadius] = useState(2); // Default 2 units radius
  const [notification, setNotification] = useState(null);
  const [isAddingToPlaylists, setIsAddingToPlaylists] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const nextIdRef = useRef(1);

  // Load saved objects from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('interactiveObjects');
    if (saved) {
      const parsedObjects = JSON.parse(saved);
      setObjects(parsedObjects);
      // Update nextId to avoid conflicts
      if (parsedObjects.length > 0) {
        const maxId = Math.max(...parsedObjects.map(obj => {
          // Extract numeric part from IDs like "song-1", "playlist-2"
          const match = obj.id.match(/\d+$/);
          return match ? parseInt(match[0]) : 0;
        }));
        nextIdRef.current = maxId + 1;
      }
    }
  }, []);

  // Save objects to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('interactiveObjects', JSON.stringify(objects));
  }, [objects]);


  // Convert SVG coordinates to happiness/intensity values
  const svgToValues = (x, y) => {
    const happiness = Math.round(Math.max(0, Math.min(10, ((x - 100) / 1000) * 10)));
    const intensity = Math.round(Math.max(0, Math.min(10, 10 - ((y - 100) / 620) * 10)));
    return { happiness, intensity };
  };

  // Convert happiness/intensity values to SVG coordinates  
  const valuesToSvg = (happiness, intensity) => {
    const x = 100 + (happiness / 10) * 1000;
    const y = 100 + ((10 - intensity) / 10) * 620;
    return { x, y };
  };

  // Add a new song from drop
  const addSongFromDrop = useCallback(async (songData, x, y) => {
    // Check if song already exists
    const existingSong = objects.find(obj => obj.type === 'song' && obj.trackId === songData.id);
    if (existingSong) {
      // Select existing song instead of adding duplicate
      setSelectedObject(existingSong);
      return;
    }

    const newSong = {
      id: `song-${nextIdRef.current++}`,
      type: 'song',
      trackId: songData.id,
      name: songData.name,
      artist: songData.artist,
      image: songData.image,
      uri: songData.uri,
      x: x,
      y: y,
      connectedPlaylistIds: [],
      ...svgToValues(x, y)
    };

    // Check which existing playlists contain this track
    const existingPlaylists = objects.filter(obj => obj.type === 'playlist' && obj.playlistId);
    if (existingPlaylists.length > 0) {
      try {
        const playlistIds = existingPlaylists.map(p => p.playlistId);
        const containingPlaylistIds = await getPlaylistsContainingTrack(playlistIds, songData.id);
        newSong.connectedPlaylistIds = containingPlaylistIds;
      } catch (error) {
        console.error('Error checking playlist connections for new song:', error);
      }
    }

    setObjects([...objects, newSong]);
    setSelectedObject(newSong);
  }, [objects]);

  // Add a new playlist from drop
  const addPlaylistFromDrop = useCallback((playlistData, x, y) => {
    const newPlaylist = {
      id: `playlist-${nextIdRef.current++}`,
      type: 'playlist',
      playlistId: playlistData.id,
      name: playlistData.name,
      image: playlistData.image,
      trackCount: playlistData.trackCount,
      description: playlistData.description,
      x: x,
      y: y,
      ...svgToValues(x, y)
    };
    setObjects([...objects, newPlaylist]);
    setSelectedObject(newPlaylist);
  }, [objects]);


  // Handle object click
  const handleObjectClick = useCallback((object) => {
    // Only update if selecting a different object to prevent unnecessary re-renders
    if (!selectedObject || selectedObject.id !== object?.id) {
      setSelectedObject(object);
    }
  }, [selectedObject]);

  // Handle mouse down on object
  const handleMouseDown = (e, object) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only allow dragging songs always, playlists only in edit mode
    if (object.type === 'playlist' && !editMode) {
      handleObjectClick(object);
      return;
    }
    
    setDragging(true);
    setDraggedObject(object);
    handleObjectClick(object);
    
    const rect = svgRef.current.getBoundingClientRect();
    dragStartRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // Handle touch start on object (mobile support)
  const handleTouchStart = (e, object) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only allow dragging songs always, playlists only in edit mode
    if (object.type === 'playlist' && !editMode) {
      handleObjectClick(object);
      return;
    }
    
    setDragging(true);
    setDraggedObject(object);
    handleObjectClick(object);
    
    const rect = svgRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    dragStartRef.current = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  };

  // Check if mouse is over the delete zone in right panel
  const isInDeleteZone = (clientX, clientY) => {
    if (!deleteZoneRef.current) return false;
    const rect = deleteZoneRef.current.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right && 
           clientY >= rect.top && clientY <= rect.bottom;
  };

  // Handle mouse/touch move during drag
  const handleMove = useCallback((clientX, clientY) => {
    if (!dragging || !draggedObject || !svgRef.current) return;
    
    // Check if over delete zone
    const inDeleteZone = isInDeleteZone(clientX, clientY);
    setDeleteZoneActive(inDeleteZone);
    
    // Only update position if not over delete zone
    if (!inDeleteZone) {
      const rect = svgRef.current.getBoundingClientRect();
      const scaleX = 1200 / rect.width;
      const scaleY = 800 / rect.height;
      
      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;
      
      // Constrain to graph area
      const constrainedX = Math.max(140, Math.min(1060, x));
      const constrainedY = Math.max(140, Math.min(680, y));
      
      // Update object position
      setObjects(prevObjects => 
        prevObjects.map(obj => 
          obj.id === draggedObject.id 
            ? { ...obj, x: constrainedX, y: constrainedY, ...svgToValues(constrainedX, constrainedY) }
            : obj
        )
      );
    }
  }, [dragging, draggedObject]);

  // Handle mouse move during drag
  const handleMouseMove = useCallback((e) => {
    handleMove(e.clientX, e.clientY);
  }, [handleMove]);

  // Handle touch move during drag (mobile support)
  const handleTouchMove = useCallback((e) => {
    if (e.touches && e.touches[0]) {
      e.preventDefault(); // Prevent scrolling
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [handleMove]);

  // Handle mouse up - end drag
  const handleMouseUp = useCallback(() => {
    if (dragging && draggedObject && deleteZoneActive) {
      // Delete the object if dropped in delete zone
      setObjects(prevObjects => 
        prevObjects.filter(obj => obj.id !== draggedObject.id)
      );
      setSelectedObject(null);
    }
    
    setDragging(false);
    setDraggedObject(null);
    setDeleteZoneActive(false);
  }, [dragging, draggedObject, deleteZoneActive]);

  // Handle touch end - end drag (mobile support)
  const handleTouchEnd = useCallback(() => {
    if (dragging && draggedObject && deleteZoneActive) {
      // Delete the object if dropped in delete zone
      setObjects(prevObjects => 
        prevObjects.filter(obj => obj.id !== draggedObject.id)
      );
      setSelectedObject(null);
    }
    
    setDragging(false);
    setDraggedObject(null);
    setDeleteZoneActive(false);
  }, [dragging, draggedObject, deleteZoneActive]);

  // Handle drag and drop events
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    // Only set dragOver to false if we're actually leaving the SVG area
    if (!svgRef.current?.contains(e.relatedTarget)) {
      setDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    try {
      const droppedData = JSON.parse(e.dataTransfer.getData('application/json'));
      
      // Get drop position relative to SVG
      const rect = svgRef.current.getBoundingClientRect();
      const scaleX = 1200 / rect.width;
      const scaleY = 800 / rect.height;
      
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      
      // Constrain to graph area
      const constrainedX = Math.max(140, Math.min(1060, x));
      const constrainedY = Math.max(140, Math.min(680, y));
      
      // Determine if it's a song or playlist based on the data structure
      if (droppedData.artist !== undefined) {
        // It's a song (has artist property)
        addSongFromDrop(droppedData, constrainedX, constrainedY);
      } else if (droppedData.trackCount !== undefined) {
        // It's a playlist (has trackCount property)
        addPlaylistFromDrop(droppedData, constrainedX, constrainedY);
      }
    } catch (error) {
      console.error('Failed to parse dropped data:', error);
    }
  };

  // Add global mouse and touch event listeners when dragging
  useEffect(() => {
    if (dragging) {
      // Mouse events
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      // Touch events (mobile support)
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Handle mobile touch events for external drops
  useEffect(() => {
    const handleTouchEnd = (e) => {
      if (!mobileDragData || !svgRef.current) return;
      
      // Get the touch position
      const touch = e.changedTouches[0];
      
      // Check if the touch ended over the SVG element
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      if (!svgRef.current.contains(element)) {
        return;
      }
      
      // Get drop position relative to SVG
      const rect = svgRef.current.getBoundingClientRect();
      const scaleX = 1200 / rect.width;
      const scaleY = 800 / rect.height;
      
      const x = (touch.clientX - rect.left) * scaleX;
      const y = (touch.clientY - rect.top) * scaleY;
      
      // Constrain to graph area
      const constrainedX = Math.max(140, Math.min(1060, x));
      const constrainedY = Math.max(140, Math.min(680, y));
      
      // Determine if it's a song or playlist based on the data structure
      if (mobileDragData.artist !== undefined) {
        // It's a song (has artist property)
        addSongFromDrop(mobileDragData, constrainedX, constrainedY);
      } else if (mobileDragData.trackCount !== undefined) {
        // It's a playlist (has trackCount property)
        addPlaylistFromDrop(mobileDragData, constrainedX, constrainedY);
      }
      
      // Clear the mobile drag data
      setMobileDragData(null);
    };
    
    document.addEventListener('touchend', handleTouchEnd);
    return () => document.removeEventListener('touchend', handleTouchEnd);
  }, [mobileDragData, setMobileDragData, addSongFromDrop, addPlaylistFromDrop]);

  // Handle wheel events for radius adjustment
  const handleWheel = useCallback((e) => {
    if (!selectedObject || selectedObject.type !== 'song') return;
    
    // Check if mouse is over the selected song
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = 1200 / rect.width;
    const scaleY = 800 / rect.height;
    
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    
    const distance = Math.sqrt(
      Math.pow(mouseX - selectedObject.x, 2) + 
      Math.pow(mouseY - selectedObject.y, 2)
    );
    
    // Only adjust radius if mouse is over the selected song (within 50px)
    if (distance <= 50) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.2 : 0.2; // Scroll down = smaller, up = bigger
      setCircleRadius(prev => Math.max(0.5, Math.min(8, prev + delta))); // Limit 0.5-8 units
    }
  }, [selectedObject]);

  // Add wheel event listener for radius adjustment
  useEffect(() => {
    const svgElement = svgRef.current;
    if (svgElement && selectedObject && selectedObject.type === 'song') {
      svgElement.addEventListener('wheel', handleWheel, { passive: false });
      return () => svgElement.removeEventListener('wheel', handleWheel);
    }
  }, [selectedObject, handleWheel]);


  // Handle background click to deselect
  const handleBackgroundClick = useCallback((e) => {
    // Only deselect if clicking on the background (not during drag)
    if (!dragging && e.target.tagName === 'rect') {
      setSelectedObject(null);
    }
  }, [dragging]);

  // Show notification and auto-hide after 5 seconds
  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  // Add track to playlists
  const handleAddToPlaylists = async (selectedObject, playlistsInRange) => {
    if (!selectedObject || !selectedObject.uri || playlistsInRange.length === 0) return;
    
    // Filter out playlists that already contain the track
    const playlistsToAddTo = playlistsInRange.filter(playlist => 
      !selectedObject.connectedPlaylistIds || !selectedObject.connectedPlaylistIds.includes(playlist.playlistId)
    );
    
    const alreadyInCount = playlistsInRange.length - playlistsToAddTo.length;
    
    if (playlistsToAddTo.length === 0) {
      showNotification(`📋 "${selectedObject.name}" is already in all ${alreadyInCount} playlist${alreadyInCount !== 1 ? 's' : ''}!`, 'info');
      return;
    }
    
    setIsAddingToPlaylists(true);
    
    try {
      const results = await Promise.allSettled(
        playlistsToAddTo.map(async (playlist) => {
          if (!playlist.playlistId) {
            throw new Error(`Invalid playlist: ${playlist.name}`);
          }
          return addTrackToPlaylist(playlist.playlistId, selectedObject.uri);
        })
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      // Update the song's connectedPlaylistIds with successfully added playlists
      if (successful > 0) {
        const successfulPlaylists = playlistsToAddTo.slice(0, successful); // Assume first N were successful
        const newConnectedPlaylistIds = [
          ...(selectedObject.connectedPlaylistIds || []),
          ...successfulPlaylists.map(p => p.playlistId)
        ];
        
        setObjects(prevObjects => 
          prevObjects.map(obj => 
            obj.id === selectedObject.id 
              ? { ...obj, connectedPlaylistIds: newConnectedPlaylistIds }
              : obj
          )
        );
      }

      let message = '';
      if (successful > 0 && failed === 0) {
        message = `✅ Added "${selectedObject.name}" to ${successful} playlist${successful !== 1 ? 's' : ''}!`;
        if (alreadyInCount > 0) {
          message += ` (Already in ${alreadyInCount} other${alreadyInCount !== 1 ? 's' : ''})`;
        }
        showNotification(message, 'success');
      } else if (successful > 0 && failed > 0) {
        message = `⚠️ Added to ${successful} playlist${successful !== 1 ? 's' : ''}, but ${failed} failed.`;
        if (alreadyInCount > 0) {
          message += ` (Already in ${alreadyInCount} other${alreadyInCount !== 1 ? 's' : ''})`;
        }
        showNotification(message, 'warning');
      } else {
        showNotification(`❌ Failed to add "${selectedObject.name}" to any playlists.`, 'error');
      }
    } catch (error) {
      console.error('Error adding to playlists:', error);
      showNotification(`❌ Error: ${error.message}`, 'error');
    } finally {
      setIsAddingToPlaylists(false);
    }
  };

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
          y2={720}
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
          y1={100 + i * 62}
          x2={1100}
          y2={100 + i * 62}
          stroke="#404040"
          strokeWidth="1"
          opacity="0.5"
        />
      );
    }
    return lines;
  };

  return (
    <div className="music-graph">
      <div className="graph-header">
        <h2>🎵 Interactive Positioning Tool</h2>
        <div className="graph-controls">
          <button 
            onClick={() => setEditMode(!editMode)}
            className={editMode ? 'edit-active' : ''}
          >
            {editMode ? 'Exit Edit Mode' : 'Edit Playlists'}
          </button>
          <div className="drop-hint">
            💡 Drag songs and playlists here to add them to the graph
          </div>
        </div>
      </div>

      <div className="graph-layout">
        <div className="graph-container">
          <svg 
            ref={svgRef}
            className={`music-scatter-plot ${dragOver ? 'drag-over' : ''}`}
            width="1200" 
            height="800" 
            viewBox="0 0 1200 800"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleBackgroundClick}
          >
            {/* Background */}
            <rect width="1200" height="800" fill="#1a1a1a" />
            
            {/* Graph area background */}
            <rect x="100" y="100" width="1000" height="620" fill="#2a2a2a" stroke="#404040" strokeWidth="2" />
            
            
            {/* Grid lines */}
            {createGridLines()}
            
            {/* Axis labels */}
            <text x="600" y="710" textAnchor="middle" fill="#b3b3b3" fontSize="16" fontWeight="bold">
              Happiness →
            </text>
            <text x="50" y="410" textAnchor="middle" fill="#b3b3b3" fontSize="16" fontWeight="bold" transform="rotate(-90 50 410)">
              Intensity →
            </text>
            
            {/* Axis numbers */}
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
              <g key={`axis-${i}`}>
                <text x={100 + i * 100} y="95" textAnchor="middle" fill="#b3b3b3" fontSize="12">
                  {i}
                </text>
                <text x="85" y={720 - i * 62 + 5} textAnchor="middle" fill="#b3b3b3" fontSize="12">
                  {i}
                </text>
              </g>
            ))}
            
            {/* Selection circle for songs - use live object position */}
            {(() => {
              // Get current selected object with live position from objects array
              const currentSelectedObject = selectedObject ? objects.find(obj => obj.id === selectedObject.id) : null;
              
              return currentSelectedObject && currentSelectedObject.type === 'song' && (
                <circle
                  cx={currentSelectedObject.x}
                  cy={currentSelectedObject.y}
                  r={circleRadius * 100} // Convert units to pixels (1 unit = 100px)
                  fill="none"
                  stroke="#1db954"
                  strokeWidth="2"
                  strokeDasharray="10,5"
                  opacity="0.6"
                  style={{ pointerEvents: 'none' }}
                />
              );
            })()}

            {/* Connection lines to affected playlists - calculated in real-time */}
            {(() => {
              // Get current selected object with live position from objects array
              const currentSelectedObject = selectedObject ? objects.find(obj => obj.id === selectedObject.id) : null;
              
              if (!currentSelectedObject || currentSelectedObject.type !== 'song' || !objects || objects.length === 0) return null;
              
              // Calculate affected playlists in real-time using live position
              const radiusInPixels = circleRadius * 100;
              const playlists = objects.filter(obj => obj && obj.type === 'playlist');
              
              const playlistsInRange = playlists.filter(playlist => {
                if (!playlist || typeof playlist.x !== 'number' || typeof playlist.y !== 'number') return false;
                if (typeof currentSelectedObject.x !== 'number' || typeof currentSelectedObject.y !== 'number') return false;
                
                const distance = Math.sqrt(
                  Math.pow(playlist.x - currentSelectedObject.x, 2) + 
                  Math.pow(playlist.y - currentSelectedObject.y, 2)
                );
                return distance <= radiusInPixels;
              });
              
              return playlistsInRange.map(playlist => (
                <line
                  key={`connection-${playlist.id}`}
                  x1={currentSelectedObject.x}
                  y1={currentSelectedObject.y}
                  x2={playlist.x}
                  y2={playlist.y}
                  stroke="#1db954"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  opacity="0.7"
                  style={{ pointerEvents: 'none' }}
                />
              ));
            })()}

            {/* Red lines to ALL playlists that already contain the selected track - independent of circle range */}
            {(() => {
              const currentSelectedObject = selectedObject ? objects.find(obj => obj.id === selectedObject.id) : null;
              
              // Only show for selected songs, regardless of circle or range
              if (!currentSelectedObject || currentSelectedObject.type !== 'song' || !objects || objects.length === 0) return null;
              
              const allPlaylists = objects.filter(obj => obj && obj.type === 'playlist');
              
              // Red lines are now rendered globally above
              return null;
            })()}

            {/* Render semi-transparent connection lines for all songs */}
            {objects
              .filter(obj => obj.type === 'song' && obj.connectedPlaylistIds && obj.connectedPlaylistIds.length > 0)
              .map(song => {
                const connectedPlaylists = objects.filter(obj => 
                  obj.type === 'playlist' && 
                  obj.playlistId && 
                  song.connectedPlaylistIds.includes(obj.playlistId)
                );
                
                return connectedPlaylists.map(playlist => (
                  <line
                    key={`connection-${song.id}-${playlist.id}`}
                    x1={song.x}
                    y1={song.y}
                    x2={playlist.x}
                    y2={playlist.y}
                    stroke="#ff3333"
                    strokeWidth={selectedObject && selectedObject.id === song.id ? "3" : "1"}
                    strokeDasharray="4,2"
                    opacity={selectedObject && selectedObject.id === song.id ? "1.0" : "0.3"}
                    style={{ pointerEvents: 'none' }}
                  />
                ));
              })
              .flat()
            }

            {/* Render all objects */}
            {objects.map(obj => {
              if (obj.type === 'song') {
                // Truncate song name if too long
                const displayName = obj.name.length > 15 ? obj.name.substring(0, 15) + '...' : obj.name;
                
                return (
                  <g key={obj.id}>
                    {/* Song with album artwork */}
                    <defs>
                      <clipPath id={`song-clip-${obj.id}`}>
                        <circle cx={obj.x} cy={obj.y} r="30" />
                      </clipPath>
                    </defs>
                    {obj.image ? (
                      <image
                        x={obj.x - 30}
                        y={obj.y - 30}
                        width="60"
                        height="60"
                        href={obj.image}
                        clipPath={`url(#song-clip-${obj.id})`}
                        style={{ cursor: 'grab' }}
                        onMouseDown={(e) => handleMouseDown(e, obj)}
                        onTouchStart={(e) => handleTouchStart(e, obj)}
                      />
                    ) : (
                      <circle
                        cx={obj.x}
                        cy={obj.y}
                        r="30"
                        fill="#1db954"
                        style={{ cursor: 'grab' }}
                        onMouseDown={(e) => handleMouseDown(e, obj)}
                        onTouchStart={(e) => handleTouchStart(e, obj)}
                      />
                    )}
                    {/* Selection border */}
                    <circle
                      cx={obj.x}
                      cy={obj.y}
                      r="30"
                      fill="none"
                      stroke={selectedObject?.id === obj.id ? "#fff" : "none"}
                      strokeWidth="3"
                      style={{ pointerEvents: 'none' }}
                    />
                    {/* Song name label */}
                    <text
                      x={obj.x}
                      y={obj.y + 45}
                      textAnchor="middle"
                      fill="#b3b3b3"
                      fontSize="11"
                      fontFamily="Arial, sans-serif"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {displayName}
                    </text>
                  </g>
                );
              } else if (obj.type === 'playlist') {
                // Truncate playlist name if too long
                const displayName = obj.name.length > 15 ? obj.name.substring(0, 15) + '...' : obj.name;
                
                return (
                  <g key={obj.id}>
                    {/* Playlist with cover art or solid color */}
                    <defs>
                      <clipPath id={`playlist-clip-${obj.id}`}>
                        <rect x={obj.x - 30} y={obj.y - 30} width="60" height="60" rx="10" />
                      </clipPath>
                    </defs>
                    {obj.image ? (
                      <image
                        x={obj.x - 30}
                        y={obj.y - 30}
                        width="60"
                        height="60"
                        href={obj.image}
                        clipPath={`url(#playlist-clip-${obj.id})`}
                        opacity={editMode ? 1 : 0.6}
                        style={{ cursor: editMode ? 'grab' : 'pointer' }}
                        onMouseDown={(e) => handleMouseDown(e, obj)}
                        onTouchStart={(e) => handleTouchStart(e, obj)}
                      />
                    ) : (
                      <rect
                        x={obj.x - 30}
                        y={obj.y - 30}
                        width="60"
                        height="60"
                        rx="10"
                        fill="#e74c3c"
                        opacity={editMode ? 1 : 0.6}
                        style={{ cursor: editMode ? 'grab' : 'pointer' }}
                        onMouseDown={(e) => handleMouseDown(e, obj)}
                        onTouchStart={(e) => handleTouchStart(e, obj)}
                      />
                    )}
                    {/* Selection border */}
                    <rect
                      x={obj.x - 30}
                      y={obj.y - 30}
                      width="60"
                      height="60"
                      rx="10"
                      fill="none"
                      stroke={selectedObject?.id === obj.id ? "#fff" : "none"}
                      strokeWidth="3"
                      style={{ pointerEvents: 'none' }}
                    />
                    {/* Playlist name label */}
                    <text
                      x={obj.x}
                      y={obj.y + 45}
                      textAnchor="middle"
                      fill="#b3b3b3"
                      fontSize="11"
                      fontFamily="Arial, sans-serif"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {displayName}
                    </text>
                  </g>
                );
              }
              return null;
            })}
          </svg>
        </div>

        {/* Right Panel */}
        <div className="right-panel">
          <h3>{selectedObject ? selectedObject.name : 'Select an Object'}</h3>
          {selectedObject ? (
            <div className="object-details">
              {selectedObject.type === 'song' ? (
                <>
                  <p><strong>Type:</strong> Song</p>
                  <p><strong>Track:</strong> {selectedObject.name}</p>
                  <p><strong>Artist:</strong> {selectedObject.artist}</p>
                  <p><strong>Happiness:</strong> {selectedObject.happiness}</p>
                  <p><strong>Intensity:</strong> {selectedObject.intensity}</p>
                  {selectedObject.connectedPlaylistIds && selectedObject.connectedPlaylistIds.length > 0 && (
                    <p><strong>🔴 Connected to {selectedObject.connectedPlaylistIds.length} playlist{selectedObject.connectedPlaylistIds.length !== 1 ? 's' : ''}</strong></p>
                  )}
                </>
              ) : (
                <>
                  <p><strong>Type:</strong> Playlist</p>
                  <p><strong>Name:</strong> {selectedObject.name}</p>
                  <p><strong>Tracks:</strong> {selectedObject.trackCount}</p>
                  <p><strong>Happiness:</strong> {selectedObject.happiness}</p>
                  <p><strong>Intensity:</strong> {selectedObject.intensity}</p>
                </>
              )}
              
              {/* Add to Playlists button - calculate affected playlists in real-time */}
              {(() => {
                if (!selectedObject || selectedObject.type !== 'song' || !objects || objects.length === 0) return null;
                
                // Get current selected object with live position
                const currentSelectedObject = objects.find(obj => obj && obj.id === selectedObject.id);
                if (!currentSelectedObject) return null;
                
                // Calculate affected playlists in real-time
                const radiusInPixels = circleRadius * 100;
                const playlists = objects.filter(obj => obj && obj.type === 'playlist');
                
                const playlistsInRange = playlists.filter(playlist => {
                  if (!playlist || typeof playlist.x !== 'number' || typeof playlist.y !== 'number') return false;
                  if (typeof currentSelectedObject.x !== 'number' || typeof currentSelectedObject.y !== 'number') return false;
                  
                  const distance = Math.sqrt(
                    Math.pow(playlist.x - currentSelectedObject.x, 2) + 
                    Math.pow(playlist.y - currentSelectedObject.y, 2)
                  );
                  return distance <= radiusInPixels;
                });
                
                // Filter out playlists that already contain the track
                const playlistsToAddTo = playlistsInRange.filter(playlist => 
                  !currentSelectedObject.connectedPlaylistIds || !currentSelectedObject.connectedPlaylistIds.includes(playlist.playlistId)
                );
                
                if (playlistsToAddTo.length === 0) return null;
                
                return (
                  <button 
                    className="add-to-playlists-btn"
                    onClick={() => handleAddToPlaylists(selectedObject, playlistsInRange)}
                    disabled={isAddingToPlaylists}
                  >
                    {isAddingToPlaylists ? (
                      <>
                        <span className="spinner"></span>
                        Adding...
                      </>
                    ) : (
                      `Add to ${playlistsToAddTo.length} Playlist${playlistsToAddTo.length !== 1 ? 's' : ''}`
                    )}
                  </button>
                );
              })()}
            </div>
          ) : (
            <p className="no-selection">No object selected</p>
          )}
          
          {/* Delete Zone - only show when object is selected */}
          {selectedObject && (
            <div 
              ref={deleteZoneRef}
              className={`delete-zone ${deleteZoneActive ? 'active' : ''}`}
            >
              🗑️ Drag here to delete
            </div>
          )}
        </div>
      </div>
      
      {/* Notification Toast */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
    </div>
  );
}

export default MusicGraph;