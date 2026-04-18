/**
 * Normalized 0–1 table space real-time foosball stepper (deterministic given input + initial state).
 * Four rods per side: GK, DEF block, MID, FWD (toward centre line).
 */

import {
    elementToMenStats,
    type FoosballElement,
    type FoosballMenStats,
} from './foosball-attributes';

/** Foosball rods per side */
export const FOOSBALL_LANE_COUNT = 4;

export type FoosballLaneMen = {
    offsetsY: number[];
    stats: FoosballMenStats[];
};

export type FoosballInitConfig = {
    targetScore: 5 | 10;
    homeLanes: FoosballLaneMen[];
    awayLanes: FoosballLaneMen[];
    cpuReaction: number;
    reducedMotion: boolean;
};

export type HomeLaneMove = { lane: number; moveY: -1 | 0 | 1 };

/**
 * At most one move per home lane; two lanes can be controlled in parallel (W/S vs arrows / thumb).
 */
export type FoosballInput = {
    homeLaneMoves: readonly HomeLaneMove[];
};

export type FoosballPhase = 'play' | 'reset' | 'won';

export type RodY4 = [number, number, number, number];

export type FoosballState = {
    ball: { x: number; y: number; vx: number; vy: number };
    homeRodY: RodY4;
    awayRodY: RodY4;
    scoreHome: number;
    scoreAway: number;
    phase: FoosballPhase;
    winner: 'home' | 'away' | null;
    resetCountdown: number;
    lastScoringSide: 'home' | 'away' | null;
};

export const BALL_R = 0.016;

/** Inner play band (matches canvas field stroke); men must stay inside with rod at extremes. */
export const PITCH_Y_TOP = 0.075;
export const PITCH_Y_BOTTOM = 0.925;

/**
 * Normalized diameter for head tokens on the overlay (spacing model).
 */
export const MEN_DIAMETER_Y = 0.036;
const MEN_R_Y = MEN_DIAMETER_Y / 2;

/** Typical man hit radius (same order as `collideBallMen` rm) for spacing channels. */
const MEN_RM_NOMINAL = BALL_R * 2.2 * 1.12;

const GOAL_Y0 = 0.38;
const GOAL_Y1 = 0.62;

/**
 * Vertical slide limits — same for home and away (real foosball: each rod travels only along its
 * slot; figures stay inside the table opening).
 */
export const ROD_Y_MIN = 0.335;
export const ROD_Y_MAX = 0.665;

const GOAL_FACE_LEFT = 0.045;
const GOAL_FACE_RIGHT = 0.955;
const INNER_LEFT = 0.065;
const INNER_RIGHT = 0.935;

/** Four rod X positions evenly from `a` to `b` (three equal gaps). */
function rodBandXs4(a: number, b: number): readonly [number, number, number, number] {
    const d = (b - a) / 3;
    return [a, a + d, a + 2 * d, b] as const;
}

/**
 * Bands sit deeper into each half toward the goal mouths so GKs sit nearer their lines and
 * attacking rods do not crowd the centre (no “both forwards on the halfway line”).
 */
/** Slightly “ahead” toward halfway so GKs/defs sit deeper into the opponent half (passing room). */
const HOME_ROD_X0 = 0.095;
const HOME_ROD_X3 = 0.405;

const AWAY_ROD_X0 = 0.6;
const AWAY_ROD_X3 = 0.915;

/** Human (left): rod 0 = GK … rod 3 = FWD — equal spacing along the length of the half. */
export const HOME_ROD_X = rodBandXs4(HOME_ROD_X0, HOME_ROD_X3);

/** CPU (right): evenly spaced; rod 0 nearest halfway, rod 3 at own goal. */
export const AWAY_ROD_X = rodBandXs4(AWAY_ROD_X0, AWAY_ROD_X3);

const BASE_ROD_SPEED = 1.35;
const BASE_CPU_ROD_SPEED = 1.05;
const BALL_MAX_SPD = 1.1;
/** Open play: no air drag — ball only loses speed on walls, players, or when scored. */
const FRICTION_OPEN_PLAY = 1;
const RESTITUTION = 0.92;
const RESET_DELAY = 0.85;

function clamp(v: number, a: number, b: number) {
    return Math.max(a, Math.min(b, v));
}

function len(dx: number, dy: number) {
    return Math.hypot(dx, dy);
}

function rodTuple(mid: number): RodY4 {
    return [mid, mid, mid, mid];
}

export function createFoosballState(): FoosballState {
    const mid = (ROD_Y_MIN + ROD_Y_MAX) / 2;
    return {
        ball: { x: 0.5, y: mid, vx: 0.26, vy: 0.07 },
        homeRodY: rodTuple(mid),
        awayRodY: rodTuple(mid),
        scoreHome: 0,
        scoreAway: 0,
        phase: 'play',
        winner: null,
        resetCountdown: 0,
        lastScoringSide: null,
    };
}

function applyFriction(vx: number, vy: number, pow: number) {
    return { vx: vx * pow, vy: vy * pow };
}

function collideBallMen(
    bx: number,
    by: number,
    bvx: number,
    bvy: number,
    cx: number,
    cy: number,
    kick: number,
    rm: number
): { x: number; y: number; vx: number; vy: number } {
    const dx = bx - cx;
    const dy = by - cy;
    const dist = len(dx, dy) || 1e-6;
    const minDist = BALL_R + rm;
    if (dist >= minDist) {
        return { x: bx, y: by, vx: bvx, vy: bvy };
    }
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = minDist - dist;
    const x = bx + nx * overlap;
    const y = by + ny * overlap;
    const vn = bvx * nx + bvy * ny;
    if (vn < 0) {
        const tx = bvx - vn * nx;
        const ty = bvy - vn * ny;
        const scale = RESTITUTION * kick;
        let vnx = -vn * nx * scale + tx;
        let vny = -vn * ny * scale + ty;
        const sp = len(vnx, vny);
        const cap = BALL_MAX_SPD * (kick > 1 ? 1.05 : 1);
        if (sp > cap) {
            const f = cap / sp;
            vnx *= f;
            vny *= f;
        }
        return { x, y, vx: vnx, vy: vny };
    }
    return { x, y, vx: bvx, vy: bvy };
}

function cpuTargetY(lane: number, ballY: number, reaction: number, nLanes: number): number {
    const mid = (nLanes - 1) / 2;
    const spread = (lane - mid) * 0.045 * (0.5 + reaction);
    return clamp(
        ballY + spread + Math.sin(lane * 1.7 + ballY * 6) * 0.03 * (1 - reaction),
        ROD_Y_MIN,
        ROD_Y_MAX
    );
}

export function stepFoosball(
    cfg: FoosballInitConfig,
    state: FoosballState,
    input: FoosballInput,
    dtRaw: number,
    timeMs = 0
): FoosballState {
    const motionScale = cfg.reducedMotion ? 0.72 : 1;
    const dt = clamp(dtRaw, 0, 0.05) * motionScale;
    const L = FOOSBALL_LANE_COUNT;

    if (state.phase === 'won') {
        return state;
    }

    if (state.phase === 'reset') {
        const rc = state.resetCountdown - dt;
        if (rc <= 0) {
            const mid = (ROD_Y_MIN + ROD_Y_MAX) / 2;
            const kickToHome = state.lastScoringSide === 'away';
            return {
                ...state,
                phase: 'play',
                resetCountdown: 0,
                ball: {
                    x: 0.5,
                    y: mid,
                    vx: kickToHome ? -0.24 : 0.24,
                    vy: Math.sin((timeMs / 800) % 6.28318) * 0.09,
                },
            };
        }
        return { ...state, resetCountdown: rc };
    }

    let bx = state.ball.x;
    let by = state.ball.y;
    let bvx = state.ball.vx;
    let bvy = state.ball.vy;
    const { scoreHome: sh0, scoreAway: sa0 } = state;

    const byLane = new Map<number, number>();
    for (const m of input.homeLaneMoves) {
        const li = clamp(Math.floor(m.lane), 0, L - 1);
        const v = m.moveY;
        if (v === 0) continue;
        byLane.set(li, (byLane.get(li) ?? 0) + v);
    }
    const homeNext = [...state.homeRodY] as number[];
    for (const [li, acc] of byLane) {
        const adj = acc <= -1 ? -1 : acc >= 1 ? 1 : 0;
        if (adj === 0) continue;
        const humanSpeed = BASE_ROD_SPEED * (cfg.homeLanes[li]?.stats[0]?.rodSpeed ?? 1) * motionScale;
        const deltaRod = adj * humanSpeed * dt;
        homeNext[li] = clamp(homeNext[li] + deltaRod, ROD_Y_MIN, ROD_Y_MAX);
    }

    const cpuR = cfg.cpuReaction * BASE_CPU_ROD_SPEED * motionScale;
    const awayNext = [...state.awayRodY] as number[];
    for (let l = 0; l < L; l++) {
        const tgt = cpuTargetY(l, by, cfg.cpuReaction, L);
        const cur = awayNext[l];
        const dy = clamp(tgt - cur, -cpuR * dt * 3, cpuR * dt * 3);
        awayNext[l] = clamp(cur + dy, ROD_Y_MIN, ROD_Y_MAX);
    }

    bx += bvx * dt;
    by += bvy * dt;

    const fr = Math.pow(FRICTION_OPEN_PLAY, dt * 120);
    const v1 = applyFriction(bvx, bvy, fr);
    bvx = v1.vx;
    bvy = v1.vy;

    if (bx < GOAL_FACE_LEFT && by > GOAL_Y0 && by < GOAL_Y1) {
        const scoreAway = sa0 + 1;
        const won = scoreAway >= cfg.targetScore;
        return {
            ...state,
            scoreHome: sh0,
            scoreAway,
            ball: { x: 0.5, y: (ROD_Y_MIN + ROD_Y_MAX) / 2, vx: 0, vy: 0 },
            homeRodY: homeNext as RodY4,
            awayRodY: awayNext as RodY4,
            phase: won ? 'won' : 'reset',
            winner: won ? 'away' : null,
            resetCountdown: won ? 0 : RESET_DELAY,
            lastScoringSide: 'away',
        };
    }
    if (bx > GOAL_FACE_RIGHT && by > GOAL_Y0 && by < GOAL_Y1) {
        const scoreHome = sh0 + 1;
        const won = scoreHome >= cfg.targetScore;
        return {
            ...state,
            scoreHome,
            scoreAway: sa0,
            ball: { x: 0.5, y: (ROD_Y_MIN + ROD_Y_MAX) / 2, vx: 0, vy: 0 },
            homeRodY: homeNext as RodY4,
            awayRodY: awayNext as RodY4,
            phase: won ? 'won' : 'reset',
            winner: won ? 'home' : null,
            resetCountdown: won ? 0 : RESET_DELAY,
            lastScoringSide: 'home',
        };
    }

    if (by < BALL_R) {
        by = BALL_R;
        bvy = Math.abs(bvy) * RESTITUTION;
    }
    if (by > 1 - BALL_R) {
        by = 1 - BALL_R;
        bvy = -Math.abs(bvy) * RESTITUTION;
    }

    if (bx < INNER_LEFT) {
        if (by <= GOAL_Y0 || by >= GOAL_Y1) {
            bx = INNER_LEFT;
            bvx = Math.abs(bvx) * RESTITUTION;
        }
    }
    if (bx > INNER_RIGHT) {
        if (by <= GOAL_Y0 || by >= GOAL_Y1) {
            bx = INNER_RIGHT;
            bvx = -Math.abs(bvx) * RESTITUTION;
        }
    }

    const collideSide = (rodX: readonly number[], rodYArr: number[], lanes: FoosballLaneMen[]) => {
        for (let l = 0; l < L; l++) {
            const lane = lanes[l];
            if (!lane?.offsetsY?.length) continue;
            const rx = rodX[l];
            const ry = rodYArr[l];
            for (let m = 0; m < lane.offsetsY.length; m++) {
                const cy = ry + lane.offsetsY[m];
                const st = lane.stats[m] ?? lane.stats[0];
                const rm = BALL_R * 2.2 * (st?.reach ?? 1);
                const kick = st?.kickPower ?? 1;
                const res = collideBallMen(bx, by, bvx, bvy, rx, cy, kick, rm);
                bx = res.x;
                by = res.y;
                bvx = res.vx;
                bvy = res.vy;
            }
        }
    };

    collideSide(HOME_ROD_X, homeNext, cfg.homeLanes);
    collideSide(AWAY_ROD_X, awayNext, cfg.awayLanes);

    const sp = len(bvx, bvy);
    const cap = BALL_MAX_SPD * motionScale;
    if (sp > cap) {
        const f = cap / sp;
        bvx *= f;
        bvy *= f;
    }

    return {
        ...state,
        ball: { x: bx, y: by, vx: bvx, vy: bvy },
        homeRodY: homeNext as RodY4,
        awayRodY: awayNext as RodY4,
        scoreHome: sh0,
        scoreAway: sa0,
        phase: 'play',
        winner: null,
        resetCountdown: 0,
        lastScoringSide: null,
    };
}

/**
 * Base channel width (ball can pass) — same for every line.
 */
function idealBaseGapY(): number {
    const clearance = 2 * BALL_R * 1.45;
    const base = 2 * MEN_RM_NOMINAL + clearance;
    return Math.max(MEN_DIAMETER_Y + 2 * BALL_R * 1.35, base);
}

/** One inter-man gap for all rods so channels match across formations. */
const UNIFIED_CENTER_GAP = idealBaseGapY();

/**
 * Vertical half of the play band; shared gap is derived from the **tallest** DEF/MID/FWD column
 * (see `computeOutfieldYGap`) so all rods get the same inter-man distance in one formation.
 */
function maxVerticalHalfForOutfieldStack(): number {
    return (
        Math.min(ROD_Y_MIN - PITCH_Y_TOP - MEN_R_Y, PITCH_Y_BOTTOM - ROD_Y_MAX - MEN_R_Y) - 0.012
    );
}

function computeOutfieldYGap(nOutfieldMax: number): number {
    if (nOutfieldMax <= 1) return 0;
    const maxSpan = 2 * Math.max(0, maxVerticalHalfForOutfieldStack());
    const capForTallest = maxSpan / (nOutfieldMax - 1);
    return Math.min(UNIFIED_CENTER_GAP, capForTallest);
}

function offsetsForCount(n: number, sharedGapY: number): number[] {
    if (n <= 0) return [0];
    if (n === 1) return [0];
    return Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * sharedGapY);
}

/** Rods: GK | DEF | MID | FWD (toward halfway). */
export function assignPlayersToLanes(orderedXi: FoosballElement[]): FoosballLaneMen[] {
    const gk = orderedXi.find((p) => p.element_type === 1);
    const defs = orderedXi.filter((p) => p.element_type === 2);
    const mids = orderedXi.filter((p) => p.element_type === 3);
    const fwds = orderedXi.filter((p) => p.element_type === 4);

    const defaultStats: FoosballMenStats = { rodSpeed: 1, kickPower: 1, reach: 1 };

    const lanes: FoosballLaneMen[] = Array.from({ length: FOOSBALL_LANE_COUNT }, () => ({
        offsetsY: [] as number[],
        stats: [] as FoosballMenStats[],
    }));

    if (gk) {
        lanes[0].offsetsY = [0];
        lanes[0].stats = [elementToMenStats(gk)];
    } else {
        lanes[0].offsetsY = [0];
        lanes[0].stats = [defaultStats];
    }

    const nDef = defs.length;
    const nMid = mids.length;
    const nFwd = fwds.length;
    const nOutfieldMax = Math.max(1, nDef, nMid, nFwd);
    const sharedGapY = computeOutfieldYGap(nOutfieldMax);

    lanes[1].offsetsY = offsetsForCount(nDef, sharedGapY);
    lanes[1].stats = nDef ? defs.map((p) => elementToMenStats(p)) : [];

    lanes[2].offsetsY = offsetsForCount(nMid, sharedGapY);
    lanes[2].stats = mids.map((p) => elementToMenStats(p));

    lanes[3].offsetsY = offsetsForCount(nFwd, sharedGapY);
    lanes[3].stats = fwds.map((p) => elementToMenStats(p));

    for (let l = 0; l < FOOSBALL_LANE_COUNT; l++) {
        if (lanes[l].offsetsY.length === 0 || lanes[l].stats.length === 0) {
            lanes[l].offsetsY = [0];
            lanes[l].stats = [defaultStats];
        }
    }

    return lanes;
}

/**
 * Opposition “reversed”: swap GK and FWD rods so the keeper mans the centre (striker) line
 * and forwards drop to the goal line — same 11, mirrored chaos.
 */
export function assignAwayPlayersToLanes(orderedXi: FoosballElement[]): FoosballLaneMen[] {
    const b = assignPlayersToLanes(orderedXi);
    const out = [...b];
    const t = out[0]!;
    out[0] = out[3]!;
    out[3] = t;
    return out;
}

export function splitXiIntoLanePlayers(orderedXi: FoosballElement[]): FoosballElement[][] {
    const gk = orderedXi.find((p) => p.element_type === 1);
    const defs = orderedXi.filter((p) => p.element_type === 2);
    const mids = orderedXi.filter((p) => p.element_type === 3);
    const fwds = orderedXi.filter((p) => p.element_type === 4);
    return [gk ? [gk] : [], defs, mids, fwds];
}

/** Match `assignAwayPlayersToLanes` (swap GK rod ↔ FWD rod for headshots). */
export function splitAwayXiIntoLanePlayers(orderedXi: FoosballElement[]): FoosballElement[][] {
    const [gkLane, defLane, midLane, fwdLane] = splitXiIntoLanePlayers(orderedXi);
    return [fwdLane, defLane, midLane, gkLane];
}
