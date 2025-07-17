import { useState, useEffect } from 'react'
import './App.css'
import Callback from './components/Callback'
import NowPlaying from './components/NowPlaying'
import Playlists from './components/Playlists'
import Search from './components/Search'
import MusicGraph from './components/MusicGraph'
import './components/NowPlaying.css'
import './components/Playlists.css'
import './components/Search.css'
import './components/MusicGraph.css'
import { authenticateSpotify, getStoredAccessToken, logout, getAccessToken } from './utils/spotify'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

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
            <MusicGraph />
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
