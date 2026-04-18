'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import type { MatchEvent } from '@/lib/playground/match-engine';
import { PlayerAvatar } from '@/components/player-avatar';
import { cn } from '@/lib/utils';

const LANE_LABELS = ['GK / Low block', 'Defence', 'Defence +', 'Midfield', 'Attack'];

type HomeToken = {
    id: number;
    code: number;
    photo?: string;
    web_name: string;
    team: number;
    element_type: number;
};

type Props = {
    events: MatchEvent[];
    homePlayers: HomeToken[];
};

/** Foosball-style 5 lanes; highlights active lane from sim event log. */
export function PlaygroundMatchPlayback({ events, homePlayers }: Props) {
    const reduceMotion = useReducedMotion();
    const [idx, setIdx] = useState(0);

    const meaningful = useMemo(
        () => events.filter((e) => e.type === 'goal' || e.type === 'save' || e.type === 'chance' || e.type === 'miss'),
        [events]
    );

    useEffect(() => {
        setIdx(0);
    }, [events]);

    useEffect(() => {
        if (!meaningful.length) return;
        if (reduceMotion) {
            setIdx(meaningful.length - 1);
            return;
        }
        const t = window.setInterval(() => {
            setIdx((i) => (i < meaningful.length - 1 ? i + 1 : i));
        }, 600);
        return () => window.clearInterval(t);
    }, [meaningful, reduceMotion]);

    const current = meaningful[idx];

    const playersByLane = useMemo(() => {
        const lanes: HomeToken[][] = [[], [], [], [], []];
        for (const p of homePlayers) {
            const et = p.element_type;
            if (et === 1) lanes[0].push(p);
            else if (et === 2) {
                lanes[1].push(p);
                if (lanes[2].length < 2) lanes[2].push(p);
            } else if (et === 3) lanes[3].push(p);
            else lanes[4].push(p);
        }
        return lanes;
    }, [homePlayers]);

    if (!events.length) return null;

    return (
        <div className="space-y-3" role="region" aria-label="Sim playback">
            <ul className="relative overflow-hidden rounded-xl border-2 border-foreground/80 bg-emerald-950/20 shadow-[4px_4px_0_0] shadow-foreground/90">
                {LANE_LABELS.map((label, lane) => (
                    <motion.div
                        key={label}
                        className={cn(
                            'flex min-h-[52px] items-center gap-2 border-b border-foreground/15 px-2 py-1.5 last:border-b-0',
                            current?.lane === lane && 'bg-primary/25 ring-2 ring-inset ring-primary/50'
                        )}
                        layout
                    >
                        <span className="w-24 shrink-0 text-[10px] font-bold uppercase tracking-wide text-muted-foreground sm:text-xs">
                            {label}
                        </span>
                        <div className="flex flex-1 flex-wrap justify-end gap-1">
                            {playersByLane[lane].slice(0, 4).map((p) => (
                                <div key={p.id} className="h-9 w-9 shrink-0 sm:h-10 sm:w-10">
                                    <PlayerAvatar
                                        player={{
                                            code: p.code,
                                            photo: p.photo,
                                            web_name: p.web_name,
                                            team: p.team,
                                            elementId: p.id,
                                        }}
                                        size="sm"
                                        dense
                                    />
                                </div>
                            ))}
                        </div>
                    </motion.div>
                ))}
            </ul>

            <AnimatePresence mode="wait">
                {current && (
                    <motion.p
                        key={`${current.minute}-${idx}`}
                        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                    >
                        <span className="font-mono text-muted-foreground">{current.minute}&apos;</span>{' '}
                        {current.description}
                    </motion.p>
                )}
            </AnimatePresence>

            {!reduceMotion && meaningful.length > 1 && (
                <div className="flex justify-center gap-2 text-xs text-muted-foreground">
                    <button
                        type="button"
                        className="rounded-md border border-border px-2 py-1 hover:bg-muted"
                        onClick={() => setIdx((i) => Math.max(0, i - 1))}
                    >
                        Prev beat
                    </button>
                    <span>
                        {idx + 1} / {meaningful.length}
                    </span>
                    <button
                        type="button"
                        className="rounded-md border border-border px-2 py-1 hover:bg-muted"
                        onClick={() => setIdx((i) => Math.min(meaningful.length - 1, i + 1))}
                    >
                        Next beat
                    </button>
                </div>
            )}
        </div>
    );
}
