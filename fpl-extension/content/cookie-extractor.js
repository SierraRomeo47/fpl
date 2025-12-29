// Content script that runs on fantasy.premierleague.com
// Automatically extracts cookies when user is logged in

console.log('[FPL DnD] Content script loaded');

let cookiesSent = false; // Flag to prevent sending multiple times

// Function to extract and send cookies
function extractAndSendCookies() {
  if (cookiesSent) {
    console.log('[FPL DnD] Already sent cookies, skipping');
    return;
  }

  const cookies = document.cookie;

  // Check if user is logged in (has access_token or pl_profile)
  if (cookies.includes('access_token') || cookies.includes('pl_profile')) {
    console.log('[FPL DnD] Cookies found, sending to background...');
    cookiesSent = true; // Set flag immediately

    // Send cookies to background service worker
    chrome.runtime.sendMessage({
      action: 'COOKIES_CAPTURED',
      data: cookies,
      timestamp: Date.now()
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[FPL DnD] Error:', chrome.runtime.lastError);
        cookiesSent = false; // Reset on error
        return;
      }

      if (response && response.success) {
        console.log('[FPL DnD] Cookies successfully stored');
        showSuccessIndicator();
      }
    });
  } else {
    console.log('[FPL DnD] No cookies found yet');
  }
}

// Show success indicator on page (only once)
function showSuccessIndicator() {
  const existing = document.getElementById('fpl-dnd-indicator');
  if (existing) return; // Don't show multiple times

  const indicator = document.createElement('div');
  indicator.id = 'fpl-dnd-indicator';
  indicator.innerHTML = `
    <div style="position:fixed;top:20px;right:20px;background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:white;padding:12px 24px;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,0.1);z-index:10000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;font-weight:500;display:flex;align-items:center;gap:8px;">
      ✓ FPL DnD Connected
    </div>
  `;

  document.body.appendChild(indicator);

  // Remove after 3 seconds
  setTimeout(() => {
    indicator.style.opacity = '0';
    indicator.style.transition = 'opacity 0.3s';
    setTimeout(() => indicator.remove(), 300);
  }, 3000);
}

// Try to extract cookies once after a delay
setTimeout(extractAndSendCookies, 2000);

// Listen for messages from popup  
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_COOKIES') {
    extractAndSendCookies();
    sendResponse({ success: true });
  }
});
