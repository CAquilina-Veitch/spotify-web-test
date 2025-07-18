import { useState, useEffect } from 'react'
import './App.css'
import Callback from './components/Callback'
import NowPlaying from './components/NowPlaying'
import Playlists from './components/Playlists'
import Search from './components/Search'
import './components/NowPlaying.css'
import './components/Playlists.css'
import './components/Search.css'
import { authenticateSpotify, getStoredAccessToken, logout } from './utils/spotify'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already authenticated
    const token = getStoredAccessToken()
    if (token) {
      setIsAuthenticated(true)
    }
    setLoading(false)
  }, [])

  const handleLogin = () => {
    authenticateSpotify()
  }

  const handleLogout = () => {
    logout()
    setIsAuthenticated(false)
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
            <NowPlaying />
            <Search />
            <Playlists />
          </div>
        )}
      </header>
    </div>
  )
}

export default App
