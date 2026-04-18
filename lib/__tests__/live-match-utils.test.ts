import {
    aggregateGwStatsFromExplain,
    extractFixtureStatsFromExplain,
    normaliseLiveElementMap,
    pointsForFixtureBlock,
} from '../live-match-utils';

describe('live-match-utils', () => {
    it('pointsForFixtureBlock sums net stat points for a fixture', () => {
        const b = pointsForFixtureBlock(
            [
                { fixture: 1, stats: [] },
                {
                    fixture: 7,
                    stats: [
                        { identifier: 'minutes', points: 1, value: 45, points_deductions: 0 },
                        { identifier: 'goals', points: 4, value: 1, points_deductions: 0 },
                    ],
                },
            ],
            7
        );
        expect(b.total).toBe(5);
        expect(b.lines).toHaveLength(2);
    });

    it('aggregateGwStatsFromExplain sums across fixture blocks', () => {
        const { totalPoints, stats } = aggregateGwStatsFromExplain([
            {
                fixture: 1,
                stats: [
                    { identifier: 'minutes', points: 2, value: 90, points_deductions: 0 },
                    { identifier: 'goals', points: 4, value: 1, points_deductions: 0 },
                ],
            },
            {
                fixture: 2,
                stats: [{ identifier: 'minutes', points: 1, value: 45, points_deductions: 0 }],
            },
        ]);
        expect(totalPoints).toBe(7);
        expect(stats.minutes).toBe(135);
        expect(stats.goals).toBe(1);
    });

    it('extractFixtureStatsFromExplain reads explain stats for a fixture', () => {
        const snap = extractFixtureStatsFromExplain(
            [
                {
                    fixture: 99,
                    stats: [
                        { identifier: 'minutes', points: 2, value: 90, points_deductions: 0 },
                        { identifier: 'goals', points: 5, value: 1, points_deductions: 0 },
                        { identifier: 'bps', points: 0, value: 28, points_deductions: 0 },
                    ],
                },
            ],
            99
        );
        expect(snap?.minutes).toBe(90);
        expect(snap?.goals).toBe(1);
        expect(snap?.bps).toBe(28);
    });

    it('normaliseLiveElementMap supports array and dict shapes', () => {
        const fromArr = normaliseLiveElementMap({ elements: [{ id: 2, explain: [] }] } as any);
        expect(fromArr.get(2)?.id).toBe(2);
        const fromObj = normaliseLiveElementMap({ elements: { '3': { stats: {} } } } as any);
        expect(fromObj.get(3)).toBeDefined();
    });
});
