// Popup script for Chrome extension - WITH CLIPBOARD COPY

const app = document.getElementById('app');

// Load and show UI
async function init() {
  try {
    // Get cookies from storage
    const data = await chrome.storage.local.get(['cookies', 'timestamp']);

    if (data.cookies) {
      showWithCookies(data.cookies);
    } else {
      showNoCookies();
    }
  } catch (error) {
    console.error('[FPL DnD Popup] Error:', error);
    showNoCookies();
  }
}

// Show UI when cookies are available
function showWithCookies(cookies) {
  app.innerHTML = `
    <div class="header">
      <div class="logo">⚽</div>
      <h1>FPL DnD</h1>
      <div class="subtitle">Cookies Captured!</div>
    </div>
    
    <div class="not-logged-in">
      <p style="font-size: 14px; margin-bottom: 16px;">
        Click below to copy your FPL cookies, then paste them in the app.
      </p>
      
      <button class="btn-primary" id="copyCookies" style="margin-bottom: 12px;">
        📋 Copy Cookies to Clipboard
      </button>
      
      <button class="btn-primary" id="openApp">
        🚀 Open Full App
      </button>
      
      <button class="btn-secondary" id="openFPL">
        Go to FPL Website
      </button>
      
      <div id="status" style="margin-top: 16px; font-size: 12px; text-align: center; min-height: 20px;"></div>
    </div>
  `;

  // Copy cookies button
  document.getElementById('copyCookies').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(cookies);
      const status = document.getElementById('status');
      status.textContent = '✓ Cookies copied! Paste in the app.';
      status.style.color = '#10b981';

      // Clear message after 3 seconds
      setTimeout(() => {
        status.textContent = '';
      }, 3000);
    } catch (err) {
      console.error('Failed to copy:', err);
      const status = document.getElementById('status');
      status.textContent = '❌ Failed to copy. Try again.';
      status.style.color = '#ef4444';
    }
  });

  // Open app button
  document.getElementById('openApp').addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:3000' });
  });

  // Open FPL button
  document.getElementById('openFPL').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://fantasy.premierleague.com' });
  });
}

// Show UI when no cookies
function showNoCookies() {
  app.innerHTML = `
    <div class="header">
      <div class="logo">⚽</div>
      <h1>FPL DnD</h1>
      <div class="subtitle">One-Click FPL Login</div>
    </div>
    
    <div class="not-logged-in">
      <p>No cookies captured yet!</p>
      <p style="font-size: 14px; margin-bottom: 24px;">
        Go to <strong>fantasy.premierleague.com</strong> and log in.
        We'll automatically capture your cookies.
      </p>
      <button class="btn-primary" id="openFPL">Open FPL Website</button>
    </div>
  `;

  document.getElementById('openFPL').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://fantasy.premierleague.com' });
  });
}

// Initialize
init();
