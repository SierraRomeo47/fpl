import { request } from 'undici';

export const FPL_BASE_URL = "https://fantasy.premierleague.com/api";

export interface FPLClientOptions {
  cookies?: string; // Cookie header string with all cookies including access_token
  userAgent?: string;
}

export class FPLClient {
  private cookies: string | undefined;

  constructor(options: FPLClientOptions = {}) {
    this.cookies = options.cookies;
  }

  // Helper to set cookies later
  setCookies(cookies: string) {
    this.cookies = cookies;
  }

  async fetch(endpoint: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/json",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": "https://fantasy.premierleague.com/",
      "Origin": "https://fantasy.premierleague.com",
    };

    // Use Cookie-based authentication (FPL API requirement)
    if (this.cookies) {
      headers["Cookie"] = this.cookies;
    }

    // Merge with provided headers
    Object.assign(headers, options.headers || {});

    console.log(`[FPL Client] Fetching: ${endpoint}`);
    console.log(`[FPL Client] Has cookies: ${!!this.cookies}`);

    try {
      // Use undici's request for proper server-side cookie support
      const { statusCode, body } = await request(`${FPL_BASE_URL}${endpoint}`, {
        method: (options.method as any) || 'GET',
        headers,
        body: options.body as any,
      });

      console.log(`[FPL Client] Response status: ${statusCode}`);

      if (statusCode >= 400) {
        let errorText = 'Unknown error';
        try {
          errorText = await body.text();
        } catch (e) {
          errorText = 'Unable to read error body';
        }
        console.error(`[FPL Client] Error response:`, errorText);
        throw new Error(`FPL API Error: ${statusCode}`);
      }

      // Parse JSON response
      const responseText = await body.text();
      return JSON.parse(responseText);
    } catch (error) {
      console.error(`[FPL Client] Request failed:`, error);
      throw error;
    }
  }

  async getBootstrapStatic() {
    return this.fetch("/bootstrap-static/");
  }

  async getMe() {
    // Endpoint to verify cookie and get my entry ID
    return this.fetch("/me/");
  }

  async getMyTeam(entryId: number) {
    return this.fetch(`/my-team/${entryId}/`);
  }

  async getHistory(entryId: number) {
    return this.fetch(`/entry/${entryId}/history/`);
  }

  async getFixtures() {
    // Get all fixtures with difficulty ratings
    return this.fetch("/fixtures/");
  }

  async getPlayerDetails(playerId: number) {
    return this.fetch(`/element-summary/${playerId}/`);
  }

  async makeTransfer(teamId: number, transferData: any) {
    return this.fetch(`/my-team/${teamId}/transfers/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transferData),
    });
  }

  async updateSquad(teamId: number, picksData: any) {
    return this.fetch(`/my-team/${teamId}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(picksData),
    });
  }
}
