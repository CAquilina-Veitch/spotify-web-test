# Setup Instructions

## 1. Create GitHub Repository
1. Go to GitHub and create a new repository called `spotify-controller`
2. Make it public
3. Don't initialize with README (we already have files)

## 2. Initialize Git and Push
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/caquilina-veitch/spotify-controller.git
git push -u origin main
```

## 3. Enable GitHub Pages
1. Go to your repository on GitHub
2. Click Settings > Pages
3. Under "Source", select "GitHub Actions"
4. The workflow will automatically deploy when you push

## 4. Update Spotify App Settings
Add these redirect URIs to your Spotify app:
- `https://caquilina-veitch.github.io/spotify-controller/callback`
- `http://localhost:4173/spotify-controller/callback` (for testing)

## 5. Deploy
```bash
npm run deploy
```

Your app will be available at: https://caquilina-veitch.github.io/spotify-controller/