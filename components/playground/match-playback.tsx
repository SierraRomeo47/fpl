'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import type { MatchEvent } from '@/lib/playground/match-engine';
import { PlayerAvatar } from '@/components/player-avatar';
import { cn } from '@/lib/utils';
import { Pause, Play, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LANE_LABELS = ['GK / Low block', 'Defence', 'Defence +', 'Midfield', 'Attack'];

type PitchToken = {
    id: number;
    code: number;
    photo?: string;
    web_name: string;
    team: number;
    element_type: number;
};

type Props = {
    events: MatchEvent[];
    homePlayers: PitchToken[];
    /** When set, lane avatars follow the attacking side on each highlight. */
    awayPlayers?: PitchToken[];
};

function playersByLane(players: PitchToken[]) {
    const lanes: PitchToken[][] = [[], [], [], [], []];
    for (const p of players) {
        const et = p.element_type;
        if (et === 1) lanes[0].push(p);
        else if (et === 2) {
            lanes[1].push(p);
            if (lanes[2].length < 2) lanes[2].push(p);
        } else if (et === 3) lanes[3].push(p);
        else lanes[4].push(p);
    }
    return lanes;
}

/** Foosball-style 5 lanes; highlights active lane from sim event log. */
export function PlaygroundMatchPlayback({ events, homePlayers, awayPlayers }: Props) {
    const reduceMotion = useReducedMotion();
    const [idx, setIdx] = useState(0);
    const [playing, setPlaying] = useState(true);

    const meaningful = useMemo(
        () =>
            events.filter(
                (e) => e.type === 'goal' || e.type === 'save' || e.type === 'chance' || e.type === 'miss'
            ),
        [events]
    );

    useEffect(() => {
        setIdx(0);
        setPlaying(!reduceMotion);
    }, [events, reduceMotion]);

    useEffect(() => {
        if (!meaningful.length) return;
        if (reduceMotion) {
            setIdx(meaningful.length - 1);
            return;
        }
        if (!playing) return;
        const t = window.setInterval(() => {
            setIdx((i) => (i < meaningful.length - 1 ? i + 1 : i));
        }, 600);
        return () => window.clearInterval(t);
    }, [meaningful, reduceMotion, playing]);

    const current = meaningful[idx];

    const laneTokens = useMemo(() => {
        const useAway = awayPlayers?.length && current?.side === 'away';
        return playersByLane(useAway ? awayPlayers! : homePlayers);
    }, [homePlayers, awayPlayers, current?.side]);

    const goPrev = useCallback(() => setIdx((i) => Math.max(0, i - 1)), []);
    const goNext = useCallback(
        () => setIdx((i) => Math.min(Math.max(0, meaningful.length - 1), i + 1)),
        [meaningful.length]
    );
    const replay = useCallback(() => {
        setIdx(0);
        setPlaying(true);
    }, []);

    const onScrub = useCallback(
        (v: number) => {
            const max = Math.max(0, meaningful.length - 1);
            setIdx(Math.min(max, Math.max(0, v)));
        },
        [meaningful.length]
    );

    if (!events.length) return null;

    const atEnd = meaningful.length > 0 && idx >= meaningful.length - 1;
    const showControls = meaningful.length > 0;

    return (
        <div className="space-y-3" role="region" aria-label="Sim playback">
            {showControls && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-2 py-2">
                    <div className="flex flex-wrap items-center gap-1">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 px-2"
                            onClick={() => setPlaying((p) => !p)}
                            disabled={reduceMotion || meaningful.length <= 1}
                            aria-pressed={playing}
                            aria-label={playing ? 'Pause playback' : 'Play playback'}
                        >
                            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                            {playing ? 'Pause' : 'Play'}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 px-2"
                            onClick={goPrev}
                            disabled={idx <= 0}
                            aria-label="Previous event"
                        >
                            <SkipBack className="h-3.5 w-3.5" />
                            Prev
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 px-2"
                            onClick={goNext}
                            disabled={!meaningful.length || idx >= meaningful.length - 1}
                            aria-label="Next event"
                        >
                            Next
                            <SkipForward className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 px-2"
                            onClick={replay}
                            aria-label="Replay from first event"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Replay
                        </Button>
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground">
                        {meaningful.length ? idx + 1 : 0} / {meaningful.length}
                        {atEnd && playing && !reduceMotion ? ' · end' : ''}
                    </span>
                    {meaningful.length > 1 && (
                        <label className="flex min-w-[140px] flex-1 items-center gap-2 text-xs text-muted-foreground sm:min-w-[200px]">
                            <span className="sr-only">Scrub timeline</span>
                            <input
                                type="range"
                                min={0}
                                max={Math.max(0, meaningful.length - 1)}
                                value={idx}
                                onChange={(e) => onScrub(Number.parseInt(e.target.value, 10))}
                                className="h-2 flex-1 accent-primary"
                                aria-valuemin={0}
                                aria-valuemax={meaningful.length - 1}
                                aria-valuenow={idx}
                            />
                        </label>
                    )}
                </div>
            )}

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
                            {laneTokens[lane].slice(0, 4).map((p) => (
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

            {awayPlayers?.length ? (
                <p className="text-center text-[10px] text-muted-foreground">
                    Avatars follow the attack: {current?.side === 'away' ? 'ghost squad' : 'your XI'} on this
                    highlight.
                </p>
            ) : null}

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
        </div>
    );
}
