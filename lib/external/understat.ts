import { readCachedJson, writeCachedJson } from "./cache";
import type { UnderstatPlayerStats } from "@/types/external";

// Understat has no official public API; we scrape embedded JSON from HTML.

const UNDERSTAT_BASE = "https://understat.com";

function decodeJsonParseString(raw: string) {
  // Understat embeds JSON as: JSON.parse('...') with backslash escapes
  // Convert escaped sequences into real characters.
  return raw
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\r/g, "\r")
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
}

function extractAllJsonParsePayloads(html: string): string[] {
  const results: string[] = [];

  // JSON.parse('...') pattern
  for (const m of html.matchAll(/JSON\.parse\('([\s\S]*?)'\)/g)) {
    results.push(decodeJsonParseString(m[1]));
  }
  // JSON.parse("...") pattern
  for (const m of html.matchAll(/JSON\.parse\("([\s\S]*?)"\)/g)) {
    results.push(decodeJsonParseString(m[1]));
  }

  return results;
}

function looksLikePlayerStatsObject(value: any): boolean {
  if (!value) return false;
  const arr = Array.isArray(value)
    ? value
    : typeof value === "object"
      ? Object.values(value)
      : [];
  const sample = arr.find((v: any) => v && typeof v === "object");
  if (!sample) return false;
  const keys = Object.keys(sample);
  // Understat player objects usually include these fields on team pages
  return (
    (keys.includes("player_name") || keys.includes("player")) &&
    (keys.includes("xG") ||
      keys.includes("npxG") ||
      keys.includes("xA") ||
      keys.includes("xG90") ||
      keys.includes("xA90"))
  );
}

function findPlayersNode(node: any, depth: number = 0): any[] | null {
  if (!node || depth > 6) return null;

  if (Array.isArray(node)) {
    if (looksLikePlayerStatsObject(node)) return node as any[];
    for (const item of node) {
      const found = findPlayersNode(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (typeof node === "object") {
    if (looksLikePlayerStatsObject(node)) {
      return Object.values(node) as any[];
    }
    for (const v of Object.values(node)) {
      const found = findPlayersNode(v, depth + 1);
      if (found) return found;
    }
  }

  return null;
}

function extractTeamPlayersFromHtml(html: string): any[] | null {
  const payloads = extractAllJsonParsePayloads(html);
  if (payloads.length === 0) return null;

  for (const p of payloads) {
    try {
      const parsed = JSON.parse(p);
      const players = findPlayersNode(parsed);
      if (players && players.length > 0) return players;
    } catch {
      // ignore and continue
    }
  }

  return null;
}

async function getUnderstatTeamPlayersViaBrowser(
  understatTeam: string,
  season: number
): Promise<any[] | null> {
  // Fallback: Understat renders most stats client-side.
  // Use Puppeteer to read the rendered player table from the DOM.
  const puppeteer = (await import("puppeteer")).default;
  const url = `${UNDERSTAT_BASE}/team/${encodeURIComponent(understatTeam)}/${season}`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
    // Give client-side rendering a moment
    await new Promise((r) => setTimeout(r, 2000));

    const players = await page.evaluate(() => {
      function norm(s: string) {
        return (s || "").replace(/\s+/g, " ").trim().toLowerCase();
      }

      const tables = Array.from(document.querySelectorAll("table"));

      function getHeaders(table: HTMLTableElement): string[] {
        const ths = Array.from(table.querySelectorAll("thead th"));
        if (ths.length > 0) return ths.map((th) => (th.textContent || "").trim());
        const firstRow = table.querySelector("tr");
        if (!firstRow) return [];
        const cells = Array.from(firstRow.querySelectorAll("th,td"));
        return cells.map((c) => (c.textContent || "").trim());
      }

      function parseTable(table: HTMLTableElement) {
        const headers = getHeaders(table);
        if (headers.length < 3) return null;

        const headerNorm = headers.map(norm);
        // Heuristic: player table contains xg and xa columns
        if (!headerNorm.some((h) => h === "xg" || h.includes("xg"))) return null;
        if (!headerNorm.some((h) => h === "xa" || h.includes("xa"))) return null;

        const bodyRows = Array.from(table.querySelectorAll("tbody tr"));
        const rows = bodyRows.length > 0 ? bodyRows : Array.from(table.querySelectorAll("tr")).slice(1);

        const parsed = rows
          .map((tr) => {
            const tds = Array.from(tr.querySelectorAll("td"));
            if (tds.length === 0) return null;
            const obj: Record<string, string> = {};
            for (let i = 0; i < Math.min(headers.length, tds.length); i++) {
              obj[headers[i]] = (tds[i].textContent || "").trim();
            }
            return obj;
          })
          .filter(Boolean) as Record<string, string>[];

        if (parsed.length === 0) return null;

        return { headers, rows: parsed };
      }

      for (const t of tables) {
        const parsed = parseTable(t as HTMLTableElement);
        if (!parsed) continue;

        // Attempt to map common Understat columns into a canonical shape
        const out = parsed.rows.map((r) => {
          // Try multiple header variants for player name
          const playerName =
            r["Player"] ||
            r["player"] ||
            r["Name"] ||
            r["name"] ||
            "";

          return {
            player_name: playerName,
            xG: r["xG"] || r["xg"],
            xA: r["xA"] || r["xa"],
            minutes: r["Mins"] || r["Min"] || r["Minutes"] || r["minutes"],
            games: r["Games"] || r["G"] || r["games"],
            goals: r["Goals"] || r["Gls"] || r["goals"],
            assists: r["Assists"] || r["Ast"] || r["assists"],
            shots: r["Shots"] || r["Sh"] || r["shots"],
            key_passes: r["Key passes"] || r["KP"] || r["key_passes"],
            npxG: r["npxG"] || r["npxg"],
          };
        });

        // Keep only rows that look like players with xG values
        const filtered = out.filter((p) => p.player_name && (p.xG || p.xA));
        if (filtered.length > 0) return filtered;
      }

      return null;
    });

    return Array.isArray(players) && players.length > 0 ? players : null;
  } finally {
    await browser.close();
  }
}

function toNumber(v: any): number | undefined {
  if (v === null || v === undefined) return undefined;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : undefined;
}

function normalizeName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function mapFplTeamNameToUnderstatTeam(fplTeamName: string): string {
  // Understat uses long-form club names in URLs, with spaces.
  // Many match FPL names; add exceptions here.
  const n = normalizeName(fplTeamName);
  const overrides: Record<string, string> = {
    "tottenham hotspur": "Tottenham",
    "spurs": "Tottenham",
    "wolverhampton wanderers": "Wolverhampton Wanderers",
    "wolves": "Wolverhampton Wanderers",
    "manchester united": "Manchester United",
    "manchester city": "Manchester City",
    "newcastle united": "Newcastle United",
    "nottingham forest": "Nottingham Forest",
    "brighton": "Brighton",
    "brighton and hove albion": "Brighton",
  };

  return overrides[n] || fplTeamName;
}

export async function getUnderstatTeamPlayers(
  teamName: string,
  season: number,
  ttlMs: number = 1000 * 60 * 60 * 12 // 12h
): Promise<any[] | null> {
  const understatTeam = mapFplTeamNameToUnderstatTeam(teamName);
  const cacheKey = `team_${understatTeam}_${season}`;
  const cached = await readCachedJson<any[]>("understat", cacheKey);
  if (cached.hit) return cached.value;

  const url = `${UNDERSTAT_BASE}/team/${encodeURIComponent(understatTeam)}/${season}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const html = await res.text();

  let players = extractTeamPlayersFromHtml(html);
  if (!players || players.length === 0) {
    // Heavy fallback (cached by caller)
    players = await getUnderstatTeamPlayersViaBrowser(understatTeam, season);
  }
  if (!players || players.length === 0) return null;

  await writeCachedJson("understat", cacheKey, players, ttlMs);
  return players;
}

export async function getUnderstatPlayerStatsByTeam(
  playerName: string,
  teamName: string,
  season: number
): Promise<UnderstatPlayerStats | null> {
  const players = await getUnderstatTeamPlayers(teamName, season);
  if (!players || players.length === 0) return null;

  const target = normalizeName(playerName);

  // Try exact match on normalized name first, then fallback to includes
  let match: any =
    players.find((p: any) => normalizeName(p.player_name || p.player || "") === target) ||
    players.find((p: any) => normalizeName(p.player_name || p.player || "").includes(target)) ||
    players.find((p: any) => target.includes(normalizeName(p.player_name || p.player || "")));

  if (!match) return null;

  const minutes = toNumber(match.minutes);
  const games = toNumber(match.games);
  const xG = toNumber(match.xG);
  const xA = toNumber(match.xA);

  const xG90 = toNumber(match.xG90) ?? (minutes && xG ? (xG / minutes) * 90 : undefined);
  const xA90 = toNumber(match.xA90) ?? (minutes && xA ? (xA / minutes) * 90 : undefined);

  return {
    playerId: match.id ?? match.player_id,
    playerName: match.player_name || playerName,
    teamName,
    season,
    games,
    minutes,
    goals: toNumber(match.goals),
    assists: toNumber(match.assists),
    xG,
    xA,
    xG90,
    xA90,
    shots: toNumber(match.shots),
    keyPasses: toNumber(match.key_passes),
    npxG: toNumber(match.npxG),
    npxG90: toNumber(match.npxG90),
  };
}

