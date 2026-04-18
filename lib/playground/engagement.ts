/** Local streak + one-liner copy for playground “viral” / share actions */

const STREAK_KEY = 'fpl_playground_foosball_streak';
const BEST_KEY = 'fpl_playground_foosball_best_streak';
const WINS_KEY = 'fpl_playground_foosball_wins';

const CW_STREAK_KEY = 'fpl_playground_card_wars_streak';
const CW_BEST_KEY = 'fpl_playground_card_wars_best_streak';
const CW_WINS_KEY = 'fpl_playground_card_wars_wins';

const SIM_STREAK_KEY = 'fpl_playground_sim_streak';
const SIM_BEST_KEY = 'fpl_playground_sim_best_streak';
const SIM_WINS_KEY = 'fpl_playground_sim_wins';

export function recordFoosballMatchEnd(won: boolean) {
    if (typeof window === 'undefined') return { streak: 0, best: 0, totalWins: 0, isNewRecord: false };
    let streak = 0;
    let best = 0;
    let totalW = 0;
    let isNewRecord = false;
    try {
        const prevStreak = Math.max(0, parseInt(localStorage.getItem(STREAK_KEY) || '0', 10) || 0);
        const bestPrev = Math.max(0, parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0);
        const winsPrev = Math.max(0, parseInt(localStorage.getItem(WINS_KEY) || '0', 10) || 0);
        if (won) {
            streak = prevStreak + 1;
            best = Math.max(bestPrev, streak);
            totalW = winsPrev + 1;
            isNewRecord = streak > bestPrev;
        } else {
            streak = 0;
            best = bestPrev;
            totalW = winsPrev;
        }
        localStorage.setItem(STREAK_KEY, String(streak));
        localStorage.setItem(BEST_KEY, String(best));
        if (won) localStorage.setItem(WINS_KEY, String(totalW));
    } catch {
        /* no-op */
    }
    return { streak, best, totalWins: totalW, isNewRecord };
}

export function readFoosballStreaks() {
    if (typeof window === 'undefined') return { streak: 0, best: 0, totalWins: 0 };
    try {
        return {
            streak: Math.max(0, parseInt(localStorage.getItem(STREAK_KEY) || '0', 10) || 0),
            best: Math.max(0, parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0),
            totalWins: Math.max(0, parseInt(localStorage.getItem(WINS_KEY) || '0', 10) || 0),
        };
    } catch {
        return { streak: 0, best: 0, totalWins: 0 };
    }
}

/** Card Wars: win = your XI wins the stat duel; ties do not extend streak. */
export function recordCardWarsSessionEnd(outcome: 'myTeam' | 'alternate' | 'tie') {
    if (typeof window === 'undefined') {
        return { streak: 0, best: 0, totalWins: 0, isNewRecord: false };
    }
    const won = outcome === 'myTeam';
    let streak = 0;
    let best = 0;
    let totalW = 0;
    let isNewRecord = false;
    try {
        const prevStreak = Math.max(0, parseInt(localStorage.getItem(CW_STREAK_KEY) || '0', 10) || 0);
        const bestPrev = Math.max(0, parseInt(localStorage.getItem(CW_BEST_KEY) || '0', 10) || 0);
        const winsPrev = Math.max(0, parseInt(localStorage.getItem(CW_WINS_KEY) || '0', 10) || 0);
        if (won) {
            streak = prevStreak + 1;
            best = Math.max(bestPrev, streak);
            totalW = winsPrev + 1;
            isNewRecord = streak > bestPrev;
        } else {
            streak = 0;
            best = bestPrev;
            totalW = winsPrev;
        }
        localStorage.setItem(CW_STREAK_KEY, String(streak));
        localStorage.setItem(CW_BEST_KEY, String(best));
        if (won) localStorage.setItem(CW_WINS_KEY, String(totalW));
    } catch {
        /* no-op */
    }
    return { streak, best, totalWins: totalW, isNewRecord };
}

export function readCardWarsEngagement() {
    if (typeof window === 'undefined') return { streak: 0, best: 0, totalWins: 0 };
    try {
        return {
            streak: Math.max(0, parseInt(localStorage.getItem(CW_STREAK_KEY) || '0', 10) || 0),
            best: Math.max(0, parseInt(localStorage.getItem(CW_BEST_KEY) || '0', 10) || 0),
            totalWins: Math.max(0, parseInt(localStorage.getItem(CW_WINS_KEY) || '0', 10) || 0),
        };
    } catch {
        return { streak: 0, best: 0, totalWins: 0 };
    }
}

/** Instant sim: win = you score more than the ghost. */
export function recordSimSessionEnd(homeGoals: number, awayGoals: number) {
    if (typeof window === 'undefined') {
        return { streak: 0, best: 0, totalWins: 0, isNewRecord: false };
    }
    const won = homeGoals > awayGoals;
    let streak = 0;
    let best = 0;
    let totalW = 0;
    let isNewRecord = false;
    try {
        const prevStreak = Math.max(0, parseInt(localStorage.getItem(SIM_STREAK_KEY) || '0', 10) || 0);
        const bestPrev = Math.max(0, parseInt(localStorage.getItem(SIM_BEST_KEY) || '0', 10) || 0);
        const winsPrev = Math.max(0, parseInt(localStorage.getItem(SIM_WINS_KEY) || '0', 10) || 0);
        if (won) {
            streak = prevStreak + 1;
            best = Math.max(bestPrev, streak);
            totalW = winsPrev + 1;
            isNewRecord = streak > bestPrev;
        } else {
            streak = 0;
            best = bestPrev;
            totalW = winsPrev;
        }
        localStorage.setItem(SIM_STREAK_KEY, String(streak));
        localStorage.setItem(SIM_BEST_KEY, String(best));
        if (won) localStorage.setItem(SIM_WINS_KEY, String(totalW));
    } catch {
        /* no-op */
    }
    return { streak, best, totalWins: totalW, isNewRecord };
}

export function readSimEngagement() {
    if (typeof window === 'undefined') return { streak: 0, best: 0, totalWins: 0 };
    try {
        return {
            streak: Math.max(0, parseInt(localStorage.getItem(SIM_STREAK_KEY) || '0', 10) || 0),
            best: Math.max(0, parseInt(localStorage.getItem(SIM_BEST_KEY) || '0', 10) || 0),
            totalWins: Math.max(0, parseInt(localStorage.getItem(SIM_WINS_KEY) || '0', 10) || 0),
        };
    } catch {
        return { streak: 0, best: 0, totalWins: 0 };
    }
}

export function buildFoosballShareText(opts: {
    won: boolean;
    scoreHome: number;
    scoreAway: number;
    firstTo: number;
    streak?: number;
}) {
    const { won, scoreHome, scoreAway, firstTo, streak = 0 } = opts;
    if (won) {
        return `⚽ FPL DnD Foosball — I just beat the CPU ${scoreHome}–${scoreAway} (first to ${firstTo})${streak > 1 ? ` 🔥 ${streak} wins in a row!` : ''} — can you?`;
    }
    return `⚽ FPL DnD Foosball — Ouch: CPU got me ${scoreHome}–${scoreAway} (first to ${firstTo}). Rematch time.`;
}

export function buildCardWarsShareText(opts: {
    myWins: number;
    altWins: number;
    outcome: 'myTeam' | 'alternate' | 'tie';
    gw: number;
    streak?: number;
}) {
    const { myWins, altWins, outcome, gw, streak = 0 } = opts;
    const streakBit = streak > 1 ? ` 🔥 ${streak} wins in a row` : '';
    if (outcome === 'myTeam') {
        return `🃏 FPL DnD Card Wars (GW${gw}): I crushed the Best Alternate ${myWins}–${altWins} on the stat board.${streakBit} #FPL`;
    }
    if (outcome === 'alternate') {
        return `🃏 FPL DnD Card Wars (GW${gw}): The algorithm edged me ${altWins}–${myWins} — time for a rematch. #FPL`;
    }
    return `🃏 FPL DnD Card Wars (GW${gw}): Deadlock ${myWins}–${altWins}. Splitting hairs on stats! #FPL`;
}

export function buildSimShareText(
    home: number,
    away: number,
    gw: number,
    seed: number,
    opts?: { mvpName?: string | null; streak?: number }
) {
    const mvp = opts?.mvpName ? ` MOTM ${opts.mvpName}.` : '';
    const streakBit =
        opts?.streak && opts.streak > 1 ? ` 🔥 ${opts.streak} sim wins in a row.` : '';
    return `🎮 FPL DnD — Instant sim GW${gw}: I ran the pitch sim and got ${home}–${away} (seed ${seed}).${mvp}${streakBit} Run your XI and see if you beat the ghost squad!`;
}
