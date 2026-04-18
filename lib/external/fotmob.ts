import { readCachedJson, writeCachedJson } from "./cache";
import type { FotMobPlayerData, FotMobSearchPlayer } from "@/types/external";

const FOTMOB_BASE = "https://www.fotmob.com/api";

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fotmobSearchPlayers(
  term: string,
  ttlMs: number = 1000 * 60 * 60 * 24 // 24h
): Promise<FotMobSearchPlayer[]> {
  const cacheKey = `search_${term}`;
  const cached = await readCachedJson<FotMobSearchPlayer[]>("fotmob", cacheKey);
  if (cached.hit) return cached.value;

  const url = `${FOTMOB_BASE}/search?term=${encodeURIComponent(term)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  let data: any;
  try {
    data = await res.json();
  } catch {
    // FotMob sometimes serves HTML to non-browser clients; treat as no results.
    return [];
  }

  // FotMob search response shape varies; support common patterns.
  const players: any[] =
    data?.players ||
    data?.result?.players ||
    data?.data?.players ||
    [];

  const mapped: FotMobSearchPlayer[] = (players || [])
    .map((p: any) => ({
      id: Number(p.id ?? p.playerId ?? p?.item?.id),
      name: String(p.name ?? p?.item?.name ?? ""),
      team: p.teamName ?? p.team ?? p?.item?.teamName,
      position: p.position ?? p?.item?.position,
    }))
    .filter((p: FotMobSearchPlayer) => Number.isFinite(p.id) && !!p.name);

  await writeCachedJson("fotmob", cacheKey, mapped, ttlMs);
  return mapped;
}

async function fotmobSearchPlayersViaBrowser(term: string): Promise<FotMobSearchPlayer[]> {
  // Browser fallback: when direct API search is blocked, let the website load and
  // intercept JSON responses produced by the app.
  const puppeteer = (await import("puppeteer")).default;
  const url = `https://www.fotmob.com/search?term=${encodeURIComponent(term)}`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    let found: FotMobSearchPlayer[] = [];

    const looksLikePlayer = (o: any) =>
      o &&
      (typeof o.id === "number" || typeof o.id === "string") &&
      typeof o.name === "string" &&
      o.name.length > 0;

    const extractPlayers = (node: any, depth: number = 0): FotMobSearchPlayer[] => {
      if (!node || depth > 6) return [];
      if (Array.isArray(node)) {
        if (node.length > 0 && node.every(looksLikePlayer)) {
          return node.map((p: any) => ({
            id: Number(p.id),
            name: String(p.name),
            team: p.teamName ?? p.team,
            position: p.position,
          }));
        }
        for (const it of node) {
          const res = extractPlayers(it, depth + 1);
          if (res.length) return res;
        }
        return [];
      }
      if (typeof node === "object") {
        if (Array.isArray((node as any).players)) {
          const ps = (node as any).players;
          if (ps.length > 0 && ps.every(looksLikePlayer)) {
            return ps.map((p: any) => ({
              id: Number(p.id),
              name: String(p.name),
              team: p.teamName ?? p.team,
              position: p.position,
            }));
          }
        }
        for (const v of Object.values(node)) {
          const res = extractPlayers(v, depth + 1);
          if (res.length) return res;
        }
      }
      return [];
    };

    page.on("response", async (res) => {
      if (found.length) return;
      const ct = res.headers()["content-type"] || "";
      if (!ct.includes("application/json")) return;
      try {
        const json = await res.json();
        const players = extractPlayers(json);
        if (players.length) found = players;
      } catch {
        // ignore
      }
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
    await new Promise((r) => setTimeout(r, 1500));

    return found;
  } finally {
    await browser.close();
  }
}

export async function resolveFotmobPlayerId(
  playerName: string,
  teamName?: string
): Promise<number | null> {
  const term = playerName;
  // Try direct API first; if blocked, fall back to browser scrape.
  let candidates = await fotmobSearchPlayers(term);
  if (candidates.length === 0 && process.env.NODE_ENV !== "production") {
    candidates = await fotmobSearchPlayersViaBrowser(term);
  }
  if (candidates.length === 0) return null;

  const nName = normalize(playerName);
  const nTeam = teamName ? normalize(teamName) : null;

  // Score by name similarity and optional team match.
  let best: { id: number; score: number } | null = null;
  for (const c of candidates) {
    const cName = normalize(c.name);
    const cTeam = c.team ? normalize(c.team) : "";

    let score = 0;
    if (cName === nName) score += 10;
    if (cName.includes(nName) || nName.includes(cName)) score += 4;

    if (nTeam) {
      if (cTeam === nTeam) score += 6;
      else if (cTeam.includes(nTeam) || nTeam.includes(cTeam)) score += 2;
    }

    if (!best || score > best.score) best = { id: c.id, score };
  }

  if (!best || best.score < 4) return null;
  return best.id;
}

/** Best-effort headshot URL from FotMob playerData JSON (schema varies). */
export function extractFotmobPlayerImageUrl(raw: unknown): string | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const candidates: unknown[] = [
    r.imageUrl,
    (r as any)?.playerData?.imageUrl,
    (r as any)?.general?.imageUrl,
    (r as any)?.headshot,
    (r as any)?.headshotImageUrl,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && /^https?:\/\//i.test(c)) return c;
  }
  return undefined;
}

export async function getFotmobPlayerData(
  fotmobPlayerId: number,
  ttlMs: number = 1000 * 60 * 30 // 30m
): Promise<FotMobPlayerData | null> {
  const cacheKey = `player_${fotmobPlayerId}`;
  const cached = await readCachedJson<FotMobPlayerData>("fotmob", cacheKey);
  if (cached.hit) return cached.value;

  // FotMob endpoints are inconsistent in casing; try both.
  const urls = [
    `${FOTMOB_BASE}/playerData?id=${fotmobPlayerId}`,
    `${FOTMOB_BASE}/playerdata?id=${fotmobPlayerId}`,
  ];

  for (const url of urls) {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) continue;
    const raw = await res.json();
    const imageUrl = extractFotmobPlayerImageUrl(raw);
    const value: FotMobPlayerData = {
      id: fotmobPlayerId,
      name: (raw as any)?.name,
      ...(imageUrl ? { imageUrl } : {}),
      raw,
    };
    await writeCachedJson("fotmob", cacheKey, value, ttlMs);
    return value;
  }

  return null;
}

