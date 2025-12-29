// Background service worker for Chrome extension
// Handles cookie storage AND FPL data fetching (bypasses CORS)

console.log('[FPL DnD] Background service worker initialized');

// Listen for messages from content script and webapp
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'COOKIES_CAPTURED') {
        console.log('[FPL DnD] Cookies received from content script');

        // Store cookies
        chrome.storage.local.set({
            cookies: request.data,
            timestamp: request.timestamp
        }, () => {
            console.log('[FPL DnD] Cookies stored successfully');

            // Update badge to show connected
            chrome.action.setBadgeText({ text: '✓' });
            chrome.action.setBadgeBackgroundColor({ color: '#10b981' });

            sendResponse({ success: true });
        });

        return true;
    }

    if (request.action === 'GET_SESSION') {
        chrome.storage.local.get(['cookies', 'entryId', 'playerName', 'timestamp'], (data) => {
            sendResponse(data);
        });
        return true;
    }

    if (request.action === 'CLEAR_SESSION') {
        chrome.storage.local.clear(() => {
            chrome.action.setBadgeText({ text: '' });
            sendResponse({ success: true });
        });
        return true;
    }

    // NEW: Fetch FPL data on behalf of webapp (bypasses CORS)
    if (request.action === 'FETCH_FPL_DATA') {
        const { endpoint, entryId } = request;

        chrome.storage.local.get(['cookies'], async (data) => {
            if (!data.cookies) {
                sendResponse({ error: 'No cookies stored' });
                return;
            }

            try {
                const url = `https://fantasy.premierleague.com/api${endpoint}`;
                console.log('[FPL DnD] Fetching:', url);

                const response = await fetch(url, {
                    headers: {
                        'Cookie': data.cookies,
                        'Accept': 'application/json',
                    },
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const fplData = await response.json();
                console.log('[FPL DnD] Data fetched successfully');
                sendResponse({ success: true, data: fplData });
            } catch (error) {
                console.error('[FPL DnD] Fetch error:', error);
                sendResponse({ error: error.message });
            }
        });

        return true; // Async response
    }
});

// Check session on startup
chrome.runtime.onStartup.addListener(() => {
    chrome.storage.local.get(['cookies', 'timestamp'], (data) => {
        if (data.cookies) {
            // Session exists, update badge
            chrome.action.setBadgeText({ text: '✓' });
            chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
        }
    });
});
