import { NextRequest, NextResponse } from "next/server";
import { FPL_BASE_URL } from "@/lib/fpl-client";
import type { EnrichedPlayerData } from "@/types/external";
import { getUnderstatPlayerStatsByTeam } from "@/lib/external/understat";
import { getFotmobPlayerData, resolveFotmobPlayerId } from "@/lib/external/fotmob";
import { getSportsDbTeamInfo } from "@/lib/external/sportsdb";
import { readCachedJson, writeCachedJson } from "@/lib/external/cache";
import { getFotmobIdForFplId } from "@/lib/external/mappings";
import { resolveFootballDataTeamIdByPlTeamName, getTeamMatches } from "@/lib/external/football-data";
import { computeLoadRisk } from "@/lib/external/load-risk";

async function getBootstrapStaticCached() {
  // Cache bootstrap-static for 30 minutes (safe + reduces load)
  const cacheKey = "bootstrap-static";
  const cached = await readCachedJson<any>("fpl", cacheKey);
  if (cached.hit) return cached.value;

  const res = await fetch(`${FPL_BASE_URL}/bootstrap-static/`, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`FPL bootstrap-static failed: ${res.status}`);
  const data = await res.json();
  await writeCachedJson("fpl", cacheKey, data, 1000 * 60 * 30);
  return data;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    const { playerId } = await params;
    const fplId = Number(playerId);
    if (!Number.isFinite(fplId)) {
      return NextResponse.json({ error: "Invalid playerId" }, { status: 400 });
    }

    const bootstrap = await getBootstrapStaticCached();
    const player = (bootstrap?.elements || []).find((e: any) => Number(e.id) === fplId);
    if (!player) {
      return NextResponse.json({ error: "Player not found in bootstrap-static" }, { status: 404 });
    }

    const team = (bootstrap?.teams || []).find((t: any) => Number(t.id) === Number(player.team));
    const teamName = team?.name;

    const fullName = `${player.first_name || ""} ${player.second_name || ""}`.trim();
    const webName = String(player.web_name || fullName || `#${fplId}`);

    // Season selection: Understat uses start-year (e.g., 2025 for 2025/26)
    const season = Number(process.env.UNDERSTAT_SEASON) || new Date().getFullYear() - 1;

    // Resolve FotMob ID:
    // 1) explicit query param (?fotmobId=123)
    // 2) local mapping store (cache/mappings/fotmob.json)
    // 3) best-effort search (may be blocked; kept as fallback)
    const url = new URL(req.url);
    const fotmobIdParam = url.searchParams.get("fotmobId");
    const fotmobId =
      (fotmobIdParam ? Number(fotmobIdParam) : null) ||
      (await getFotmobIdForFplId(fplId)) ||
      (await resolveFotmobPlayerId(webName, teamName));

    const [understat, fotmob, sportsdb] = await Promise.all([
      teamName ? getUnderstatPlayerStatsByTeam(fullName || webName, teamName, season) : null,
      fotmobId ? getFotmobPlayerData(fotmobId) : null,
      teamName ? getSportsDbTeamInfo(teamName) : null,
    ]);

    // Load risk (fixture congestion across non-PL competitions via football-data.org)
    let loadRisk: EnrichedPlayerData["facts"] extends { loadRisk?: infer T } ? T : any = null;
    try {
      if (teamName && process.env.FOOTBALL_DATA_API_KEY) {
        const fdTeamId = await resolveFootballDataTeamIdByPlTeamName(teamName);
        if (fdTeamId) {
          const now = new Date();
          const to = new Date();
          to.setUTCDate(to.getUTCDate() + 21);
          const matches = (await getTeamMatches(fdTeamId, now, to)) || [];
          // Compute risk for 14-day window, emphasize non-PL congestion
          loadRisk = computeLoadRisk(fdTeamId, matches, { windowDays: 14, excludeCompetitionCode: "PL" });
        }
      }
    } catch {
      // Non-fatal: keep null
    }

    const payload: EnrichedPlayerData = {
      player: {
        fplId,
        webName,
        fullName: fullName || undefined,
        teamId: player.team,
        teamName,
      },
      sources: {
        understat: understat ?? null,
        fotmob: fotmob ?? null,
        sportsdb: sportsdb ?? null,
      },
      facts: {
        loadRisk: loadRisk ?? null,
      },
      meta: {
        generatedAt: Date.now(),
        attempted: {
          understat: !!teamName,
          fotmob: true,
          sportsdb: !!teamName,
        },
      },
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error: any) {
    console.error("[Enriched Player API] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to build enriched player data" },
      { status: 500 }
    );
  }
}

