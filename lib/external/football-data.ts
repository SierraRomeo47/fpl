import { readCachedJson, writeCachedJson } from "./cache";

const FD_BASE = "https://api.football-data.org/v4";

function requireFdToken() {
  const token = process.env.FOOTBALL_DATA_API_KEY;
  if (!token) return null;
  return token;
}

function yyyyMmDd(d: Date) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function fdFetchJson<T>(endpoint: string): Promise<T> {
  const token = requireFdToken();
  if (!token) {
    throw new Error("FOOTBALL_DATA_API_KEY is not configured");
  }
  const res = await fetch(`${FD_BASE}${endpoint}`, {
    headers: {
      "X-Auth-Token": token,
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`football-data.org ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export interface FootballDataTeam {
  id: number;
  name: string;
  shortName?: string;
  tla?: string;
}

export interface FootballDataMatch {
  id: number;
  utcDate: string; // ISO
  status: string; // SCHEDULED, FINISHED, ...
  competition: { id: number; code?: string; name: string; type?: string };
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
}

function normalize(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function resolveFootballDataTeamIdByPlTeamName(
  teamName: string,
  ttlMs: number = 1000 * 60 * 60 * 24 * 7 // 7d
): Promise<number | null> {
  // Cache mapping per team name.
  const cacheKey = `pl_team_id_${teamName}`;
  const cached = await readCachedJson<number>("football-data", cacheKey);
  if (cached.hit) return cached.value;

  // football-data uses competition code "PL" for Premier League.
  // Fetch teams list once and cache.
  const teamsKey = `pl_teams`;
  const teamsCached = await readCachedJson<FootballDataTeam[]>("football-data", teamsKey);
  let teams: FootballDataTeam[];
  if (teamsCached.hit) {
    teams = teamsCached.value;
  } else {
    const data = await fdFetchJson<{ teams: FootballDataTeam[] }>(`/competitions/PL/teams`);
    teams = data.teams || [];
    await writeCachedJson("football-data", teamsKey, teams, ttlMs);
  }

  const nTarget = normalize(teamName);
  
  // Add known aliases for common FPL team names
  const aliases = [nTarget];
  if (nTarget === "man utd") aliases.push("manchester united", "man united", "mun");
  if (nTarget === "man city") aliases.push("manchester city");
  if (nTarget === "spurs") aliases.push("tottenham hotspur", "tottenham", "tot");
  if (nTarget === "nottm forest") aliases.push("nottingham forest", "nottingham");
  if (nTarget === "wolves") aliases.push("wolverhampton wanderers", "wolverhampton");
  if (nTarget === "sheff utd") aliases.push("sheffield united");

  let best: { id: number; score: number } | null = null;
  for (const t of teams) {
    const candidates = [t.name, t.shortName, t.tla].filter(Boolean) as string[];
    let score = 0;
    for (const c of candidates) {
      const n = normalize(c);
      for (const alias of aliases) {
        if (n === alias) score = Math.max(score, 10);
        else if (alias.length > 3 && (n.includes(alias) || alias.includes(n))) score = Math.max(score, 6);
      }
    }
    if (!best || score > best.score) best = { id: t.id, score };
  }

  const id = best && best.score >= 6 ? best.id : null;
  if (id) await writeCachedJson("football-data", cacheKey, id, ttlMs);
  return id;
}

export async function getTeamMatches(
  teamId: number,
  dateFrom: Date,
  dateTo: Date,
  ttlMs: number = 1000 * 60 * 30 // 30m
): Promise<FootballDataMatch[] | null> {
  if (!requireFdToken()) return null;

  const from = yyyyMmDd(dateFrom);
  const to = yyyyMmDd(dateTo);
  const cacheKey = `team_matches_${teamId}_${from}_${to}`;
  const cached = await readCachedJson<FootballDataMatch[]>("football-data", cacheKey);
  if (cached.hit) return cached.value;

  const data = await fdFetchJson<{ matches: FootballDataMatch[] }>(
    `/teams/${teamId}/matches?dateFrom=${encodeURIComponent(from)}&dateTo=${encodeURIComponent(to)}`
  );
  const matches = data.matches || [];
  await writeCachedJson("football-data", cacheKey, matches, ttlMs);
  return matches;
}

