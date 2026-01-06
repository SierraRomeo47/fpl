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
    currentEvent: number | { id: number },
    count: number = 5
): any[] {
    // Normalize currentEvent to a number
    const currentEventNum = typeof currentEvent === 'number' ? currentEvent : (typeof currentEvent === 'object' && currentEvent !== null && 'id' in currentEvent ? currentEvent.id : 1);
    
    return fixtures
        .filter((f: any) => {
            const isTeamInFixture = f.team_h === teamId || f.team_a === teamId;
            // Show fixtures from NEXT gameweek onwards (not current)
            const isFuture = f.event > currentEventNum;
            // Exclude finished fixtures
            const isNotFinished = !f.finished;
            return isTeamInFixture && isFuture && isNotFinished && f.event !== null;
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
 * 5-step gradient: Green (1) -> Lime (2) -> Yellow (3) -> Orange (4) -> Red (5)
 */
export function getFDRColorClass(difficulty: number): string {
    switch (difficulty) {
        case 1:
            return 'text-green-600'; // Very Easy - Green
        case 2:
            return 'text-lime-600'; // Easy - Lime
        case 3:
            return 'text-yellow-600'; // Moderate - Yellow
        case 4:
            return 'text-orange-600'; // Difficult - Orange
        case 5:
            return 'text-red-600'; // Very Difficult - Red
        default:
            return 'text-gray-600';
    }
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
