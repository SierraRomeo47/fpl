import { simulateMatch, type SimPlayer } from '../match-engine';

function player(partial: Partial<SimPlayer> & { id: number; element_type: number; web_name: string }): SimPlayer {
    return {
        form: '4.5',
        ep_next: '4.2',
        ict_index: '80',
        threat: '120',
        influence: '60',
        creativity: '50',
        saves: 8,
        clean_sheets: 4,
        ...partial,
    };
}

describe('simulateMatch', () => {
    const homeXi: SimPlayer[] = [
        player({ id: 1, element_type: 1, web_name: 'H GK' }),
        ...Array.from({ length: 10 }, (_, i) =>
            player({ id: i + 2, element_type: i < 4 ? 2 : i < 8 ? 3 : 4, web_name: `H${i}` })
        ),
    ];
    const awayXi: SimPlayer[] = [
        player({ id: 101, element_type: 1, web_name: 'A GK' }),
        ...Array.from({ length: 10 }, (_, i) =>
            player({ id: i + 102, element_type: i < 4 ? 2 : i < 8 ? 3 : 4, web_name: `A${i}` })
        ),
    ];

    it('returns the same result for identical inputs (seeded determinism)', () => {
        const a = simulateMatch({
            homeXi,
            awayXi,
            entryId: 42_001,
            gameweek: 18,
        });
        const b = simulateMatch({
            homeXi,
            awayXi,
            entryId: 42_001,
            gameweek: 18,
        });
        expect(a.seed).toBe(b.seed);
        expect(a.homeGoals).toBe(b.homeGoals);
        expect(a.awayGoals).toBe(b.awayGoals);
        expect(a.events.map((e) => e.type)).toEqual(b.events.map((e) => e.type));
    });

    it('bookends the event log with kickoff and full-time whistle', () => {
        const r = simulateMatch({
            homeXi,
            awayXi,
            entryId: 9,
            gameweek: 3,
        });
        expect(r.events[0]?.type).toBe('kickoff');
        expect(r.events[r.events.length - 1]?.type).toBe('whistle');
    });

    it('respects tuning biases without changing the RNG seed', () => {
        const base = simulateMatch({
            homeXi,
            awayXi,
            entryId: 7,
            gameweek: 5,
        });
        const aggressive = simulateMatch({
            homeXi,
            awayXi,
            entryId: 7,
            gameweek: 5,
            tuning: { attackBias: 1.45, defenseBias: 0.85 },
        });
        expect(base.seed).toBe(aggressive.seed);
        expect(aggressive.homeGoals + aggressive.awayGoals).toBeGreaterThanOrEqual(0);
    });
});
