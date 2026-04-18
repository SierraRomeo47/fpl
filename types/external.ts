export type ExternalSource = "understat" | "fotmob" | "sportsdb";

export interface ExternalCacheMeta {
  source: ExternalSource;
  key: string;
  fetchedAt: number; // epoch ms
  ttlMs: number;
  expiresAt: number; // epoch ms
}

export interface UnderstatPlayerStats {
  playerId?: string | number;
  playerName: string;
  teamName?: string;
  season?: number;
  // Common Understat fields (strings in many dumps; normalize to number where possible)
  games?: number;
  minutes?: number;
  goals?: number;
  assists?: number;
  xG?: number;
  xA?: number;
  xG90?: number;
  xA90?: number;
  shots?: number;
  keyPasses?: number;
  npxG?: number;
  npxG90?: number;
}

export interface FotMobSearchPlayer {
  id: number;
  name: string;
  team?: string;
  position?: string;
}

export interface FotMobPlayerData {
  id: number;
  name?: string;
  /** Resolved headshot when present in FotMob JSON */
  imageUrl?: string;
  // We keep this loosely typed because FotMob responses are large and unstable.
  raw: unknown;
}

export interface SportsDBTeamInfo {
  idTeam?: string;
  strTeam?: string;
  strTeamShort?: string;
  strLeague?: string;
  strCountry?: string;
  strTeamBadge?: string;
  strTeamLogo?: string;
  strWebsite?: string;
  raw: unknown;
}

export interface EnrichedPlayerData {
  player: {
    fplId: number;
    webName: string;
    fullName?: string;
    teamId?: number;
    teamName?: string;
  };
  sources: {
    understat?: UnderstatPlayerStats | null;
    fotmob?: FotMobPlayerData | null;
    sportsdb?: SportsDBTeamInfo | null;
  };
  facts?: {
    loadRisk?: {
      level: "low" | "medium" | "high";
      score: number;
      reason: string;
      windowDays: number;
      matchCount: number;
      nonPlMatchCount: number;
      minRestDays: number | null;
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
    } | null;
  };
  meta: {
    generatedAt: number;
    // Which sources were attempted and whether they succeeded
    attempted: Record<ExternalSource, boolean>;
  };
}

