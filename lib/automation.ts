
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Browser, Page } from "puppeteer";

puppeteer.use(StealthPlugin());

export interface LoginResult {
    success: boolean;
    cookies?: string; // FLP Cookie header string
    error?: string;
}

export class FPLAutomation {
    private browser: Browser | null = null;

    /**
     * Laurens a stealth browser to perform login
     */
    async login(email: string, password: string): Promise<LoginResult> {
        try {
            console.log("[Automation] Launching Stealth Browser...");
            // CHANGED: headless: false so user can solve CAPTCHAs if needed
            this.browser = await puppeteer.launch({
                headless: false, // Visible browser - allows manual CAPTCHA solving
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-web-security', // Help bypass some protections
                    '--disable-features=IsolateOrigins,site-per-process'
                ]
            });
            const page = await this.browser.newPage();

            // 1. Navigate to FPL Home (Mimic real user)
            console.log("[Automation] Navigating to FPL Home...");
            await page.goto("https://fantasy.premierleague.com/", { waitUntil: "domcontentloaded" });

            // 2. Handle Cookie Consent
            try {
                const acceptCookies = await page.waitForSelector("#onetrust-accept-btn-handler", { timeout: 5000 });
                if (acceptCookies) {
                    console.log("[Automation] Accepting cookies...");
                    await acceptCookies.click();
                    await new Promise(r => setTimeout(r, 1000));
                }
            } catch (e) {
                console.log("[Automation] No cookie banner detected.");
            }

            // 3. Click "Log in" button on FPL homepage
            if (!page.url().includes("users.premierleague.com") && !page.url().includes("account.premierleague.com")) {
                console.log("[Automation] Looking for Log in button...");
                try {
                    // The FPL homepage has a "Log in" button (case-sensitive)
                    // Wait for page to be ready first
                    await page.waitForSelector('button, a', { timeout: 5000 });

                    // Click the button that contains "Log in" text
                    const loginClicked = await page.evaluate(() => {
                        // Find all buttons and links
                        const elements = Array.from(document.querySelectorAll('button, a'));

                        // Look for one with "Log in" text (case insensitive)
                        const loginBtn = elements.find(el =>
                            el.textContent?.trim().toLowerCase().includes('log in')
                        );

                        if (loginBtn) {
                            (loginBtn as HTMLElement).click();
                            return true;
                        }
                        return false;
                    });

                    if (loginClicked) {
                        console.log("[Automation] Clicked Log in button, waiting for navigation...");
                        await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {
                            console.log("[Automation] No navigation occurred, continuing...");
                        });
                    } else {
                        throw new Error("Log in button not found");
                    }
                } catch (e) {
                    console.log("[Automation] Could not find/click Log in button:", e);
                    console.log("[Automation] Trying direct navigation to account.premierleague.com...");
                    // Use account.premierleague.com (the actual SSO domain, not users.premierleague.com which is in maintenance)
                    await page.goto("https://account.premierleague.com/", { waitUntil: "networkidle2" });
                }
            }

            // 4. Type Credentials (Robust Selectors)
            console.log("[Automation] Waiting for login inputs...");
            console.log("[Automation] Current URL:", page.url());
            try {
                // Wait for *any* common password field to ensure form is loaded
                await page.waitForSelector("input[type='password']", { visible: true, timeout: 20000 });
                console.log("[Automation] Login form found!");
            } catch (e) {
                // CAPTURE HTML FOR DEBUGGING
                const html = await page.content();
                const fs = require('fs');
                const path = require('path'); // path is already required here in original code, but keeping for clarity as per instruction
                const debugHtmlPath = path.join(process.cwd(), 'public', 'debug-error.html');
                fs.writeFileSync(debugHtmlPath, html);

                const debugPath = path.join(process.cwd(), 'public', 'debug-login.png');
                await page.screenshot({ path: debugPath });

                console.error("[Automation Error] Login inputs not found. HTML dumped to public/debug-error.html");
                throw new Error("Login inputs not found. I've saved the page HTML to debug-error.html for analysis.");
            }

            console.log("[Automation] Typing Credentials with human-like delays...");

            // Helper function for human-like typing
            const humanType = async (selector: string, text: string) => {
                // Focus the field
                await page.click(selector);
                await new Promise(r => setTimeout(r, 100 + Math.random() * 200));

                // Clear any existing content
                await page.evaluate((sel) => {
                    const element = document.querySelector(sel) as HTMLInputElement;
                    if (element) element.value = '';
                }, selector);

                // Type each character with random delay (30-120ms between chars)
                for (const char of text) {
                    await page.type(selector, char, {
                        delay: 30 + Math.random() * 90
                    });
                    // Occasional longer pause (simulating thinking/looking)
                    if (Math.random() < 0.1) {
                        await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
                    }
                }

                // Small pause after finishing typing
                await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
            };

            // More robust selectors
            const emailSelector = "input[type='email'], input[name='login'], input[name='username'], #loginUsername, #id_login";
            const passwordSelector = "input[type='password'], input[name='password'], #loginPassword, #id_password";

            // Type email with human-like behavior
            console.log("[Automation] Typing email...");
            await humanType(emailSelector, email);

            // Pause between fields (like a human would)
            await new Promise(r => setTimeout(r, 300 + Math.random() * 500));

            // Type password with human-like behavior
            console.log("[Automation] Typing password...");
            await humanType(passwordSelector, password);

            // Pause before clicking submit (human verification behavior)
            await new Promise(r => setTimeout(r, 500 + Math.random() * 700));

            // 5. MANUAL INTERVENTION - Let user click Sign In to bypass bot detection
            console.log("[Automation] === WAITING FOR MANUAL CLICK ===");
            console.log("[Automation] Please verify your credentials and click 'Sign in' button manually");
            console.log("[Automation] This helps bypass anti-bot detection");

            // Show alert in browser window
            await page.evaluate(() => {
                alert('✋ AUTOMATION PAUSED\n\nPlease verify your email and password are correct,\nthen click the "Sign in" button manually.\n\nThe automation will continue after you click OK.');
            });

            console.log("[Automation] User confirmed, waiting for Sign in...");

            // Now wait for navigation (user will click the button)
            console.log("[Automation] Waiting for you to click Sign in button...");

            // User will click the button manually - we just wait for navigation

            // Wait for navigation to complete (should redirect to fantasy.premierleague.com)
            await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch((e) => {
                console.log("[Automation] Navigation timeout or already on target page");
            });

            // Give it a moment for cookies to be set
            await new Promise(r => setTimeout(r, 2000));

            // 6. Validating Login
            const currentUrl = page.url();
            console.log(`[Automation] Post-login URL: ${currentUrl}`);

            // Success if we're on fantasy.premierleague.com (not on login/error pages)
            if (currentUrl.includes("account.premierleague.com") &&
                (currentUrl.includes("password") || currentUrl.includes("error") || currentUrl.includes("/authorize"))) {
                const path = require('path');
                const debugPath = path.join(process.cwd(), 'public', 'debug-failed.png');
                await page.screenshot({ path: debugPath });

                const html = await page.content();
                const fs = require('fs');
                fs.writeFileSync(path.join(process.cwd(), 'public', 'debug-failed.html'), html);

                await this.close();
                return { success: false, error: "Login failed - still on auth page. Check credentials or solve CAPTCHA manually." };
            }

            // 7. Extract ALL Cookies from fantasy.premierleague.com
            console.log("[Automation] Extracting all cookies from fantasy.premierleague.com...");

            // Navigate to fantasy.premierleague.com if not already there
            if (!currentUrl.includes("fantasy.premierleague.com")) {
                console.log("[Automation] Navigating to fantasy.premierleague.com to extract cookies...");
                await page.goto("https://fantasy.premierleague.com/", { waitUntil: "networkidle2" });
                await new Promise(r => setTimeout(r, 2000)); // Wait for cookies to sync
            }

            const cookies = await page.cookies();
            console.log(`[Automation] Found ${cookies.length} cookies`);
            console.log("[Automation] Cookie names:", cookies.map(c => c.name).join(", "));

            // FPL API requires ALL cookies in Cookie header (including access_token)
            // Build complete cookie header string
            const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join("; ");

            if (!cookieHeader) {
                await this.close();
                return { success: false, error: "Login successful but no cookies found." };
            }

            console.log("[Automation] Success! Cookie header created.");
            console.log(`[Automation] Cookies preview: ${cookieHeader.substring(0, 100)}...`);

            await this.close();
            return { success: true, cookies: cookieHeader };

        } catch (error: any) {
            console.error("[Automation] Error:", error);
            await this.close();
            return { success: false, error: error.message || "Unknown automation error" };
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}
