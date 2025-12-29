/**
 * Utility functions for fixture analysis and FDR calculations
 */

/**
 * Get team short name from teams array
 */
export function getTeamShortName(teamId: number, teams: any[]): string {
    const team = teams.find((t: any) => t.id === teamId);
    return team?.short_name || '?';
}

/**
 * Get next N fixtures for a specific team
 */
export function getNextFixtures(
    teamId: number,
    fixtures: any[],
    currentEvent: number,
    count: number = 5
): any[] {
    return fixtures
        .filter((f: any) => {
            const isTeamInFixture = f.team_h === teamId || f.team_a === teamId;
            const isFuture = f.event >= currentEvent;
            return isTeamInFixture && isFuture && f.event !== null;
        })
        .sort((a: any, b: any) => a.event - b.event)
        .slice(0, count);
}

/**
 * Calculate average FDR for next N fixtures
 */
export function getAverageFDR(
    teamId: number,
    fixtures: any[],
    currentEvent: number,
    count: number = 5
): number {
    const nextFixtures = getNextFixtures(teamId, fixtures, currentEvent, count);

    if (nextFixtures.length === 0) return 3; // Neutral if no fixtures

    const fdrSum = nextFixtures.reduce((sum: number, fixture: any) => {
        const isHome = fixture.team_h === teamId;
        const difficulty = isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty;
        return sum + (difficulty || 3);
    }, 0);

    return fdrSum / nextFixtures.length;
}

/**
 * Get FDR color class based on difficulty
 */
export function getFDRColorClass(difficulty: number): string {
    if (difficulty <= 2) return 'text-green-600';
    if (difficulty === 3) return 'text-yellow-600';
    if (difficulty === 4) return 'text-orange-600';
    return 'text-red-600';
}

/**
 * Determine if fixtures are favorable (average FDR <= 2.5)
 */
export function hasFavorableFixtures(
    teamId: number,
    fixtures: any[],
    currentEvent: number,
    count: number = 5
): boolean {
    const avgFDR = getAverageFDR(teamId, fixtures, currentEvent, count);
    return avgFDR <= 2.5;
}
