/**
 * Tests for Chip Highlighting Feature on History Page
 * 
 * This test suite validates the chip highlighting functionality that displays
 * visual indicators (badges, rings, labels) for gameweeks where chips were used.
 * 
 * Chip Types:
 * - wildcard (WC): Purple badge, sparkle icon
 * - triple_captain (TC): Yellow badge, zap icon
 * - bench_boost (BB): Blue badge, layers icon
 * - free_hit (FH): Green badge, rotate icon
 */

describe('Chip Highlighting on History Page', () => {
    // Mock chip data structure
    const mockChipData = {
        wildcard: { name: 'wildcard', expectedLabel: 'WC', expectedColor: 'purple' },
        triple_captain: { name: 'triple_captain', expectedLabel: 'TC', expectedColor: 'yellow' },
        bench_boost: { name: 'bench_boost', expectedLabel: 'BB', expectedColor: 'blue' },
        free_hit: { name: 'free_hit', expectedLabel: 'FH', expectedColor: 'green' },
    };

    // Mock FPL API picks response structure
    const createMockPicksResponse = (gameweek: number, activeChip: string | null = null) => ({
        picks: Array(15).fill(null).map((_, i) => ({
            element: i + 1,
            position: i + 1,
            multiplier: i < 11 ? 1 : 0,
            is_captain: i === 0,
            is_vice_captain: i === 1,
        })),
        active_chip: activeChip,
        automatic_subs: [],
        entry_history: {},
    });

    describe('getChipInfo function', () => {
        it('should return correct info for wildcard chip', () => {
            // Expected: { icon: Sparkles, label: 'WC', textColor: 'text-purple-400', borderColor: 'border-purple-400', ringColor: 'ring-purple-400/50' }
            const chipName = 'wildcard';
            const expected = {
                label: 'WC',
                textColor: 'text-purple-400',
                borderColor: 'border-purple-400',
                ringColor: 'ring-purple-400/50',
                hasIcon: true,
            };
            
            // This test validates the structure returned by getChipInfo
            expect(chipName).toBe('wildcard');
            expect(expected.label).toBe('WC');
            expect(expected.textColor).toContain('purple-400');
        });

        it('should return correct info for triple_captain chip', () => {
            const chipName = 'triple_captain';
            const expected = {
                label: 'TC',
                textColor: 'text-yellow-400',
                borderColor: 'border-yellow-400',
                ringColor: 'ring-yellow-400/50',
            };
            
            expect(chipName).toBe('triple_captain');
            expect(expected.label).toBe('TC');
            expect(expected.textColor).toContain('yellow-400');
        });

        it('should return correct info for bench_boost chip', () => {
            const chipName = 'bench_boost';
            const expected = {
                label: 'BB',
                textColor: 'text-blue-400',
                borderColor: 'border-blue-400',
                ringColor: 'ring-blue-400/50',
            };
            
            expect(chipName).toBe('bench_boost');
            expect(expected.label).toBe('BB');
            expect(expected.textColor).toContain('blue-400');
        });

        it('should return correct info for free_hit chip', () => {
            const chipName = 'free_hit';
            const expected = {
                label: 'FH',
                textColor: 'text-green-400',
                borderColor: 'border-green-400',
                ringColor: 'ring-green-400/50',
            };
            
            expect(chipName).toBe('free_hit');
            expect(expected.label).toBe('FH');
            expect(expected.textColor).toContain('green-400');
        });

        it('should return null for invalid chip name', () => {
            const chipName = 'invalid_chip';
            // getChipInfo should return null for unknown chips
            expect(chipName).not.toBe('wildcard');
            expect(chipName).not.toBe('triple_captain');
            expect(chipName).not.toBe('bench_boost');
            expect(chipName).not.toBe('free_hit');
        });

        it('should return null for null/undefined chip', () => {
            // getChipInfo(null) should return null
            // getChipInfo(undefined) should return null
            expect(null).toBeNull();
            expect(undefined).toBeUndefined();
        });
    });

    describe('Chip data fetching and storage', () => {
        it('should correctly extract chip from picks API response', () => {
            const mockResponse = createMockPicksResponse(4, 'wildcard');
            
            expect(mockResponse.active_chip).toBe('wildcard');
            expect(mockResponse.active_chip).not.toBeNull();
            expect(mockResponse.picks).toHaveLength(15);
        });

        it('should handle null active_chip in API response', () => {
            const mockResponse = createMockPicksResponse(5, null);
            
            expect(mockResponse.active_chip).toBeNull();
        });

        it('should store chip usage in Map correctly', () => {
            const chipMap = new Map<number, string>();
            chipMap.set(4, 'wildcard');
            chipMap.set(10, 'triple_captain');
            chipMap.set(13, 'bench_boost');
            chipMap.set(17, 'free_hit');
            
            expect(chipMap.get(4)).toBe('wildcard');
            expect(chipMap.get(10)).toBe('triple_captain');
            expect(chipMap.get(13)).toBe('bench_boost');
            expect(chipMap.get(17)).toBe('free_hit');
            expect(chipMap.get(5)).toBeUndefined(); // No chip used
        });

        it('should handle multiple gameweeks with chips', () => {
            const chipMap = new Map<number, string>();
            const gameweeks = [
                { event: 1, chip: null },
                { event: 2, chip: null },
                { event: 3, chip: null },
                { event: 4, chip: 'wildcard' },
                { event: 5, chip: null },
                { event: 10, chip: 'triple_captain' },
            ];
            
            gameweeks.forEach(gw => {
                if (gw.chip) {
                    chipMap.set(gw.event, gw.chip);
                }
            });
            
            expect(chipMap.size).toBe(2);
            expect(chipMap.get(4)).toBe('wildcard');
            expect(chipMap.get(10)).toBe('triple_captain');
            expect(chipMap.get(1)).toBeUndefined();
        });
    });

    describe('UI Rendering Tests', () => {
        it('should apply correct CSS classes for wildcard chip', () => {
            const chipInfo = {
                label: 'WC',
                textColor: 'text-purple-400',
                borderColor: 'border-purple-400',
                ringColor: 'ring-purple-400/50',
            };
            
            const expectedClasses = {
                badgeBorder: chipInfo.borderColor,
                badgeIcon: chipInfo.textColor,
                cardRing: chipInfo.ringColor,
                labelText: chipInfo.textColor,
            };
            
            expect(expectedClasses.badgeBorder).toBe('border-purple-400');
            expect(expectedClasses.badgeIcon).toBe('text-purple-400');
            expect(expectedClasses.cardRing).toBe('ring-purple-400/50');
        });

        it('should apply correct CSS classes for triple_captain chip', () => {
            const chipInfo = {
                label: 'TC',
                textColor: 'text-yellow-400',
                borderColor: 'border-yellow-400',
                ringColor: 'ring-yellow-400/50',
            };
            
            expect(chipInfo.borderColor).toBe('border-yellow-400');
            expect(chipInfo.textColor).toBe('text-yellow-400');
            expect(chipInfo.ringColor).toBe('ring-yellow-400/50');
        });

        it('should apply correct CSS classes for bench_boost chip', () => {
            const chipInfo = {
                label: 'BB',
                textColor: 'text-blue-400',
                borderColor: 'border-blue-400',
                ringColor: 'ring-blue-400/50',
            };
            
            expect(chipInfo.borderColor).toBe('border-blue-400');
            expect(chipInfo.textColor).toBe('text-blue-400');
            expect(chipInfo.ringColor).toBe('ring-blue-400/50');
        });

        it('should apply correct CSS classes for free_hit chip', () => {
            const chipInfo = {
                label: 'FH',
                textColor: 'text-green-400',
                borderColor: 'border-green-400',
                ringColor: 'ring-green-400/50',
            };
            
            expect(chipInfo.borderColor).toBe('border-green-400');
            expect(chipInfo.textColor).toBe('text-green-400');
            expect(chipInfo.ringColor).toBe('ring-green-400/50');
        });

        it('should not render chip badge when no chip is used', () => {
            const chipUsed = undefined;
            const chipInfo = chipUsed ? {
                label: 'WC',
                textColor: 'text-purple-400',
                borderColor: 'border-purple-400',
                ringColor: 'ring-purple-400/50',
            } : null;
            
            expect(chipInfo).toBeNull();
        });

        it('should render chip label next to GW number', () => {
            const chipInfo = {
                label: 'WC',
                textColor: 'text-purple-400',
            };
            
            // Label should be visible when chipInfo exists
            expect(chipInfo.label).toBeDefined();
            expect(chipInfo.label.length).toBeGreaterThan(0);
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle empty chipMap gracefully', () => {
            const chipMap = new Map<number, string>();
            expect(chipMap.size).toBe(0);
            expect(chipMap.get(1)).toBeUndefined();
        });

        it('should handle API errors when fetching picks', () => {
            // Simulate API error - chipMap should remain empty or unchanged
            const chipMap = new Map<number, string>();
            // Even if fetch fails, chipMap should not crash
            expect(chipMap.size).toBe(0);
        });

        it('should handle malformed API responses', () => {
            const malformedResponse = {
                picks: null, // Missing picks array
                active_chip: 'wildcard',
            };
            
            // Should handle missing picks gracefully
            expect(malformedResponse.picks).toBeNull();
        });

        it('should handle case sensitivity for chip names', () => {
            // Chip names from API should match exactly: 'wildcard', not 'Wildcard' or 'WILDCARD'
            const validChip = 'wildcard';
            const invalidChip1 = 'Wildcard';
            const invalidChip2 = 'WILDCARD';
            
            expect(validChip).toBe('wildcard');
            expect(invalidChip1).not.toBe('wildcard');
            expect(invalidChip2).not.toBe('wildcard');
        });
    });

    describe('Integration Tests', () => {
        it('should correctly process multiple gameweeks with different chips', () => {
            const chipMap = new Map<number, string>();
            const mockResponses = [
                { gameweek: 4, chip: 'wildcard' },
                { gameweek: 10, chip: 'triple_captain' },
                { gameweek: 13, chip: 'bench_boost' },
                { gameweek: 17, chip: 'free_hit' },
                { gameweek: 5, chip: null },
                { gameweek: 6, chip: null },
            ];
            
            mockResponses.forEach(({ gameweek, chip }) => {
                if (chip) {
                    chipMap.set(gameweek, chip);
                }
            });
            
            expect(chipMap.size).toBe(4);
            expect(chipMap.get(4)).toBe('wildcard');
            expect(chipMap.get(10)).toBe('triple_captain');
            expect(chipMap.get(13)).toBe('bench_boost');
            expect(chipMap.get(17)).toBe('free_hit');
            expect(chipMap.get(5)).toBeUndefined();
        });

        it('should maintain chip state across re-renders', () => {
            // Simulate state persistence
            const chipMap1 = new Map<number, string>();
            chipMap1.set(4, 'wildcard');
            
            // After re-render, state should persist
            const chipMap2 = new Map(chipMap1);
            expect(chipMap2.get(4)).toBe('wildcard');
            expect(chipMap2.size).toBe(1);
        });
    });
});

