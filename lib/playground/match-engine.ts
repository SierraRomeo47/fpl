/**
 * Pencil-cricket style mini-match: seeded RNG, lane-based chances, FPL bootstrap stats only.
 */

export type MatchEventType = 'kickoff' | 'chance' | 'goal' | 'save' | 'miss' | 'whistle';

export type MatchEvent = {
    minute: number;
    type: MatchEventType;
    description: string;
    playerId?: number;
    playerName?: string;
    lane: number;
    side: 'home' | 'away';
};

export type MatchResult = {
    homeGoals: number;
    awayGoals: number;
    events: MatchEvent[];
    mvpPlayerId: number | null;
    seed: number;
};

function hashSquads(homeIds: number[]): number {
    const s = homeIds.slice().sort((a, b) => a - b).join(',');
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

/** Mulberry32 PRNG */
function mulberry32(seed: number) {
    return function rand() {
        let t = (seed += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export type SimPlayer = {
    id: number;
    web_name?: string;
    element_type: number;
    form?: string | number;
    ep_next?: string | number;
    ict_index?: string | number;
    threat?: string | number;
    influence?: string | number;
    creativity?: string | number;
    saves?: number;
    clean_sheets?: number;
};

const LANE_DEF = 0;
const LANE_MID = 1;
const LANE_FWD = 2;

/** Map 5 foosball-style lanes to broad positions on an XI (ordered 1–11). */
function laneToPool(
    lane: number,
    xi: SimPlayer[]
): SimPlayer[] {
    const gk = xi.filter((p) => p.element_type === 1);
    const def = xi.filter((p) => p.element_type === 2);
    const mid = xi.filter((p) => p.element_type === 3);
    const fwd = xi.filter((p) => p.element_type === 4);
    switch (lane) {
        case 0:
            return gk.length ? gk : xi;
        case 1:
            return def.length ? def : xi;
        case 2:
            return def.length > 2 ? def.slice(0, Math.max(1, def.length - 1)) : def;
        case 3:
            return mid.length ? mid : xi;
        case 4:
            return fwd.length ? fwd : mid.length ? mid : xi;
        default:
            return xi;
    }
}

function pickWeighted(rand: () => number, players: SimPlayer[]): SimPlayer | null {
    if (!players.length) return null;
    const weights = players.map((p) => {
        const form = Number.parseFloat(String(p.form)) || 0;
        const ep = Number.parseFloat(String(p.ep_next)) || 0;
        const ict = Number.parseFloat(String(p.ict_index)) || 0;
        return Math.max(0.1, form * 1.2 + ep * 2 + ict * 0.05);
    });
    const sum = weights.reduce((a, b) => a + b, 0);
    let r = rand() * sum;
    for (let i = 0; i < players.length; i++) {
        r -= weights[i];
        if (r <= 0) return players[i];
    }
    return players[players.length - 1];
}

function attackScore(p: SimPlayer): number {
    const form = Number.parseFloat(String(p.form)) || 0;
    const ep = Number.parseFloat(String(p.ep_next)) || 0;
    const thr = Number.parseFloat(String(p.threat)) || 0;
    const cre = Number.parseFloat(String(p.creativity)) || 0;
    const inf = Number.parseFloat(String(p.influence)) || 0;
    const et = p.element_type;
    let base = form * 1.4 + ep * 2 + thr * 0.02 + cre * 0.01 + inf * 0.01;
    if (et === 4) base *= 1.15;
    if (et === 1) base *= 0.35;
    if (et === 2) base *= 0.85;
    return base;
}

function defenseScore(p: SimPlayer): number {
    const inf = Number.parseFloat(String(p.influence)) || 0;
    const cs = Number(p.clean_sheets) || 0;
    const sv = Number(p.saves) || 0;
    const et = p.element_type;
    let base = inf * 0.03 + cs * 0.08 + sv * 0.02;
    if (et === 1) base += 2.5;
    if (et === 2) base += 1.2;
    if (et === 3) base += 0.5;
    return base;
}

/** Composite “league-average” opponent strength 0..1 */
function leagueAverageBlock(rand: () => number, lane: number): number {
    const jitter = (rand() - 0.5) * 0.08;
    const base = lane === LANE_FWD ? 0.42 : lane === LANE_MID ? 0.48 : 0.52;
    return Math.min(0.72, Math.max(0.28, base + jitter));
}

/** Optional multipliers for the pencil-cricket roll (defaults preserve original behaviour). */
export type SimTuning = {
    /** Scales attacking strength in the chance roll (>1 = more goals on average). */
    attackBias?: number;
    /** Scales defending strength in thresholds (>1 = harder to score). */
    defenseBias?: number;
};

export type SimulateMatchInput = {
    homeXi: SimPlayer[];
    awayXi: SimPlayer[];
    entryId: number;
    gameweek: number;
    tuning?: SimTuning;
};

/**
 * Run a short fictional match. `homeXi` / `awayXi` should be length ≤ 11 (starting XI).
 */
export function simulateMatch(input: SimulateMatchInput): MatchResult {
    const { homeXi, awayXi, entryId, gameweek, tuning } = input;
    const attackBias = tuning?.attackBias ?? 1;
    const defenseBias = tuning?.defenseBias ?? 1;
    const ids = homeXi.map((p) => p.id);
    const seed = (hashSquads(ids) ^ (entryId * 1009) ^ (gameweek * 9176)) >>> 0;
    const rand = mulberry32(seed);

    const events: MatchEvent[] = [];
    let homeGoals = 0;
    let awayGoals = 0;
    const goalCounts = new Map<number, number>();

    events.push({
        minute: 0,
        type: 'kickoff',
        description: 'Kick-off — playground sim (not real FPL scores).',
        lane: 2,
        side: 'home',
    });

    const chances = 10 + Math.floor(rand() * 4);

    for (let i = 0; i < chances; i++) {
        const minute = 5 + Math.floor(rand() * 85);
        const homeAttacks = rand() > 0.45;
        const side = homeAttacks ? 'home' : 'away';
        const xi = homeAttacks ? homeXi : awayXi;
        const opp = homeAttacks ? awayXi : homeXi;
        if (!xi.length) continue;

        const lane = Math.floor(rand() * 5);
        const pool = laneToPool(lane, xi);
        const actor = pickWeighted(rand, pool);
        if (!actor) continue;

        const atk = attackScore(actor) * attackBias;
        const defPool =
            lane <= 1
                ? opp.filter((p) => p.element_type === 1 || p.element_type === 2)
                : lane <= 3
                  ? opp.filter((p) => p.element_type <= 3)
                  : opp;
        const defender = pickWeighted(rand, defPool.length ? defPool : opp) ?? opp[0];
        const def =
            (defenseScore(defender) / 8 + leagueAverageBlock(rand, Math.min(2, lane % 3))) * defenseBias;

        const roll = rand() * Math.max(2.5, atk + def);
        const thresholdGoal = def * 0.55;
        const thresholdSave = def * 1.1;

        let type: MatchEventType = 'miss';
        let description = `${actor.web_name || 'Player'} misses from distance.`;

        if (roll > thresholdGoal + 0.35) {
            type = 'goal';
            if (side === 'home') homeGoals++;
            else awayGoals++;
            goalCounts.set(actor.id, (goalCounts.get(actor.id) || 0) + 1);
            description = `GOAL — ${actor.web_name || 'Player'} (${side === 'home' ? 'You' : 'Opponent'})`;
        } else if (roll > thresholdSave) {
            type = 'save';
            description = `${defender.web_name || 'Keeper'} saves from ${actor.web_name || 'striker'}`;
        } else {
            type = 'chance';
            description = `Chance — ${actor.web_name || 'Player'} tries from lane ${lane + 1}/5`;
        }

        events.push({
            minute,
            type,
            description,
            playerId: actor.id,
            playerName: actor.web_name,
            lane,
            side,
        });
    }

    events.push({
        minute: 90,
        type: 'whistle',
        description: `Full time — ${homeGoals}–${awayGoals}`,
        lane: 2,
        side: 'home',
    });

    let mvpPlayerId: number | null = null;
    let best = -1;
    goalCounts.forEach((g, id) => {
        if (g > best) {
            best = g;
            mvpPlayerId = id;
        }
    });

    return {
        homeGoals,
        awayGoals,
        events,
        mvpPlayerId: best > 0 ? mvpPlayerId : homeXi[0]?.id ?? null,
        seed,
    };
}
