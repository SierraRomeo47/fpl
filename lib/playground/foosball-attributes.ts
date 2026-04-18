/**
 * Maps FPL bootstrap `elements` fields into foosball real-time mode stats.
 */

export type FoosballElement = {
    id?: number;
    element_type: number;
    form?: string | number;
    ep_next?: string | number;
    threat?: string | number;
    influence?: string | number;
    creativity?: string | number;
    saves?: number;
    clean_sheets?: number;
    ict_index?: string | number;
};

export type FoosballMenStats = {
    /** Multiplier for rod slide max speed (≈0.7–1.35) */
    rodSpeed: number;
    /** Impulse scale when this man strikes the ball (≈0.85–1.4) */
    kickPower: number;
    /** Hit radius multiplier (GK/def slightly larger “stick”) */
    reach: number;
};

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function num(v: unknown, d = 0): number {
    if (v == null) return d;
    const n = typeof v === 'number' ? v : Number.parseFloat(String(v));
    return Number.isFinite(n) ? n : d;
}

/** Single player → per-man gameplay numbers (deterministic, no RNG). */
export function elementToMenStats(p: FoosballElement): FoosballMenStats {
    const form = num(p.form, 3);
    const ep = num(p.ep_next, 3);
    const thr = num(p.threat, 30) / 100;
    const inf = num(p.influence, 30) / 100;
    const cre = num(p.creativity, 30) / 100;
    const ict = num(p.ict_index, 5);

    const et = p.element_type;
    const posMove =
        et === 1 ? 0.85 : et === 2 ? 0.92 : et === 3 ? 1.0 : 1.08;

    const rodSpeed = clamp(0.65 + (form * 0.06 + ep * 0.05) * posMove, 0.7, 1.35);

    const shotBase = thr * 0.35 + cre * 0.2 + inf * 0.15 + ict * 0.04;
    const kickPower = clamp(0.85 + shotBase + (et === 4 ? 0.12 : et === 1 ? -0.08 : 0), 0.82, 1.45);

    const reachGk = (num(p.saves, 0) / 100) * 0.15 + (et === 1 ? 0.12 : 0);
    const reachDef = et === 2 ? 0.06 + (num(p.clean_sheets, 0) / 200) * 0.1 : 0;
    const reach = clamp(1 + reachGk + reachDef + (et === 2 ? inf * 0.05 : 0), 0.92, 1.25);

    return { rodSpeed, kickPower, reach };
}

/** Squad average used to scale CPU smoothness (better ghost squad = slightly snappier AI). */
export function squadAverageCpuReaction(elements: FoosballElement[]): number {
    if (!elements.length) return 0.55;
    let s = 0;
    for (const e of elements) {
        const st = elementToMenStats(e);
        s += (st.rodSpeed + st.kickPower) / 2;
    }
    const raw = s / elements.length;
    return clamp(0.38 + raw * 0.35, 0.35, 0.82);
}
