// Quick test script - paste your pl_profile cookie value below
const COOKIE = "YOUR_PL_PROFILE_COOKIE_HERE";

async function testCookie() {
    // Test different FPL endpoints to find the right one
    const endpoints = [
        "/me/",
        "/entry/me/",
        "/bootstrap-static/"
    ];

    for (const endpoint of endpoints) {
        try {
            console.log(`\nTesting: ${endpoint}`);
            const res = await fetch(`https://fantasy.premierleague.com/api${endpoint}`, {
                headers: {
                    "Cookie": `pl_profile=${COOKIE}`,
                    "User-Agent": "Mozilla/5.0"
                }
            });

            console.log(`Status: ${res.status}`);
            if (res.ok) {
                const data = await res.json();
                console.log(`✓ SUCCESS!`);
                console.log(`Data keys:`, Object.keys(data).slice(0, 10));
                if (data.player || data.entry) {
                    console.log(`Entry ID:`, data.player?.entry || data.entry);
                }
            }
        } catch (e) {
            console.log(`✗ Error:`, e.message);
        }
    }
}

testCookie();
