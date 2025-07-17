# 🎵 Spotify Controller

A web-based Spotify controller that allows you to control your Spotify playback from any device. Built with React and the Spotify Web API.

## Features

- 🎵 Currently playing track display
- ⏯️ Playback controls (play/pause/skip)
- 📱 Responsive design for mobile and desktop
- 🔐 Secure OAuth 2.0 authentication with PKCE
- 🌐 Progressive Web App (PWA) support

## Setup Instructions

### 1. Create a Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click "Create an App"
3. Fill in the app name and description
4. Set the redirect URI to: `https://yourusername.github.io/spotify-controller/callback`
5. Copy your Client ID

### 2. Configure the Application

1. Open `src/utils/spotify.js`
2. Replace `'your-client-id-here'` with your actual Spotify Client ID
3. Replace `'yourusername'` in the REDIRECT_URI with your GitHub username

### 3. Deploy to GitHub Pages

1. Create a new GitHub repository named `spotify-controller`
2. Push this code to your repository
3. Update the `homepage` field in `package.json` with your GitHub Pages URL
4. Run `npm run deploy` to deploy to GitHub Pages

### 4. Update Spotify App Settings

1. Go back to your Spotify app in the developer dashboard
2. Update the redirect URI to match your GitHub Pages URL: `https://yourusername.github.io/spotify-controller/callback`

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

## Required Spotify Permissions

The app requests the following permissions:
- `user-read-playback-state` - Read current playback state
- `user-modify-playback-state` - Control playback
- `user-read-currently-playing` - Read currently playing track
- `playlist-modify-public` - Modify public playlists
- `playlist-modify-private` - Modify private playlists
- `playlist-read-private` - Read private playlists
- `playlist-read-collaborative` - Read collaborative playlists
- `user-library-read` - Read user's saved tracks
- `user-library-modify` - Modify user's saved tracks

## Tech Stack

- React 19
- Vite
- Spotify Web API
- GitHub Pages

## Security

This app uses OAuth 2.0 with PKCE (Proof Key for Code Exchange) for secure authentication. No client secrets are stored in the frontend code.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License
