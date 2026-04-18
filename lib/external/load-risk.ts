import type { FootballDataMatch } from "./football-data";

export type LoadRiskLevel = "low" | "medium" | "high";

export interface LoadRiskResult {
  level: LoadRiskLevel;
  score: number; // 0..100
  windowDays: number;
  matchCount: number;
  minRestDays: number | null;
  nonPlMatchCount: number;
  dateFrom: string; // ISO
  dateTo: string; // ISO
  reason: string;
  provenance: {
    provider: "football-data.org";
    teamId: number;
    evaluatedAt: number;
    sample: Array<{
      id: number;
      utcDate: string;
      competitionCode?: string;
      competitionName: string;
      home: string;
      away: string;
    }>;
  };
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export function computeLoadRisk(
  teamId: number,
  matches: FootballDataMatch[],
  opts: { windowDays: number; excludeCompetitionCode?: string } = {
    windowDays: 14,
    excludeCompetitionCode: "PL",
  }
): LoadRiskResult {
  const now = new Date();
  const dateFrom = new Date(now);
  const dateTo = new Date(now);
  dateTo.setUTCDate(dateTo.getUTCDate() + opts.windowDays);

  const windowMatches = matches
    .map((m) => ({ ...m, _d: new Date(m.utcDate) as any }))
    .filter((m: any) => m._d >= dateFrom && m._d <= dateTo)
    .sort((a: any, b: any) => a._d.getTime() - b._d.getTime()) as any[];

  const nonPl = windowMatches.filter(
    (m: any) => (m.competition?.code || "").toUpperCase() !== (opts.excludeCompetitionCode || "").toUpperCase()
  );

  let minRestDays: number | null = null;
  for (let i = 1; i < windowMatches.length; i++) {
    const rest = daysBetween(windowMatches[i - 1]._d, windowMatches[i]._d);
    if (minRestDays === null || rest < minRestDays) minRestDays = rest;
  }

  // Heuristic scoring:
  // - quantity in next 14 days is primary
  // - minimum rest days is secondary
  const count = windowMatches.length;
  const nonPlCount = nonPl.length;

  let score = 0;
  // Volume
  if (count >= 5) score += 75;
  else if (count === 4) score += 60;
  else if (count === 3) score += 40;
  else if (count === 2) score += 20;
  else score += 5;

  // Rest
  if (minRestDays !== null) {
    if (minRestDays <= 2) score += 25;
    else if (minRestDays === 3) score += 15;
    else if (minRestDays === 4) score += 8;
  }

  // Extra emphasis when non-PL congestion is present
  if (nonPlCount >= 2) score += 10;

  score = Math.max(0, Math.min(100, score));

  let level: LoadRiskLevel = "low";
  if (score >= 70) level = "high";
  else if (score >= 40) level = "medium";

  const reasonParts = [
    `${count} matches in next ${opts.windowDays} days`,
    nonPlCount > 0 ? `${nonPlCount} non-PL` : "no non-PL",
    minRestDays !== null ? `min rest ${minRestDays}d` : "min rest n/a",
  ];

  return {
    level,
    score,
    windowDays: opts.windowDays,
    matchCount: count,
    minRestDays,
    nonPlMatchCount: nonPlCount,
    dateFrom: dateFrom.toISOString(),
    dateTo: dateTo.toISOString(),
    // Avoid special characters that sometimes render poorly in Windows console / logs
    reason: reasonParts.join(" | "),
    provenance: {
      provider: "football-data.org",
      teamId,
      evaluatedAt: Date.now(),
      sample: windowMatches.slice(0, 8).map((m: any) => ({
        id: m.id,
        utcDate: m.utcDate,
        competitionCode: m.competition?.code,
        competitionName: m.competition?.name,
        home: m.homeTeam?.name,
        away: m.awayTeam?.name,
      })),
    },
  };
}

