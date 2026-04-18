import { buildBestAlternateTeam } from './build-alternate-team';

/**
 * Budget-optimised ghost XI for the instant sim (same builder as Card Wars, variable budget).
 */
export function buildGhostStartingXi(
    elements: Array<Record<string, unknown> & {
        id: number;
        status?: string;
        form?: unknown;
        ep_next?: unknown;
    }>,
    budgetM: number,
    getPlayer: (elementId: number) => { id: number } | undefined
): any[] | null {
    if (!elements?.length) return null;
    const altPicks = buildBestAlternateTeam(elements as any, budgetM);
    const awayPicks = (altPicks as any[]).filter((p: any) => p.position <= 11);
    let awayXi = awayPicks.map((pick: any) => getPlayer(pick.element)).filter(Boolean) as any[];
    if (awayXi.length < 11) {
        const used = new Set(awayXi.map((p: any) => p.id));
        const fill = (elements as any[])
            .filter((p: any) => p.status === 'a' && !used.has(p.id))
            .sort(
                (a: any, b: any) =>
                    Number.parseFloat(b.form) * 2 +
                    (Number.parseFloat(b.ep_next) || 0) -
                    (Number.parseFloat(a.form) * 2 + (Number.parseFloat(a.ep_next) || 0))
            );
        for (const p of fill) {
            if (awayXi.length >= 11) break;
            awayXi.push(p);
            used.add(p.id);
        }
    }
    if (awayXi.length < 11) return null;
    return awayXi.slice(0, 11);
}
