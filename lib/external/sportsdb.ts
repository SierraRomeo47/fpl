import { readCachedJson, writeCachedJson } from "./cache";
import type { SportsDBTeamInfo } from "@/types/external";

function getSportsDbKey() {
  // TheSportsDB free test key is commonly "123". Allow override via env.
  return process.env.SPORTSDB_API_KEY || "123";
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function getSportsDbTeamInfo(
  teamName: string,
  ttlMs: number = 1000 * 60 * 60 * 24 * 7 // 7d
): Promise<SportsDBTeamInfo | null> {
  const key = getSportsDbKey();
  const cacheKey = `team_${teamName}`;
  const cached = await readCachedJson<SportsDBTeamInfo>("sportsdb", cacheKey);
  if (cached.hit) return cached.value;

  const url = `https://www.thesportsdb.com/api/v1/json/${encodeURIComponent(
    key
  )}/searchteams.php?t=${encodeURIComponent(teamName)}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) return null;
  const raw: any = await res.json();
  const teams: any[] = raw?.teams || [];
  if (teams.length === 0) return null;

  // Prefer exact-ish match when multiple.
  const nTarget = normalize(teamName);
  const chosen =
    teams.find((t: any) => normalize(t.strTeam || "") === nTarget) || teams[0];

  const value: SportsDBTeamInfo = {
    idTeam: chosen.idTeam,
    strTeam: chosen.strTeam,
    strTeamShort: chosen.strTeamShort,
    strLeague: chosen.strLeague,
    strCountry: chosen.strCountry,
    strTeamBadge: chosen.strTeamBadge,
    strTeamLogo: chosen.strTeamLogo,
    strWebsite: chosen.strWebsite,
    raw,
  };

  await writeCachedJson("sportsdb", cacheKey, value, ttlMs);
  return value;
}

