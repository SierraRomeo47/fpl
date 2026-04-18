import { buildBestAlternateTeam } from './build-alternate-team';

type AnyPlayer = { id: number; element_type: number; [k: string]: any };

export type OpponentMode = 'template' | 'last_gw' | 'season';

/**
 * 11 "ghost" opponents for foosball, chosen from full `elements` by mode.
 * `template` — budget-optimised alternate (same as former ghost).
 * `season` — highest all-season score mix (1 GK, 4-4-2 shape, then backfill).
 * `last_gw` — `event_points` if present, else form / expected proxy.
 */
export function buildOpponentEleven(elements: AnyPlayer[], mode: OpponentMode): AnyPlayer[] {
    if (mode === 'template') {
        const altPicks = buildBestAlternateTeam(elements as any, 100) as { element: number; position: number }[];
        const fromAlt = (altPicks as any[]).filter((p: any) => p.position <= 11);
        const xi = fromAlt
            .map((p: any) => (elements as any[]).find((e) => e.id === p.element))
            .filter(Boolean) as AnyPlayer[];
        return topUpToEleven(xi, elements as any[]);
    }
    if (mode === 'season') {
        const s = (p: AnyPlayer) => Number(p.total_points ?? 0) + 0.001 * Number(p.ict_index ?? 0);
        return bestEleven442(elements as any[], s);
    }
    if (mode === 'last_gw') {
        const s = (p: AnyPlayer) => {
            const e = p as { event_points?: number; form?: string; ep_next?: string; ict_index?: string };
            const ep = Number((e as any).event_points ?? 0);
            if (ep > 0) return ep;
            const f = parseFloat((e as any).form) || 0;
            return f * 4 + (parseFloat((e as any).ep_next) || 0) * 2 + 0.01 * parseFloat((e as any).ict_index) || 0;
        };
        return bestEleven442(elements as any[], s);
    }
    return [];
}

function isAvail(p: AnyPlayer) {
    if (p.status == null) return true;
    return p.status === 'a';
}

function bestEleven442(pool: AnyPlayer[], s: (p: AnyPlayer) => number) {
    const el = pool.filter((p) => isAvail(p));
    const gk = el
        .filter((p) => p.element_type === 1)
        .sort((a, b) => s(b) - s(a))[0];
    if (!gk) {
        return topUpToEleven(el.sort((a, b) => s(b) - s(a)).slice(0, 11), el);
    }
    const used = new Set([gk.id]);
    const d = 4;
    const m = 4;
    const a = 2;
    const defs = el
        .filter((p) => p.element_type === 2 && !used.has(p.id))
        .sort((a, b) => s(b) - s(a))
        .slice(0, d);
    defs.forEach((p) => used.add(p.id));
    const mids = el
        .filter((p) => p.element_type === 3 && !used.has(p.id))
        .sort((a, b) => s(b) - s(a))
        .slice(0, m);
    mids.forEach((p) => used.add(p.id));
    const ats = el
        .filter((p) => p.element_type === 4 && !used.has(p.id))
        .sort((a, b) => s(b) - s(a))
        .slice(0, a);
    ats.forEach((p) => used.add(p.id));
    return topUpToEleven([gk, ...defs, ...mids, ...ats], el);
}

function topUpToEleven(xi: AnyPlayer[], elements: AnyPlayer[]): AnyPlayer[] {
    const out = xi.slice(0, 11);
    const used = new Set(out.map((p) => p.id));
    if (!out.some((p) => p.element_type === 1)) {
        const g0 = (elements as any[]).find((p) => p.element_type === 1 && (p.status === 'a' || p.status == null) && !used.has(p.id));
        if (g0) {
            out.unshift(g0);
            used.add(g0.id);
        }
    }
    const rest = (elements as any[]).filter(
        (p) => (p.status === 'a' || p.status == null) && !used.has(p.id)
    );
    rest.sort(
        (a, b) =>
            Number(b.total_points ?? 0) +
            Number(b.form ?? 0) * 2 -
            (Number(a.total_points ?? 0) + Number(a.form ?? 0) * 2)
    );
    for (const p of rest) {
        if (out.length >= 11) break;
        out.push(p);
        used.add(p.id);
    }
    return out.slice(0, 11);
}
