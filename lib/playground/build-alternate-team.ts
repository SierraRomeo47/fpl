/**
 * Build a heuristic "best" 15 within budget for Card Wars compare mode.
 */
export function buildBestAlternateTeam(
    elements: Array<Record<string, unknown> & { id: number; element_type: number; now_cost: number; status?: string }>,
    budget: number
) {
    if (!elements || elements.length === 0) return [];

    const scoredPlayers = elements
        .filter((p) => p.status === 'a')
        .map((p) => ({
            ...p,
            score:
                Number.parseFloat(String(p.form)) * 2 +
                (Number.parseFloat(String(p.ep_next)) || 0) +
                (Number(p.total_points) || 0) / 15,
        }))
        .sort((a: any, b: any) => b.score - a.score);

    const positionCounts = { 1: 2, 2: 5, 3: 5, 4: 3 } as const;
    const selected: any[] = [];
    let remainingBudget = budget * 10;

    ([1, 2, 3, 4] as const).forEach((position) => {
        const count = positionCounts[position];
        const candidates = scoredPlayers
            .filter((p: any) => p.element_type === position)
            .filter((p: any) => !selected.find((s) => s.id === p.id));

        let selectedForPosition = 0;
        for (const player of candidates) {
            if (selectedForPosition < count && player.now_cost <= remainingBudget) {
                selected.push(player);
                remainingBudget -= player.now_cost;
                selectedForPosition++;
            }
        }
    });

    return selected.map((player: any, index: number) => ({
        element: player.id,
        position: index + 1,
        is_captain: index === 0,
        is_vice_captain: index === 1,
    }));
}
