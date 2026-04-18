/**
 * FPL-legal starting shapes: 1 GK + 3–5 def, 2–5 mid, 1–3 att (valid in-game line-ups).
 * Same eight families as the official "Pick team" control.
 */
export const FPL_FORMATION_PRESETS: readonly {
    id: string;
    label: string;
    d: number;
    m: number;
    a: number;
}[] = [
    { id: '343', label: '3-4-3', d: 3, m: 4, a: 3 },
    { id: '352', label: '3-5-2', d: 3, m: 5, a: 2 },
    { id: '433', label: '4-3-3', d: 4, m: 3, a: 3 },
    { id: '442', label: '4-4-2', d: 4, m: 4, a: 2 },
    { id: '451', label: '4-5-1', d: 4, m: 5, a: 1 },
    { id: '532', label: '5-3-2', d: 5, m: 3, a: 2 },
    { id: '523', label: '5-2-3', d: 5, m: 2, a: 3 },
    { id: '541', label: '5-4-1', d: 5, m: 4, a: 1 },
] as const;

type AnyPlayer = { element_type: number; total_points?: number; form?: string; ict_index?: string; [k: string]: any };

const score = (p: AnyPlayer) =>
    Number(p.total_points ?? 0) + Number(p.form ?? 0) * 1.5 + Number(p.ict_index ?? 0) * 0.1;

/**
 * Picks 11 from `pool` to satisfy a legal shape; prefers higher `score` within each line.
 */
export function buildXiForFormation(
    pool: AnyPlayer[],
    f: { d: number; m: number; a: number }
): AnyPlayer[] | null {
    if (pool.length < 11) return null;
    const gks = pool.filter((p) => p.element_type === 1);
    const defs = pool
        .filter((p) => p.element_type === 2)
        .slice()
        .sort((a, b) => score(b) - score(a));
    const mids = pool
        .filter((p) => p.element_type === 3)
        .slice()
        .sort((a, b) => score(b) - score(a));
    const atts = pool
        .filter((p) => p.element_type === 4)
        .slice()
        .sort((a, b) => score(b) - score(a));

    const gk = gks[0];
    if (!gk) return null;

    const dPick = defs.slice(0, f.d);
    const dIds = new Set(dPick.map((p) => p.id as number));
    const mPick = mids.filter((m) => !dIds.has(m.id as number)).slice(0, f.m);
    const mIds = new Set(mPick.map((p) => p.id as number));
    const aPick = atts
        .filter((x) => !dIds.has(x.id as number) && !mIds.has(x.id as number))
        .slice(0, f.a);

    const line: AnyPlayer[] = [gk, ...dPick, ...mPick, ...aPick];
    if (line.length < 11) {
        const used = new Set(line.map((p) => p.id as number));
        const rest = pool
            .filter((p) => !used.has(p.id as number) && p.element_type !== 1)
            .slice()
            .sort((a, b) => score(b) - score(a));
        for (const p of rest) {
            if (line.length >= 11) break;
            line.push(p);
        }
    }
    if (line.length < 11) return null;
    return line.slice(0, 11) as AnyPlayer[];
}

export function isKnownFormationId(id: string): boolean {
    return FPL_FORMATION_PRESETS.some((f) => f.id === id);
}
