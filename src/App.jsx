import { useState, useEffect } from 'react'
import './App.css'
import Callback from './components/Callback'
import NowPlaying from './components/NowPlaying'
import MusicGraph from './components/MusicGraph'
import PlaylistPanel from './components/PlaylistPanel'
import QueueBuilder from './components/QueueBuilder'
import QueueImport from './components/QueueImport'
import LiveQueue from './components/LiveQueue'
import './components/NowPlaying.css'
import './components/MusicGraph.css'
import './components/PlaylistPanel.css'
import './components/QueueBuilder.css'
import './components/QueueImport.css'
import './components/LiveQueue.css'
import { authenticateSpotify, getStoredAccessToken, logout, getAccessToken } from './utils/spotify'
import { isShareUrl } from './utils/queueEncoding'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [draggedTrack, setDraggedTrack] = useState(null)
  const [mobileDragData, setMobileDragData] = useState(null)
  const [mobileDragPreview, setMobileDragPreview] = useState(null)
  const [showQueueBuilder, setShowQueueBuilder] = useState(false)
  const [showQueueImport, setShowQueueImport] = useState(false)

  useEffect(() => {
    const checkAuthentication = async () => {
      // Check if user is already authenticated
      let token = getStoredAccessToken()
      if (token) {
        setIsAuthenticated(true)
        setLoading(false)
        
        // Check if this is a queue share URL
        if (isShareUrl()) {
          setShowQueueImport(true)
        }
        return
      }

      // Check if we have an auth code from sessionStorage
      const authCode = sessionStorage.getItem('spotify_auth_code')
      if (authCode) {
        try {
          await getAccessToken(authCode)
          sessionStorage.removeItem('spotify_auth_code')
          setIsAuthenticated(true)
          
          // Restore hash that was preserved during OAuth flow
          const returnHash = sessionStorage.getItem('spotify_return_hash')
          if (returnHash) {
            window.location.hash = returnHash
            sessionStorage.removeItem('spotify_return_hash')
          }
          
          // Check if this is a queue share URL after auth
          if (isShareUrl()) {
            setShowQueueImport(true)
          }
        } catch (error) {
          console.error('Error exchanging auth code:', error)
        }
      }
      
      setLoading(false)
    }

    checkAuthentication()
  }, [])

  const handleLogin = () => {
    authenticateSpotify()
  }

  const handleLogout = () => {
    logout()
    setIsAuthenticated(false)
  }

  const handleTrackDragStart = (trackData) => {
    setDraggedTrack(trackData)
  }

  const handleTrackDragEnd = () => {
    setDraggedTrack(null)
  }

  // Simple router for callback
  const path = window.location.pathname
  if (path.includes('/callback')) {
    return <Callback />
  }

  if (loading) {
    return (
      <div className="App">
        <div className="loading">Loading...</div>
      </div>
    )
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎵 Spotify Controller</h1>
        <p>Control your Spotify playback from anywhere</p>
        {!isAuthenticated ? (
          <button className="login-button" onClick={handleLogin}>
            Login with Spotify
          </button>
        ) : (
          <div className="authenticated-content">
            <div className="header-controls">
              <h2>Welcome back!</h2>
              <div className="header-buttons">
                <button className="queue-builder-button" onClick={() => setShowQueueBuilder(true)}>
                  Build Queue
                </button>
                <button className="logout-button" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </div>
            <NowPlaying 
              onTrackDragStart={handleTrackDragStart}
              onTrackDragEnd={handleTrackDragEnd}
              mobileDragData={mobileDragData}
              setMobileDragData={setMobileDragData}
              setMobileDragPreview={setMobileDragPreview}
            />
            <div className="main-layout">
              <PlaylistPanel 
                mobileDragData={mobileDragData}
                setMobileDragData={setMobileDragData}
                setMobileDragPreview={setMobileDragPreview}
              />
              <div className="center-section">
                <LiveQueue 
                  onTrackDragStart={handleTrackDragStart}
                  onTrackDragEnd={handleTrackDragEnd}
                  mobileDragData={mobileDragData}
                  setMobileDragData={setMobileDragData}
                  setMobileDragPreview={setMobileDragPreview}
                />
                <MusicGraph 
                  mobileDragData={mobileDragData}
                  setMobileDragData={setMobileDragData}
                />
              </div>
            </div>
          </div>
        )}
      </header>
      {/* Mobile drag preview */}
      {mobileDragPreview && (
        <div 
          className="mobile-drag-preview"
          style={{
            position: 'fixed',
            left: mobileDragPreview.x - 40,
            top: mobileDragPreview.y - 40,
            width: '80px',
            height: '80px',
            pointerEvents: 'none',
            zIndex: 9999,
            opacity: 0.8
          }}
        >
          <img 
            src={mobileDragPreview.image} 
            alt="Dragging"
            style={{
              width: '100%',
              height: '100%',
              borderRadius: mobileDragPreview.type === 'song' ? '50%' : '8px',
              boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
            }}
          />
        </div>
      )}
      
      {/* Queue Builder Modal */}
      {showQueueBuilder && (
        <QueueBuilder onClose={() => setShowQueueBuilder(false)} />
      )}
      
      {/* Queue Import Modal */}
      {showQueueImport && (
        <QueueImport 
          onClose={() => {
            setShowQueueImport(false)
            // Clear the hash from URL
            window.location.hash = ''
          }}
          onSuccess={() => {
            // Optionally show a success message
            window.location.hash = ''
          }}
        />
      )}
    </div>
  )
}

export default App
