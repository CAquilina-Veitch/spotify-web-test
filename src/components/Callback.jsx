import { useEffect, useState } from 'react';
import { getAccessToken } from '../utils/spotify';

function Callback() {
  const [status, setStatus] = useState('Processing authentication...');
  const [error, setError] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      setError(`Authentication failed: ${error}`);
      return;
    }

    if (!code) {
      setError('No authorization code received');
      return;
    }

    // Exchange code for access token
    getAccessToken(code)
      .then(() => {
        setStatus('Authentication successful! Redirecting...');
        setTimeout(() => {
          window.location.href = window.location.origin + window.location.pathname.replace('/callback', '');
        }, 2000);
      })
      .catch((error) => {
        setError(`Failed to get access token: ${error.message}`);
      });
  }, []);

  return (
    <div className="callback-container">
      <h1>🎵 Spotify Controller</h1>
      {error ? (
        <div className="error">
          <p>{error}</p>
          <button onClick={() => window.location.href = window.location.origin + window.location.pathname.replace('/callback', '')}>
            Back to Home
          </button>
        </div>
      ) : (
        <div className="status">
          <p>{status}</p>
          <div className="spinner"></div>
        </div>
      )}
      
      <style jsx>{`
        .callback-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background-color: #191414;
          color: white;
          text-align: center;
          padding: 20px;
        }
        
        .callback-container h1 {
          color: #1db954;
          margin-bottom: 30px;
        }
        
        .error {
          background-color: #e22134;
          padding: 20px;
          border-radius: 10px;
          margin: 20px 0;
        }
        
        .error button {
          background-color: #1db954;
          border: none;
          color: white;
          padding: 10px 20px;
          border-radius: 25px;
          cursor: pointer;
          margin-top: 10px;
        }
        
        .error button:hover {
          background-color: #1ed760;
        }
        
        .status {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .spinner {
          border: 4px solid #333;
          border-top: 4px solid #1db954;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 2s linear infinite;
          margin-top: 20px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default Callback;