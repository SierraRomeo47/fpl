/**
 * FPL /event/{gw}/live/ helpers — per-fixture point breakdowns from "explain" arrays.
 */

export type LiveExplainStat = {
    identifier: string;
    points?: number;
    value?: number;
    points_deductions?: number;
};

export type LiveExplainBlock = {
    fixture: number;
    stats: LiveExplainStat[];
};

export type LiveElementRow = {
    id: number;
    /** Total GW points for this player (before captain multiplier on a pick). */
    points?: number;
    stats?: Record<string, number>;
    explain?: LiveExplainBlock[] | null;
};

/** Normalise "elements" — FPL can return a dict keyed by id or an array. */
export function normaliseLiveElementMap(
    livePayload: { elements?: unknown } | null
): Map<number, LiveElementRow> {
    const out = new Map<number, LiveElementRow>();
    if (!livePayload?.elements) return out;
    const raw = livePayload.elements as any;
    if (Array.isArray(raw)) {
        for (const el of raw) {
            if (el && typeof el.id === 'number') {
                out.set(el.id, el as LiveElementRow);
            }
        }
    } else if (typeof raw === 'object' && raw !== null) {
        for (const [k, v] of Object.entries(raw)) {
            const id = Number(k);
            if (!Number.isFinite(id) || !v) continue;
            const row = v as LiveElementRow;
            if (!row.id) (row as any).id = id;
            out.set(id, row);
        }
    }
    return out;
}

const STAT_LABEL: Record<string, string> = {
    minutes: 'Minutes played',
    goals: 'Goals',
    goals_conceded: 'Goals conceded',
    assists: 'Assists',
    clean_sheets: 'Clean sheet',
    saves: 'Saves (GK)',
    own_goals: 'Own goal',
    penalties_conceded: 'Penalty conceded (GK)',
    penalties_missed: 'Penalties missed',
    pen_goals: 'Penalties scored (GK)',
    yellow_cards: 'Yellow cards',
    red_cards: 'Red cards',
    bps: 'BPS (system)',
    bonus: 'FPL bonus',
    in_dreamteam: 'Dream team',
    clearances_blocks_interceptions: 'C/B/I',
    penalties_scored: 'Penalties (scored)',
    penalties_saved: 'Pen save',
    influence: 'Influence (ICT fragment)',
    creativity: 'Creativity (ICT fragment)',
    threat: 'Threat (ICT fragment)',
    ict_index: 'ICT',
};

export function labelStatId(id: string): string {
    if (id in STAT_LABEL) return STAT_LABEL[id] as string;
    return id
        .replace(/_/g, ' ')
        .replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * For one player / one FPL fixture id, sum the explain stat line points
 * and return a printable breakdown.
 */
export function pointsForFixtureBlock(
    explain: LiveExplainBlock[] | null | undefined,
    fixtureFplId: number
): { total: number; lines: { label: string; value: string; points: number }[] } {
    if (!explain?.length) {
        return { total: 0, lines: [] };
    }
    const block = explain.find((b) => b.fixture === fixtureFplId);
    if (!block?.stats?.length) {
        return { total: 0, lines: [] };
    }
    const lines: { label: string; value: string; points: number }[] = [];
    let total = 0;
    for (const s of block.stats) {
        const rawPts = Number(s.points ?? 0);
        const ded = Number(s.points_deductions ?? 0);
        const net = rawPts - ded;
        total += net;
        const val =
            s.value != null
                ? Number.isInteger(s.value)
                    ? String(s.value)
                    : String(s.value)
                : '—';
        lines.push({
            label: labelStatId(s.identifier),
            value: val,
            points: net,
        });
    }
    return { total, lines };
}

/** Raw FPL explain values for one player in one fixture (for table columns). */
export type FixtureStatSnapshot = {
    minutes: number | null;
    goals: number | null;
    assists: number | null;
    cleanSheets: number | null;
    goalsConceded: number | null;
    saves: number | null;
    yellowCards: number | null;
    redCards: number | null;
    bps: number | null;
    bonus: number | null;
    clearancesBlocksInterceptions: number | null;
};

function readStatValue(stats: LiveExplainStat[], identifier: string): number | null {
    const s = stats.find((x) => x.identifier === identifier);
    if (!s || s.value == null || s.value === undefined) return null;
    const n = Number(s.value);
    return Number.isFinite(n) ? n : null;
}

/**
 * Pull common explain fields for display columns. Returns null if no block for this fixture.
 */
export function extractFixtureStatsFromExplain(
    explain: LiveExplainBlock[] | null | undefined,
    fixtureFplId: number
): FixtureStatSnapshot | null {
    if (!explain?.length) return null;
    const block = explain.find((b) => b.fixture === fixtureFplId);
    if (!block?.stats?.length) return null;
    const st = block.stats;
    return {
        minutes: readStatValue(st, 'minutes'),
        goals: readStatValue(st, 'goals'),
        assists: readStatValue(st, 'assists'),
        cleanSheets: readStatValue(st, 'clean_sheets'),
        goalsConceded: readStatValue(st, 'goals_conceded'),
        saves: readStatValue(st, 'saves'),
        yellowCards: readStatValue(st, 'yellow_cards'),
        redCards: readStatValue(st, 'red_cards'),
        bps: readStatValue(st, 'bps'),
        bonus: readStatValue(st, 'bonus'),
        clearancesBlocksInterceptions: readStatValue(st, 'clearances_blocks_interceptions'),
    };
}

const AGG_KEY: Partial<Record<string, keyof FixtureStatSnapshot>> = {
    minutes: 'minutes',
    goals: 'goals',
    /** Outfield penalty goals often appear as a separate explain line from regular goals. */
    penalties_scored: 'goals',
    assists: 'assists',
    clean_sheets: 'cleanSheets',
    goals_conceded: 'goalsConceded',
    saves: 'saves',
    yellow_cards: 'yellowCards',
    red_cards: 'redCards',
    bps: 'bps',
    bonus: 'bonus',
    clearances_blocks_interceptions: 'clearancesBlocksInterceptions',
};

function emptySnapshot(): FixtureStatSnapshot {
    return {
        minutes: null,
        goals: null,
        assists: null,
        cleanSheets: null,
        goalsConceded: null,
        saves: null,
        yellowCards: null,
        redCards: null,
        bps: null,
        bonus: null,
        clearancesBlocksInterceptions: null,
    };
}

/**
 * Sum FPL points and counting stats across every fixture block in this gameweek (handles double gameweeks).
 */
export function aggregateGwStatsFromExplain(explain: LiveExplainBlock[] | null | undefined): {
    totalPoints: number;
    stats: FixtureStatSnapshot;
} {
    let totalPoints = 0;
    const sums: Partial<Record<keyof FixtureStatSnapshot, number>> = {};
    if (!explain?.length) {
        return { totalPoints: 0, stats: emptySnapshot() };
    }
    for (const block of explain) {
        if (!block.stats?.length) continue;
        for (const s of block.stats) {
            const rawPts = Number(s.points ?? 0);
            const ded = Number(s.points_deductions ?? 0);
            const netPts = rawPts - ded;
            totalPoints += netPts;
            const key = AGG_KEY[s.identifier];
            if (!key) continue;
            if (s.value != null && s.value !== undefined) {
                const n = Number(s.value);
                if (Number.isFinite(n)) {
                    sums[key] = (sums[key] ?? 0) + n;
                }
                continue;
            }
            /** FPL sometimes omits `value` on a goals line but still awards points (count as 1 goal). */
            if (s.identifier === 'goals' && netPts !== 0) {
                sums[key] = (sums[key] ?? 0) + 1;
            }
        }
    }
    const stats = emptySnapshot();
    (Object.keys(sums) as (keyof FixtureStatSnapshot)[]).forEach((k) => {
        const v = sums[k];
        if (v !== undefined) stats[k] = v;
    });
    return { totalPoints, stats };
}

/** Base GW points from live row: prefer API `points`, else sum of explain. */
export function baseGwPointsFromLiveRow(row: LiveElementRow | undefined): number {
    if (!row) return 0;
    if (typeof row.points === 'number' && Number.isFinite(row.points)) return row.points;
    return aggregateGwStatsFromExplain(row.explain).totalPoints;
}

export function formatStatCell(v: number | null | undefined): string {
    if (v == null || Number.isNaN(v)) return '—';
    return String(v);
}

/** Counting stats in squad tables: show 0 instead of an em dash when the value is missing after merge. */
export function formatStatCellCount(v: number | null | undefined): string {
    if (v == null || Number.isNaN(v)) return '0';
    return String(v);
}

/**
 * `/event/{gw}/live/` elements include a rolled-up `stats` object (e.g. `goals_scored`) that can be
 * more reliable than summing `explain` lines (which may omit `value` on some rows).
 */
export function mergeTopLevelLiveStatsIntoSnapshot(
    row: LiveElementRow | undefined,
    base: FixtureStatSnapshot
): FixtureStatSnapshot {
    const s = row?.stats;
    if (!s || typeof s !== 'object') return base;
    const raw = s as Record<string, unknown>;
    const num = (k: string): number | undefined => {
        const v = raw[k];
        if (v == null) return undefined;
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
    };
    if (Object.keys(raw).length === 0) return base;

    const out: FixtureStatSnapshot = { ...base };
    const setIf = (snapKey: keyof FixtureStatSnapshot, ...keys: string[]) => {
        for (const k of keys) {
            const v = num(k);
            if (v !== undefined) {
                out[snapKey] = v;
                return;
            }
        }
    };
    setIf('minutes', 'minutes');
    setIf('goals', 'goals_scored');
    setIf('assists', 'assists');
    setIf('cleanSheets', 'clean_sheets');
    setIf('goalsConceded', 'goals_conceded');
    setIf('saves', 'saves');
    setIf('yellowCards', 'yellow_cards');
    setIf('redCards', 'red_cards');
    setIf('bps', 'bps');
    setIf('bonus', 'bonus');
    setIf('clearancesBlocksInterceptions', 'clearances_blocks_interceptions');
    return out;
}

/** Full GW stat snapshot for one player: explain aggregate + top-level live `stats` overlay. */
export function gwStatsForLiveElement(row: LiveElementRow | undefined): FixtureStatSnapshot {
    const fromExplain = aggregateGwStatsFromExplain(row?.explain).stats;
    return mergeTopLevelLiveStatsIntoSnapshot(row, fromExplain);
}

/** Human-readable label for `picks.active_chip` (wildcard, bench_boost, etc.). */
export function formatActiveChipLabel(chip: string | null | undefined): string {
    if (chip == null || chip === '') return '';
    const c = String(chip).toLowerCase().trim();
    if (c === '3xc' || c === 'triple_captain') return 'Triple Captain';
    if (c === 'wildcard') return 'Wild Card';
    if (c === 'freehit' || c === 'free_hit') return 'Free Hit';
    if (c === 'bboost' || c === 'bench_boost') return 'Bench Boost';
    return String(chip).replace(/_/g, ' ');
}

export const POS_SHORT: Record<number, string> = {
    1: 'GK',
    2: 'DEF',
    3: 'MID',
    4: 'FWD',
};

export type PlayerProfile = {
    id: number;
    web_name: string;
    element_type: number;
    team: number;
};
