# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

```bash
# Build for GitHub Pages
npm run build      # Build for production (outputs to dist/)
npm run deploy     # Deploy to GitHub Pages (runs build then gh-pages)

# Code Quality
npm run lint       # Run ESLint

# Git Commands (DO NOT PUSH)
git add .
git commit -m "your message"
# User will handle pushing
```

## Architecture Overview

### Application Structure
This is a React-based Spotify web controller application that uses:
- **Vite** as the build tool
- **React 19** for the UI framework
- **Spotify Web API** for music control and data
- **OAuth 2.0 with PKCE** for secure authentication (no client secret needed)
- **GitHub Pages** for hosting

### Key Components

1. **Authentication Flow** (`src/utils/spotify.js`):
   - Implements OAuth 2.0 with PKCE for secure client-side authentication
   - Manages access tokens with automatic refresh
   - Client ID is hardcoded in the file (needs to be replaced for new deployments)

2. **Main App** (`src/App.jsx`):
   - Handles authentication state and routing
   - Simple client-side routing for the callback page
   - Manages drag-and-drop state for mobile/desktop interactions

3. **Core Features**:
   - **NowPlaying**: Displays current track with playback controls
   - **PlaylistPanel**: Shows user playlists with drag-drop support
   - **MusicGraph**: Visual representation of tracks based on audio features (happiness/valence vs intensity/energy)
   - **Callback**: Handles OAuth redirect and token exchange

### GitHub Pages Configuration
- Base path: `/spotify-web-test/` (configured in `vite.config.js`)
- Build output: `dist/` directory
- Homepage URL in `package.json` must match GitHub Pages URL
- The app is configured for production deployment only

### Spotify API Integration
The app requests these scopes:
- Playback state read/modify
- Playlist read/modify (public, private, collaborative)
- User library read/modify

Key API functions in `src/utils/spotify.js`:
- `makeSpotifyRequest()`: Wrapper for authenticated API calls with automatic token refresh
- `getAudioFeatures()`: Fetches track characteristics for graph positioning
- `mapAudioFeaturesToGraph()`: Converts Spotify audio features to X/Y coordinates

### Important Configuration Points
1. **Client ID**: Located in `src/utils/spotify.js:2`
2. **Redirect URIs**: Set for GitHub Pages deployment
3. **Base path**: Set in `vite.config.js` - must match GitHub repo name

### Deployment Notes
- Always use `npm run build` before committing changes
- The build creates optimized files in the `dist/` directory
- Commit changes but DO NOT push - let the user handle pushing
- Audio features mapping: valence (0-1) → happiness (0-10), energy (0-1) → intensity (0-10)