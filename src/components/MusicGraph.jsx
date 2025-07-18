import React, { useState, useCallback, useEffect, useRef } from 'react';

function MusicGraph() {
  const svgRef = useRef(null);
  const [objects, setObjects] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [draggedObject, setDraggedObject] = useState(null);
  const [editMode, setEditMode] = useState(false);
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
        const maxId = Math.max(...parsedObjects.map(obj => parseInt(obj.id)));
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
    const intensity = Math.round(Math.max(0, Math.min(10, 10 - ((y - 100) / 670) * 10)));
    return { happiness, intensity };
  };

  // Convert happiness/intensity values to SVG coordinates  
  const valuesToSvg = (happiness, intensity) => {
    const x = 100 + (happiness / 10) * 1000;
    const y = 100 + ((10 - intensity) / 10) * 670;
    return { x, y };
  };

  // Add a new circle
  const addCircle = () => {
    const newCircle = {
      id: `circle-${nextIdRef.current++}`,
      type: 'circle',
      x: 600,
      y: 435,
      ...svgToValues(600, 435)
    };
    setObjects([...objects, newCircle]);
    setSelectedObject(newCircle);
  };

  // Add a new square
  const addSquare = () => {
    const newSquare = {
      id: `square-${nextIdRef.current++}`,
      type: 'square',
      x: 600,
      y: 435,
      ...svgToValues(600, 435)
    };
    setObjects([...objects, newSquare]);
    setSelectedObject(newSquare);
  };

  // Handle object click
  const handleObjectClick = (object) => {
    setSelectedObject(object);
  };

  // Handle mouse down on object
  const handleMouseDown = (e, object) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only allow dragging circles or squares in edit mode
    if (object.type === 'square' && !editMode) {
      handleObjectClick(object);
      return;
    }
    
    setDragging(true);
    setDraggedObject(object);
    handleObjectClick(object);
    
    const rect = svgRef.current.getBoundingClientRect();
    dragStartRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // Handle mouse move during drag
  const handleMouseMove = useCallback((e) => {
    if (!dragging || !draggedObject || !svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = 1200 / rect.width;
    const scaleY = 800 / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // Constrain to graph area
    const constrainedX = Math.max(140, Math.min(1060, x));
    const constrainedY = Math.max(140, Math.min(730, y));
    
    // Update object position
    setObjects(prevObjects => 
      prevObjects.map(obj => 
        obj.id === draggedObject.id 
          ? { ...obj, x: constrainedX, y: constrainedY, ...svgToValues(constrainedX, constrainedY) }
          : obj
      )
    );
  }, [dragging, draggedObject]);

  // Handle mouse up - end drag
  const handleMouseUp = useCallback(() => {
    setDragging(false);
    setDraggedObject(null);
  }, []);

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

  return (
    <div className="music-graph">
      <div className="graph-header">
        <h2>🎵 Interactive Positioning Tool</h2>
        <div className="graph-controls">
          <button onClick={addCircle}>Add Circle</button>
          <button onClick={addSquare}>Add Square</button>
          <button 
            onClick={() => setEditMode(!editMode)}
            className={editMode ? 'edit-active' : ''}
          >
            {editMode ? 'Exit Edit Mode' : 'Edit Playlists'}
          </button>
        </div>
      </div>

      <div className="graph-layout">
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
            
            {/* Render all objects */}
            {objects.map(obj => {
              if (obj.type === 'circle') {
                return (
                  <g key={obj.id}>
                    <circle
                      cx={obj.x}
                      cy={obj.y}
                      r="30"
                      fill="#1db954"
                      stroke={selectedObject?.id === obj.id ? "#fff" : "none"}
                      strokeWidth="3"
                      style={{ cursor: 'grab' }}
                      onMouseDown={(e) => handleMouseDown(e, obj)}
                    />
                  </g>
                );
              } else if (obj.type === 'square') {
                return (
                  <g key={obj.id}>
                    <rect
                      x={obj.x - 30}
                      y={obj.y - 30}
                      width="60"
                      height="60"
                      rx="10"
                      fill="#e74c3c"
                      opacity={editMode ? 1 : 0.6}
                      stroke={selectedObject?.id === obj.id ? "#fff" : "none"}
                      strokeWidth="3"
                      style={{ cursor: editMode ? 'grab' : 'pointer' }}
                      onMouseDown={(e) => handleMouseDown(e, obj)}
                    />
                  </g>
                );
              }
              return null;
            })}
          </svg>
        </div>

        {/* Right Panel */}
        <div className="right-panel">
          <h3>Selected Object</h3>
          {selectedObject ? (
            <div className="object-details">
              <p><strong>Type:</strong> {selectedObject.type === 'circle' ? 'Circle' : 'Square'}</p>
              <p><strong>ID:</strong> {selectedObject.id}</p>
              <p><strong>Happiness:</strong> {selectedObject.happiness}</p>
              <p><strong>Intensity:</strong> {selectedObject.intensity}</p>
            </div>
          ) : (
            <p className="no-selection">No object selected</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default MusicGraph;