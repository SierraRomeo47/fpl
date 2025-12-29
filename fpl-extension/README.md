# FPL DnD Chrome Extension

One-click automated login for Fantasy Premier League!

## Features
- ✅ Automatic cookie extraction when you visit FPL
- ✅ One-click login - no manual copy-paste
- ✅ Team overview in popup
- ✅ Quick access to full app

## Installation (Development)

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `fpl-extension` folder
5. Done! The extension is now installed

## How to Use

1. **Go to fantasy.premierleague.com and log in**
2. The extension will automatically detect your login and extract cookies
3. You'll see a green "FPL DnD Connected" notification
4. Click the extension icon to view your team
5. Click "Open Full App" to access all features

## Files Structure

```
fpl-extension/
├── manifest.json              # Extension configuration
├── content/
│   └── cookie-extractor.js   # Auto-extracts cookies from FPL
├── background/
│   └── service-worker.js     # Validates and stores cookies
├── popup/
│   ├── index.html            # Popup UI
│   └── popup.js              # Popup logic
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Development

The extension is ready to load in Chrome! Just follow the installation steps above.

## Publishing to Chrome Web Store

1. Create icons (16x16, 48x48, 128x128)
2. Test thoroughly
3. Create developer account ($5 one-time fee)
4. Upload ZIP file
5. Submit for review

## Privacy

- All data stays local (chrome.storage.local)
- No external servers
- Cookies only used for FPL API calls
- No tracking or analytics
