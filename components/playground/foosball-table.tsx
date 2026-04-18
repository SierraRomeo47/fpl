'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useReducedMotion } from 'framer-motion';
import {
    assignAwayPlayersToLanes,
    assignPlayersToLanes,
    createFoosballState,
    stepFoosball,
    splitAwayXiIntoLanePlayers,
    splitXiIntoLanePlayers,
    HOME_ROD_X,
    AWAY_ROD_X,
    BALL_R,
    PITCH_Y_TOP,
    PITCH_Y_BOTTOM,
    type FoosballInitConfig,
    type FoosballState,
} from '@/lib/playground/foosball-engine';
import { squadAverageCpuReaction, type FoosballElement } from '@/lib/playground/foosball-attributes';
import { PlayerAvatar } from '@/components/player-avatar';
import { Button } from '@/components/ui/button';
import { buildFoosballShareText, recordFoosballMatchEnd } from '@/lib/playground/engagement';
import { cn } from '@/lib/utils';
import { Share2 } from 'lucide-react';

const LANE_LABELS = ['GK', 'Def', 'Mid', 'Fwd'];
/** 0–2: rods 1–3 (W/S) — not forward (3), which is a boundary rod */
const WSD_LANE_SET = [0, 1, 2] as const;
/** 1–3: rods 2–4 (arrows) — not GK, which is the other extreme */
const ARR_LANE_SET = [1, 2, 3] as const;
type WsdIdx = (typeof WSD_LANE_SET)[number];
type ArrIdx = (typeof ARR_LANE_SET)[number];

function clampWsd(n: number): WsdIdx {
    const a = n | 0;
    if (WSD_LANE_SET.includes(a as WsdIdx)) return a as WsdIdx;
    if (a < 0) return 0;
    if (a > 2) return 2;
    return 1;
}

function clampArr(n: number): ArrIdx {
    const a = n | 0;
    if (ARR_LANE_SET.includes(a as ArrIdx)) return a as ArrIdx;
    if (a < 1) return 1;
    if (a > 3) return 3;
    return 2;
}

/** When W/S and arrows would pick the same rod, prefer the next rod in the arrows set from `preferStart` */
function firstArrowsNot(avoid: number, preferStart: number): ArrIdx {
    const i0 = Math.max(0, ARR_LANE_SET.indexOf(clampArr(preferStart) as 1 | 2 | 3));
    for (let step = 0; step < 3; step++) {
        const idx = (i0 + step) % 3;
        const cand = ARR_LANE_SET[idx]!;
        if (cand !== avoid) return cand;
    }
    return (ARR_LANE_SET.find((x) => x !== avoid) ?? 2) as ArrIdx;
}

function firstWsdNot(avoid: number, preferStart: number): WsdIdx {
    for (let step = 0; step < 3; step++) {
        const idx = (WSD_LANE_SET.indexOf(clampWsd(preferStart)) + step) % 3;
        const cand = WSD_LANE_SET[idx]!;
        if (cand !== avoid) return cand;
    }
    const c = WSD_LANE_SET.find((x) => x !== avoid);
    return (c ?? 0) as WsdIdx;
}

function resolvePairedFromWasd(newWasd: number, arrows: number): { wasd: WsdIdx; arrows: ArrIdx } {
    const a = clampWsd(newWasd);
    let b = clampArr(arrows);
    if (a === b) b = firstArrowsNot(a, b);
    return { wasd: a, arrows: b };
}

function resolvePairedFromArrows(newArrows: number, wasd: number): { wasd: WsdIdx; arrows: ArrIdx } {
    const b = clampArr(newArrows);
    let a = clampWsd(wasd);
    if (a === b) a = firstWsdNot(b, a);
    return { wasd: a, arrows: b };
}

function buildInput(
    keys: Set<string>,
    laneWasd: number,
    laneArrows: number
): { homeLaneMoves: { lane: number; moveY: -1 | 0 | 1 }[] } {
    const w =
        (keys.has('w') || keys.has('W') || keys.has('__tw')) &&
        !keys.has('s') &&
        !keys.has('S') &&
        !keys.has('__ts');
    const s =
        (keys.has('s') || keys.has('S') || keys.has('__ts')) &&
        !keys.has('w') &&
        !keys.has('W') &&
        !keys.has('__tw');
    const mWasd: -1 | 0 | 1 = w ? -1 : s ? 1 : 0;

    const up =
        (keys.has('ArrowUp') || keys.has('__arU')) && !keys.has('ArrowDown') && !keys.has('__arD');
    const down =
        (keys.has('ArrowDown') || keys.has('__arD')) && !keys.has('ArrowUp') && !keys.has('__arU');
    const mAr: -1 | 0 | 1 = up ? -1 : down ? 1 : 0;

    const p = resolvePairedFromWasd(laneWasd, laneArrows);
    const a = p.wasd;
    const b = p.arrows;
    const out: { lane: number; moveY: -1 | 0 | 1 }[] = [];
    if (mWasd !== 0) out.push({ lane: a, moveY: mWasd });
    if (mAr !== 0) out.push({ lane: b, moveY: mAr });
    return { homeLaneMoves: out };
}

export type FoosballTableProps = {
    homeXi: FoosballElement[];
    awayXi: FoosballElement[];
    targetScore: 5 | 10;
    className?: string;
    /**
     * When false, the physics / animation loop is off (e.g. “press Start” on the parent page).
     * @default true
     */
    gameActive?: boolean;
    /**
     * Rendered only over the pitch (not over control text). Use for a pre-game “Start” gate.
     */
    pitchStartOverlay?: ReactNode;
};

type AnyEl = FoosballElement & {
    id?: number;
    code?: number;
    photo?: string;
    web_name?: string;
    team?: number;
};

function cycleWsd(d: 1 | -1, current: number): WsdIdx {
    const i0 = WSD_LANE_SET.indexOf(clampWsd(current) as 0);
    return WSD_LANE_SET[((i0 as number) + d + 3) % 3]!;
}

function cycleAr(d: 1 | -1, current: number): ArrIdx {
    const i0 = ARR_LANE_SET.indexOf(clampArr(current) as 1);
    return ARR_LANE_SET[((i0 as number) + d + 3) % 3]!;
}

function shouldPassRodKeyTarget(t: EventTarget | null) {
    if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) return true;
    if (t instanceof HTMLSelectElement) return true;
    return false;
}

export function FoosballTable({
    homeXi,
    awayXi,
    targetScore,
    className,
    gameActive = true,
    pitchStartOverlay = null,
}: FoosballTableProps) {
    const gameActiveRef = useRef(gameActive);
    gameActiveRef.current = gameActive;
    const reduceMotion = useReducedMotion();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const stateRef = useRef<FoosballState>(createFoosballState());
    const cfgRef = useRef<FoosballInitConfig | null>(null);
    const keysRef = useRef<Set<string>>(new Set());
    const [laneWasd, setLaneWasd] = useState(1);
    const [laneArrows, setLaneArrows] = useState(2);
    const rafRef = useRef<number>(0);
    const aliveRef = useRef(true);
    const lastTsRef = useRef<number>(0);
    const [frame, setFrame] = useState(0);
    const wasdRef = useRef(1);
    const arrowsRef = useRef(2);
    wasdRef.current = laneWasd;
    arrowsRef.current = laneArrows;

    const homeLanesUi = useMemo(() => splitXiIntoLanePlayers(homeXi), [homeXi]);
    const awayLanesUi = useMemo(() => splitAwayXiIntoLanePlayers(awayXi), [awayXi]);

    const cfg = useMemo<FoosballInitConfig>(() => {
        return {
            targetScore,
            homeLanes: assignPlayersToLanes(homeXi),
            awayLanes: assignAwayPlayersToLanes(awayXi),
            cpuReaction: squadAverageCpuReaction(awayXi),
            reducedMotion: !!reduceMotion,
        };
    }, [homeXi, awayXi, targetScore, reduceMotion]);

    cfgRef.current = cfg;

    const resetMatch = useCallback(() => {
        stateRef.current = createFoosballState();
        lastTsRef.current = 0;
        setFrame((n) => n + 1);
    }, []);

    useEffect(() => {
        resetMatch();
    }, [cfg, resetMatch]);

    const pump = useCallback((ts: number) => {
        if (!aliveRef.current || !gameActiveRef.current) return;
        const cfg0 = cfgRef.current;
        if (!cfg0) return;
        if (!lastTsRef.current) lastTsRef.current = ts;
        const dt = Math.min(0.05, (ts - lastTsRef.current) / 1000);
        lastTsRef.current = ts;

        const input = buildInput(keysRef.current, wasdRef.current, arrowsRef.current);
        stateRef.current = stepFoosball(cfg0, stateRef.current, input, dt, ts);
        setFrame((n) => n + 1);

        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
                const lw = canvas.width / dpr;
                const lh = canvas.height / dpr;
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                drawField(ctx, lw, lh, stateRef.current);
            }
        }

        if (aliveRef.current && gameActiveRef.current) {
            rafRef.current = requestAnimationFrame(pump);
        }
    }, []);

    const drawFrameOnce = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        const lw = canvas.width / dpr;
        const lh = canvas.height / dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawField(ctx, lw, lh, stateRef.current);
    }, []);

    useEffect(() => {
        if (gameActive) {
            aliveRef.current = true;
            lastTsRef.current = 0;
            rafRef.current = requestAnimationFrame(pump);
            return () => {
                aliveRef.current = false;
                cancelAnimationFrame(rafRef.current);
            };
        }
        aliveRef.current = false;
        cancelAnimationFrame(rafRef.current);
        drawFrameOnce();
        return undefined;
    }, [gameActive, pump, drawFrameOnce]);

    useEffect(() => {
        const wrap = wrapRef.current;
        if (!wrap) return;
        const ro = new ResizeObserver(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const r = wrap.getBoundingClientRect();
            const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
            canvas.width = Math.floor(r.width * dpr);
            canvas.height = Math.floor(r.height * dpr);
            canvas.style.width = `${r.width}px`;
            canvas.style.height = `${r.height}px`;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                drawField(ctx, r.width, r.height, stateRef.current);
            }
        });
        ro.observe(wrap);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (!e.ctrlKey && !e.metaKey && !e.altKey && !shouldPassRodKeyTarget(e.target)) {
                if (e.key === 'a' || e.key === 'A') {
                    e.preventDefault();
                    const p = resolvePairedFromWasd(cycleWsd(-1, wasdRef.current), arrowsRef.current);
                    wasdRef.current = p.wasd;
                    arrowsRef.current = p.arrows;
                    setLaneWasd(p.wasd);
                    setLaneArrows(p.arrows);
                    return;
                }
                if (e.key === 'd' || e.key === 'D') {
                    e.preventDefault();
                    const p = resolvePairedFromWasd(cycleWsd(1, wasdRef.current), arrowsRef.current);
                    wasdRef.current = p.wasd;
                    arrowsRef.current = p.arrows;
                    setLaneWasd(p.wasd);
                    setLaneArrows(p.arrows);
                    return;
                }
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    const p = resolvePairedFromArrows(cycleAr(-1, arrowsRef.current), wasdRef.current);
                    wasdRef.current = p.wasd;
                    arrowsRef.current = p.arrows;
                    setLaneWasd(p.wasd);
                    setLaneArrows(p.arrows);
                    return;
                }
                if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    const p = resolvePairedFromArrows(cycleAr(1, arrowsRef.current), wasdRef.current);
                    wasdRef.current = p.wasd;
                    arrowsRef.current = p.arrows;
                    setLaneWasd(p.wasd);
                    setLaneArrows(p.arrows);
                    return;
                }
            }
            keysRef.current.add(e.key);
            if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
            } else if (
                (e.key === 'ArrowLeft' || e.key === 'ArrowRight') &&
                !shouldPassRodKeyTarget(e.target)
            ) {
                e.preventDefault();
            }
        };
        const up = (e: KeyboardEvent) => {
            keysRef.current.delete(e.key);
        };
        window.addEventListener('keydown', down, { capture: true });
        window.addEventListener('keyup', up, { capture: true });
        return () => {
            window.removeEventListener('keydown', down, { capture: true });
            window.removeEventListener('keyup', up, { capture: true });
        };
    }, []);

    const bindTouch = (k: string) => ({
        onPointerDown: (e: React.PointerEvent) => {
            e.currentTarget.setPointerCapture?.(e.pointerId);
            e.preventDefault();
            keysRef.current.add(k);
        },
        onPointerUp: (e: React.PointerEvent) => {
            e.currentTarget.releasePointerCapture?.(e.pointerId);
            keysRef.current.delete(k);
        },
        onPointerCancel: () => {
            keysRef.current.delete(k);
        },
        onPointerLeave: () => {
            keysRef.current.delete(k);
        },
    });

    void frame;
    const st = stateRef.current;
    const won = st.phase === 'won';

    return (
        <div className={cn('space-y-2', className)}>
            <p className="text-xs text-muted-foreground">
                <kbd className="rounded border px-0.5">W</kbd>/<kbd className="rounded border px-0.5">S</kbd> move rods 1–3
                (left side); <kbd className="rounded border px-0.5">A</kbd>/<kbd className="rounded border px-0.5">D</kbd>{' '}
                step through rods 1–3. <kbd className="rounded border px-0.5">ArrowUp</kbd>/
                <kbd className="rounded border px-0.5">ArrowDown</kbd> move among rods 2–4;{' '}
                <kbd className="rounded border px-0.5">←</kbd>/<kbd className="rounded border px-0.5">→</kbd> step which
                arrow rod. The two bands can’t be on the same rod. On mobile, use the bottom strips.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground">W/S rod (1–3 · A/D)</span>
                <select
                    className="rounded border border-border bg-card px-2 py-1 text-foreground"
                    value={laneWasd}
                    onChange={(e) => {
                        const n = Number(e.target.value);
                        const p = resolvePairedFromWasd(n, laneArrows);
                        setLaneWasd(p.wasd);
                        setLaneArrows(p.arrows);
                    }}
                    aria-label="W and S control this rod (rods 1 to 3 only)"
                >
                    {WSD_LANE_SET.map((i) => {
                        const l = LANE_LABELS[i] ?? '?';
                        return (
                            <option key={l} value={i}>
                                {i + 1} {l}
                            </option>
                        );
                    })}
                </select>
                <span className="text-muted-foreground">Arrows rod (2–4 · ←/→)</span>
                <select
                    className="rounded border border-border bg-card px-2 py-1 text-foreground"
                    value={laneArrows}
                    onChange={(e) => {
                        const n = Number(e.target.value);
                        const p = resolvePairedFromArrows(n, laneWasd);
                        setLaneWasd(p.wasd);
                        setLaneArrows(p.arrows);
                    }}
                    aria-label="Arrow up and down control this rod (rods 2 to 4 only)"
                >
                    {ARR_LANE_SET.map((i) => {
                        const l = LANE_LABELS[i] ?? '?';
                        return (
                            <option key={`a-${l}`} value={i}>
                                {i + 1} {l}
                            </option>
                        );
                    })}
                </select>
            </div>

            <div className="pointer-events-none max-w-4xl rounded-lg border border-border bg-card px-2 py-1.5 font-mono text-xs tabular-nums text-foreground shadow-sm sm:text-sm">
                You {st.scoreHome} – {st.scoreAway} CPU · First to {targetScore}
            </div>

            <div
                ref={wrapRef}
                className="relative aspect-video w-full max-w-4xl touch-none overflow-hidden rounded-xl outline-none [&:focus-visible]:ring-2 [&:focus-visible]:ring-primary"
                tabIndex={0}
                role="application"
                aria-label="Foosball. Blue left, red right."
                onKeyDown={(e) => {
                    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
                }}
            >
                    <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full rounded-xl" />

                    <div
                        className="pointer-events-none absolute inset-0"
                        style={{
                            clipPath: `inset(${PITCH_Y_TOP * 100}% 6% ${(1 - PITCH_Y_BOTTOM) * 100}% 6%)`,
                        }}
                    >
                        {HOME_ROD_X.map((xNorm, lane) => {
                            const ry = st.homeRodY[lane];
                            const players = homeLanesUi[lane] ?? [];
                            const laneCfg = cfg.homeLanes[lane];
                            const offsets = laneCfg?.offsetsY ?? [0];
                            return offsets.map((off, mi) => {
                                const pl = players[mi] as AnyEl | undefined;
                                const yNorm = ry + off;
                                return (
                                    <div
                                        key={`h-${lane}-${mi}`}
                                        className="absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center sm:h-8 sm:w-8"
                                        style={{
                                            left: `${xNorm * 100}%`,
                                            top: `${yNorm * 100}%`,
                                        }}
                                    >
                                        <div
                                            className={cn(
                                                'rounded-full p-0.5 ring-2 ring-blue-500 ring-offset-2 ring-offset-background',
                                                lane === laneWasd && 'ring-amber-400',
                                                lane === laneArrows && 'ring-cyan-400',
                                                lane === laneWasd && lane === laneArrows && 'ring-amber-400',
                                            )}
                                        >
                                            {pl?.id != null ? (
                                                <PlayerAvatar
                                                    player={{
                                                        code: pl.code ?? 0,
                                                        photo: pl.photo,
                                                        web_name: pl.web_name ?? '?',
                                                        team: pl.team ?? 0,
                                                        elementId: pl.id,
                                                    }}
                                                    size="sm"
                                                    dense
                                                    className="h-full w-full"
                                                />
                                            ) : (
                                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground sm:h-8 sm:w-8">
                                                    ?
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            });
                        })}
                        {AWAY_ROD_X.map((xNorm, lane) => {
                            const ry = st.awayRodY[lane];
                            const players = awayLanesUi[lane] ?? [];
                            const laneCfg = cfg.awayLanes[lane];
                            const offsets = laneCfg?.offsetsY ?? [0];
                            return offsets.map((off, mi) => {
                                const pl = players[mi] as AnyEl | undefined;
                                const yNorm = ry + off;
                                return (
                                    <div
                                        key={`a-${lane}-${mi}`}
                                        className="absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center sm:h-8 sm:w-8"
                                        style={{
                                            left: `${xNorm * 100}%`,
                                            top: `${yNorm * 100}%`,
                                        }}
                                    >
                                        <div className="rounded-full p-0.5 ring-2 ring-red-500 ring-offset-2 ring-offset-background">
                                            {pl?.id != null ? (
                                                <PlayerAvatar
                                                    player={{
                                                        code: pl.code ?? 0,
                                                        photo: pl.photo,
                                                        web_name: pl.web_name ?? '?',
                                                        team: pl.team ?? 0,
                                                        elementId: pl.id,
                                                    }}
                                                    size="sm"
                                                    dense
                                                />
                                            ) : (
                                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] sm:h-8 sm:w-8">
                                                    ?
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            });
                        })}
                    </div>
                    {pitchStartOverlay}
                    {won && (
                        <FoosballResultOverlay
                            key={`f-${st.scoreHome}-${st.scoreAway}-${st.winner}`}
                            homeWin={st.winner === 'home'}
                            scoreHome={st.scoreHome}
                            scoreAway={st.scoreAway}
                            firstTo={targetScore}
                            onPlayAgain={resetMatch}
                        />
                    )}
            </div>

            <div
                className="mt-1 grid h-20 max-w-4xl grid-cols-2 gap-1 sm:mt-2 sm:hidden"
                aria-label="Phone rod controls"
            >
                <div className="grid grid-rows-2 gap-1" title="W/S rod">
                    <Button type="button" className="touch-manipulation text-lg" variant="secondary" {...bindTouch('__tw')}>
                        Up
                    </Button>
                    <Button type="button" className="touch-manipulation text-lg" variant="secondary" {...bindTouch('__ts')}>
                        Down
                    </Button>
                </div>
                <div className="grid grid-rows-2 gap-1" title="Arrow rod">
                    <Button type="button" className="touch-manipulation text-lg" variant="secondary" {...bindTouch('__arU')}>
                        Up
                    </Button>
                    <Button type="button" className="touch-manipulation text-lg" variant="secondary" {...bindTouch('__arD')}>
                        Down
                    </Button>
                </div>
            </div>
        </div>
    );
}

function FoosballResultOverlay({
    homeWin,
    scoreHome,
    scoreAway,
    firstTo,
    onPlayAgain,
}: {
    homeWin: boolean;
    scoreHome: number;
    scoreAway: number;
    firstTo: 5 | 10;
    onPlayAgain: () => void;
}) {
    const [streak, setStreak] = useState(0);
    const [best, setBest] = useState(0);
    const [isNew, setIsNew] = useState(false);

    useEffect(() => {
        const r = recordFoosballMatchEnd(homeWin);
        setStreak(r.streak);
        setBest(r.best);
        setIsNew(!!r.isNewRecord);
        if (r.isNewRecord) {
            toast.success('New personal best win streak on this device');
        } else if (r.streak >= 3) {
            toast('On a heater', { description: `${r.streak} foosball wins in a row` });
        }
    }, [homeWin]);

    const share = async () => {
        const line = buildFoosballShareText({
            won: homeWin,
            scoreHome,
            scoreAway,
            firstTo,
            streak: homeWin ? streak : 0,
        });
        try {
            await navigator.clipboard.writeText(line);
            toast.success('Copied a share line for X / your group chat');
        } catch {
            toast.error('Could not copy');
        }
    };

    return (
        <div className="pointer-events-auto absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-xl bg-background/88 px-4 text-center backdrop-blur-sm">
            <p className="text-xl font-bold text-foreground">
                {homeWin ? 'You win!' : 'CPU wins'}
            </p>
            <p className="text-sm text-muted-foreground">
                {scoreHome} – {scoreAway} · first to {firstTo}
            </p>
            {homeWin && (streak > 1 || best > 0) && (
                <p className="text-xs font-semibold text-primary">
                    Win streak: {streak}
                    {best > 0 ? ` · best ever: ${best}` : ''}
                </p>
            )}
            {isNew && homeWin && <p className="text-xs font-bold text-amber-600">New best streak</p>}
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                <Button type="button" variant="default" className="gap-1" onClick={share}>
                    <Share2 className="h-3.5 w-3.5" />
                    Copy share line
                </Button>
                <Button type="button" variant="secondary" onClick={onPlayAgain}>
                    Play again
                </Button>
            </div>
        </div>
    );
}

function drawField(ctx: CanvasRenderingContext2D, w: number, h: number, st: FoosballState) {
    const gx = (nx: number) => nx * w;
    const gy = (ny: number) => ny * h;

    const grd = ctx.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#14532d');
    grd.addColorStop(0.5, '#166534');
    grd.addColorStop(1, '#14532d');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);

    const pitchH = PITCH_Y_BOTTOM - PITCH_Y_TOP;
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(gx(0.06), gy(PITCH_Y_TOP), w * 0.88, h * pitchH);

    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(gx(0.5), gy(PITCH_Y_TOP));
    ctx.lineTo(gx(0.5), gy(PITCH_Y_BOTTOM));
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(gx(0.5), gy(0.5), Math.min(w, h) * 0.09, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, gy(0.38), gx(0.04), gy(0.24));
    ctx.fillRect(gx(0.96), gy(0.38), gx(0.04), gy(0.24));

    const bx = st.ball.x;
    const by = st.ball.y;
    const br = BALL_R * Math.min(w, h);
    drawFootballBall(ctx, gx(bx), gy(by), Math.max(3.5, br));
}

function drawFootballBall(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
    const rr = Math.max(r, 3.25);
    ctx.save();

    const sh = ctx.createRadialGradient(
        cx - rr * 0.42,
        cy - rr * 0.48,
        rr * 0.05,
        cx + rr * 0.18,
        cy + rr * 0.22,
        rr * 1.4,
    );
    sh.addColorStop(0, '#ffffff');
    sh.addColorStop(0.2, '#fbfbfb');
    sh.addColorStop(0.45, '#e2e2e2');
    sh.addColorStop(0.72, '#b0b0b0');
    sh.addColorStop(1, '#656565');

    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, Math.PI * 2);
    ctx.fillStyle = sh;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(cx - rr * 0.33, cy - rr * 0.36, rr * 0.24, rr * 0.15, -0.45, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, Math.PI * 2);
    ctx.clip();

    ctx.strokeStyle = 'rgba(22,22,22,0.9)';
    ctx.lineWidth = Math.max(0.85, rr * 0.078);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const n = 5;
    for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2 - Math.PI / 2;
        const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
        const mid = (a0 + a1) / 2;
        const tx = cx + Math.cos(mid) * rr * 0.36;
        const ty = cy + Math.sin(mid) * rr * 0.36;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a0) * rr * 0.84, cy + Math.sin(a0) * rr * 0.84);
        ctx.quadraticCurveTo(
            tx,
            ty,
            cx + Math.cos(a1) * rr * 0.84,
            cy + Math.sin(a1) * rr * 0.84,
        );
        ctx.stroke();
    }

    ctx.globalAlpha = 0.88;
    ctx.beginPath();
    ctx.moveTo(cx - rr * 0.92, cy - rr * 0.08);
    ctx.bezierCurveTo(
        cx - rr * 0.25,
        cy - rr * 0.88,
        cx + rr * 0.25,
        cy + rr * 0.88,
        cx + rr * 0.92,
        cy + rr * 0.08,
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - rr * 0.08, cy - rr * 0.92);
    ctx.bezierCurveTo(
        cx + rr * 0.88,
        cy - rr * 0.28,
        cx - rr * 0.88,
        cy + rr * 0.28,
        cx + rr * 0.08,
        cy + rr * 0.92,
    );
    ctx.stroke();

    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0.12 * Math.PI, 0.38 * Math.PI);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = Math.max(0.55, rr * 0.035);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(10,10,10,0.55)';
    ctx.lineWidth = Math.max(0.65, rr * 0.038);
    ctx.stroke();
}
