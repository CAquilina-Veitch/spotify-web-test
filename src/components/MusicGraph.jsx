import React, { useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { makeSpotifyRequest, getAudioFeatures, mapAudioFeaturesToGraph } from '../utils/spotify';

// Custom node component for songs
const SongNode = ({ data }) => {
  return (
    <div className="song-node">
      <div className="song-artwork">
        {data.image ? (
          <img src={data.image} alt={data.name} />
        ) : (
          <div className="placeholder-artwork">🎵</div>
        )}
      </div>
      <div className="song-info">
        <div className="song-name">{data.name}</div>
        <div className="song-artist">{data.artist}</div>
      </div>
      <div className="song-values">
        <div className="happiness">♪ {data.happiness}</div>
        <div className="intensity">⚡ {data.intensity}</div>
      </div>
    </div>
  );
};

// Node types
const nodeTypes = {
  song: SongNode,
};

function MusicGraph() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [loading, setLoading] = useState(false);


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
        audioFeatures,
        ...position
      };

      setCurrentTrack(track);

      // Add current track as a node
      const newNode = {
        id: `current-${track.id}`,
        type: 'song',
        position: { x: track.x, y: track.y },
        data: {
          name: track.name,
          artist: track.artist,
          image: track.image,
          happiness: track.happiness,
          intensity: track.intensity,
          isCurrent: true
        },
        className: 'current-track-node'
      };

      setNodes([newNode]);
      
    } catch (error) {
      console.error('Error fetching current track:', error);
    } finally {
      setLoading(false);
    }
  }, [setNodes]);

  // Initialize graph with current track
  useEffect(() => {
    fetchCurrentTrack();
  }, [fetchCurrentTrack]);

  // Handle node drag end - this is where we'll add playlist logic later
  const onNodeDragStop = useCallback((event, node) => {
    // Calculate new happiness and intensity based on position
    const happiness = Math.round(Math.max(0, Math.min(10, (node.position.x - 100) / 80)));
    const intensity = Math.round(Math.max(0, Math.min(10, (900 - node.position.y) / 80)));
    
    // Update node data
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === node.id) {
          return {
            ...n,
            data: {
              ...n.data,
              happiness,
              intensity
            }
          };
        }
        return n;
      })
    );

    console.log(`Track moved to: Happiness ${happiness}, Intensity ${intensity}`);
    // TODO: Add to relevant playlists based on position
  }, [setNodes]);

  // Create grid lines for the graph
  const createGridLines = () => {
    const lines = [];
    // Vertical lines (happiness)
    for (let i = 0; i <= 10; i++) {
      lines.push(
        <line
          key={`v-${i}`}
          x1={100 + i * 80}
          y1={100}
          x2={100 + i * 80}
          y2={900}
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
          y1={100 + i * 80}
          x2={900}
          y2={100 + i * 80}
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
        <h2>🎵 Music Graph</h2>
        <p>Drag songs to categorize by happiness and intensity</p>
        <button onClick={fetchCurrentTrack} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh Current Track'}
        </button>
      </div>

      <div className="graph-container">
        <div className="graph-wrapper">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStop={onNodeDragStop}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.5}
            maxZoom={2}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          >
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={80} 
              size={1} 
              color="#404040"
            />
            <Controls />
            <MiniMap />
            
            {/* Custom SVG overlay for grid and labels */}
            <svg className="graph-overlay">
              {createGridLines()}
              
              {/* Axis labels */}
              <text x="500" y="950" textAnchor="middle" fill="#b3b3b3" fontSize="14">
                Happiness →
              </text>
              <text x="50" y="500" textAnchor="middle" fill="#b3b3b3" fontSize="14" transform="rotate(-90 50 500)">
                Intensity →
              </text>
              
              {/* Corner labels */}
              <text x="120" y="130" fill="#1db954" fontSize="12">Sad & Calm</text>
              <text x="820" y="130" fill="#1db954" fontSize="12">Happy & Calm</text>
              <text x="120" y="880" fill="#1db954" fontSize="12">Sad & Intense</text>
              <text x="800" y="880" fill="#1db954" fontSize="12">Happy & Intense</text>
            </svg>
          </ReactFlow>
        </div>

        {/* Graph legend */}
        <div className="graph-legend">
          <h3>Legend</h3>
          <div className="legend-item">
            <div className="legend-color current-track"></div>
            <span>Current Track</span>
          </div>
          <div className="legend-item">
            <div className="legend-color playlist-track"></div>
            <span>Playlist Track</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MusicGraph;