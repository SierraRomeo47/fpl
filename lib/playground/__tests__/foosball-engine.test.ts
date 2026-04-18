import {
    createFoosballState,
    stepFoosball,
    assignPlayersToLanes,
    type FoosballInitConfig,
    type FoosballState,
} from '../foosball-engine';
import type { FoosballElement } from '../foosball-attributes';

const mkEl = (
    id: number,
    et: number,
    partial: Partial<FoosballElement> = {}
): FoosballElement => ({
    id,
    element_type: et,
    form: '5',
    ep_next: '4',
    threat: '100',
    influence: '80',
    creativity: '70',
    ict_index: '80',
    saves: 10,
    clean_sheets: 8,
    ...partial,
});

function makeCfg(home: FoosballElement[], away: FoosballElement[]): FoosballInitConfig {
    return {
        targetScore: 10,
        homeLanes: assignPlayersToLanes(home),
        awayLanes: assignPlayersToLanes(away),
        cpuReaction: 0.55,
        reducedMotion: true,
    };
}

describe('foosball-engine', () => {
    const ordered = (n: number, startEt: number[]): FoosballElement[] =>
        startEt.map((et, i) => mkEl(n + i, et));

    it('assignPlayersToLanes returns four lanes (GK | DEF | MID | FWD)', () => {
        const xi = [
            ...ordered(1, [1]),
            ...ordered(10, [2, 2, 2, 2]),
            ...ordered(20, [3, 3, 3, 3, 3]),
            ...ordered(30, [4, 4]),
        ];
        const lanes = assignPlayersToLanes(xi);
        expect(lanes).toHaveLength(4);
        expect(lanes.every((l) => l.stats.length > 0)).toBe(true);
    });

    it('stepFoosball is deterministic for identical inputs', () => {
        const home = ordered(1, [1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4]);
        const away = ordered(100, [1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4]);
        const cfg = makeCfg(home, away);
        let a: FoosballState = createFoosballState();
        let b: FoosballState = createFoosballState();
        const input = { moveY: 0 as const, activeLane: 2 };
        for (let i = 0; i < 120; i++) {
            a = stepFoosball(cfg, a, input, 1 / 60, i * 16);
            b = stepFoosball(cfg, b, input, 1 / 60, i * 16);
        }
        expect(a.ball).toEqual(b.ball);
        expect(a.homeRodY).toEqual(b.homeRodY);
        expect(a.scoreHome).toBe(b.scoreHome);
        expect(a.scoreAway).toBe(b.scoreAway);
    });
});
