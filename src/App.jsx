import { useState, useEffect } from 'react'
import './App.css'
import Callback from './components/Callback'
import NowPlaying from './components/NowPlaying'
import MusicGraph from './components/MusicGraph'
import PlaylistPanel from './components/PlaylistPanel'
import './components/NowPlaying.css'
import './components/MusicGraph.css'
import './components/PlaylistPanel.css'
import { authenticateSpotify, getStoredAccessToken, logout, getAccessToken } from './utils/spotify'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [draggedTrack, setDraggedTrack] = useState(null)
  const [mobileDragData, setMobileDragData] = useState(null)
  const [mobileDragPreview, setMobileDragPreview] = useState(null)

  useEffect(() => {
    const checkAuthentication = async () => {
      // Check if user is already authenticated
      let token = getStoredAccessToken()
      if (token) {
        setIsAuthenticated(true)
        setLoading(false)
        return
      }

      // Check if we have an auth code from sessionStorage
      const authCode = sessionStorage.getItem('spotify_auth_code')
      if (authCode) {
        try {
          await getAccessToken(authCode)
          sessionStorage.removeItem('spotify_auth_code')
          setIsAuthenticated(true)
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
              <button className="logout-button" onClick={handleLogout}>
                Logout
              </button>
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
              <MusicGraph 
                mobileDragData={mobileDragData}
                setMobileDragData={setMobileDragData}
              />
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
    </div>
  )
}

export default App
