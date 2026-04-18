'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    FOOSBALL_LANE_COUNT,
    PITCH_Y_TOP,
    PITCH_Y_BOTTOM,
    type FoosballInitConfig,
    type FoosballState,
} from '@/lib/playground/foosball-engine';
import { squadAverageCpuReaction, type FoosballElement } from '@/lib/playground/foosball-attributes';
import { PlayerAvatar } from '@/components/player-avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type FoosballTableProps = {
    homeXi: FoosballElement[];
    awayXi: FoosballElement[];
    targetScore: 5 | 10;
    className?: string;
};

type AnyEl = FoosballElement & {
    id?: number;
    code?: number;
    photo?: string;
    web_name?: string;
    team?: number;
};

export function FoosballTable({ homeXi, awayXi, targetScore, className }: FoosballTableProps) {
    const reduceMotion = useReducedMotion();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const stateRef = useRef<FoosballState>(createFoosballState());
    const cfgRef = useRef<FoosballInitConfig | null>(null);
    const keysRef = useRef<Set<string>>(new Set());
    const [activeLane, setActiveLane] = useState(1);
    const activeLaneRef = useRef(1);
    activeLaneRef.current = activeLane;
    const rafRef = useRef<number>(0);
    const aliveRef = useRef(true);
    const lastTsRef = useRef<number>(0);
    const [frame, setFrame] = useState(0);

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
        if (!aliveRef.current) return;
        const cfg0 = cfgRef.current;
        if (!cfg0) return;
        if (!lastTsRef.current) lastTsRef.current = ts;
        const dt = Math.min(0.05, (ts - lastTsRef.current) / 1000);
        lastTsRef.current = ts;

        const keys = keysRef.current;
        const up = keys.has('w') || keys.has('ArrowUp');
        const dn = keys.has('s') || keys.has('ArrowDown');
        let move: -1 | 0 | 1 = 0;
        if (up && !dn) move = -1;
        else if (dn && !up) move = 1;

        const input = {
            moveY: move,
            activeLane: activeLaneRef.current,
        };

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

        rafRef.current = requestAnimationFrame(pump);
    }, []);

    useEffect(() => {
        aliveRef.current = true;
        rafRef.current = requestAnimationFrame(pump);
        return () => {
            aliveRef.current = false;
            cancelAnimationFrame(rafRef.current);
        };
    }, [pump]);

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
            keysRef.current.add(e.key);
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }
            if (e.key === 'a' || e.key === 'A') {
                e.preventDefault();
                setActiveLane((i) => (i + FOOSBALL_LANE_COUNT - 1) % FOOSBALL_LANE_COUNT);
            }
            if (e.key === 'd' || e.key === 'D') {
                e.preventDefault();
                setActiveLane((i) => (i + 1) % FOOSBALL_LANE_COUNT);
            }
            if (e.key === 'ArrowLeft') {
                setActiveLane((i) => (i + FOOSBALL_LANE_COUNT - 1) % FOOSBALL_LANE_COUNT);
            }
            if (e.key === 'ArrowRight') {
                setActiveLane((i) => (i + 1) % FOOSBALL_LANE_COUNT);
            }
        };
        const up = (e: KeyboardEvent) => {
            keysRef.current.delete(e.key);
        };
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        return () => {
            window.removeEventListener('keydown', down);
            window.removeEventListener('keyup', up);
        };
    }, []);

    void frame;
    const st = stateRef.current;
    const won = st.phase === 'won';

    return (
        <div className={cn('space-y-2', className)}>
            <p className="text-xs text-muted-foreground">
                Focus the table (
                <kbd className="rounded border px-1">Tab</kbd>) then{' '}
                <kbd className="rounded border px-1">W</kbd>/<kbd className="rounded border px-1">S</kbd> or arrows move
                your rod;                 <kbd className="rounded border px-1">A</kbd>/<kbd className="rounded border px-1">D</kbd> cycle 4
                rods (GK–DEF–MID–FWD).
            </p>

            <div
                ref={wrapRef}
                className="relative aspect-video w-full max-w-4xl touch-none overflow-hidden rounded-xl outline-none [&:focus-visible]:ring-2 [&:focus-visible]:ring-primary"
                tabIndex={0}
                role="application"
                aria-label="Foosball mini-game. You are blue on the left, computer is red."
                onKeyDown={(e) => {
                    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
                }}
            >
                <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full rounded-xl" />

                {/* DOM avatars overlaid on rod positions (clipped to inner pitch, same as canvas lines) */}
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
                                            lane === activeLane && 'ring-amber-500'
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

                {/* Ball hint overlay — canvas already draws ball; small dot optional */}

                {won && (
                    <div className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-background/80 backdrop-blur-sm">
                        <p className="mb-2 text-xl font-bold text-foreground">
                            {st.winner === 'home' ? 'You win!' : 'Computer wins'}
                        </p>
                        <p className="mb-4 text-sm text-muted-foreground">
                            {st.scoreHome} – {st.scoreAway}
                        </p>
                        <Button type="button" onClick={resetMatch}>
                            Play again
                        </Button>
                    </div>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
                <span className="font-mono tabular-nums">
                    You {st.scoreHome} – {st.scoreAway} CPU
                </span>
                <span className="text-muted-foreground">First to {targetScore}</span>
            </div>

            {/* Rod chips + touch */}
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Lane:</span>
                {[0, 1, 2, 3].map((i) => (
                    <Button
                        key={i}
                        type="button"
                        variant={activeLane === i ? 'default' : 'outline'}
                        size="sm"
                        className="h-8 w-8 min-w-8 p-0 text-xs"
                        onClick={() => {
                            setActiveLane(i);
                        }}
                    >
                        {i + 1}
                    </Button>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:hidden">
                <Button
                    type="button"
                    variant="secondary"
                    className="h-14 select-none text-lg touch-manipulation"
                    onPointerDown={(e) => {
                        e.preventDefault();
                        keysRef.current.add('w');
                    }}
                    onPointerUp={() => keysRef.current.delete('w')}
                    onPointerLeave={() => keysRef.current.delete('w')}
                >
                    Up
                </Button>
                <Button
                    type="button"
                    variant="secondary"
                    className="h-14 select-none text-lg touch-manipulation"
                    onPointerDown={(e) => {
                        e.preventDefault();
                        keysRef.current.add('s');
                    }}
                    onPointerUp={() => keysRef.current.delete('s')}
                    onPointerLeave={() => keysRef.current.delete('s')}
                >
                    Down
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

/** 3D-ish white ball with dark seam lines (truncated-icosahedron style). */
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
