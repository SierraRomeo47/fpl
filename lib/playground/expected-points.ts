/** Fixture-weighted expected points for playground pitch (mirrors former insights tab logic). */
export function getPlaygroundExpectedPoints(
    player: { team: number; ep_next?: string | number; form?: string | number },
    fixtures: any[] | undefined,
    baselineGw: number
): number {
    const nextFixture = fixtures
        ?.filter((f: any) => {
            const isTeamInFixture = f.team_h === player.team || f.team_a === player.team;
            return isTeamInFixture && f.event >= baselineGw;
        })
        .sort((a: any, b: any) => a.event - b.event)[0];

    if (!nextFixture) return Number.parseFloat(String(player.ep_next)) || 0;

    const isHome = nextFixture.team_h === player.team;
    const difficulty = isHome ? nextFixture.team_h_difficulty : nextFixture.team_a_difficulty;
    const basePoints =
        Number.parseFloat(String(player.ep_next)) || Number.parseFloat(String(player.form)) || 0;

    let multiplier = 1.0;
    if (difficulty <= 2) multiplier = 1.2;
    else if (difficulty === 3) multiplier = 1.0;
    else if (difficulty === 4) multiplier = 0.85;
    else if (difficulty === 5) multiplier = 0.7;

    if (isHome) multiplier *= 1.1;

    return Math.max(0, basePoints * multiplier);
}
