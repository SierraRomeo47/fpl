'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, ChevronDown, PinOff, RefreshCcw, UserCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GwSquadStatsTable, type FplPick } from '@/components/gw-squad-stats-table';
import { normaliseLiveElementMap, type LiveElementRow, type PlayerProfile } from '@/lib/live-match-utils';

type PinnedRival = { entry: number; team_name: string; player_name: string };

export function RivalRadar({ currentGw }: { currentGw: number | undefined }) {
    const [rivals, setRivals] = useState<PinnedRival[]>([]);
    const [rivalPoints, setRivalPoints] = useState<Record<number, { gw_points: number; total_points: number }>>({});
    const [picksByEntry, setPicksByEntry] = useState<
        Record<number, { picks: FplPick[]; active_chip: string | null }>
    >({});
    const [liveMap, setLiveMap] = useState<Map<number, LiveElementRow> | null>(null);
    const [playersMap, setPlayersMap] = useState<Map<number, PlayerProfile>>(new Map());
    const [teamShort, setTeamShort] = useState<Map<number, string>>(new Map());
    const [loading, setLoading] = useState(false);
    const [expandedEntry, setExpandedEntry] = useState<number | null>(null);

    const loadRivals = useCallback(() => {
        const saved = localStorage.getItem('fpl_pinned_rivals');
        if (saved) {
            try {
                setRivals(JSON.parse(saved));
            } catch {
                /* ignore */
            }
        }
    }, []);

    useEffect(() => {
        loadRivals();
        window.addEventListener('storage', loadRivals);
        return () => window.removeEventListener('storage', loadRivals);
    }, [loadRivals]);

    const fetchRivalScores = useCallback(async () => {
        if (!currentGw || rivals.length === 0) return;
        setLoading(true);

        try {
            const [bootRes, liveRes] = await Promise.all([
                fetch('/api/fpl/bootstrap-static/'),
                fetch(`/api/fpl/event/${currentGw}/live/`),
            ]);

            if (bootRes.ok) {
                const b = await bootRes.json();
                const pmap = new Map<number, PlayerProfile>();
                for (const el of b.elements || []) {
                    pmap.set(el.id, {
                        id: el.id,
                        web_name: el.web_name,
                        element_type: el.element_type,
                        team: el.team,
                    });
                }
                setPlayersMap(pmap);
                const tm = new Map<number, string>();
                for (const t of b.teams || []) {
                    tm.set(t.id, t.short_name);
                }
                setTeamShort(tm);
            }

            if (liveRes.ok) {
                const liveP = await liveRes.json();
                setLiveMap(normaliseLiveElementMap(liveP));
            } else {
                setLiveMap(null);
            }

            const newPoints: Record<number, { gw_points: number; total_points: number }> = {};
            const newPicks: Record<number, { picks: FplPick[]; active_chip: string | null }> = {};

            await Promise.all(
                rivals.map(async (r) => {
                    const res = await fetch(`/api/fpl/entry/${r.entry}/event/${currentGw}/picks/`);
                    if (!res.ok) return;
                    const data = await res.json();
                    const gwPoints =
                        Number(data.entry_history?.points ?? 0) -
                        Number(data.entry_history?.event_transfers_cost ?? 0);
                    newPoints[r.entry] = {
                        gw_points: gwPoints,
                        total_points: Number(data.entry_history?.total_points ?? 0),
                    };
                    const rawPicks = (data.picks || []) as FplPick[];
                    newPicks[r.entry] = {
                        picks: rawPicks,
                        active_chip: (data.active_chip ?? null) as string | null,
                    };
                })
            );

            setRivalPoints(newPoints);
            setPicksByEntry(newPicks);
        } catch (e) {
            console.error('Failed to sync radar.', e);
        } finally {
            setLoading(false);
        }
    }, [currentGw, rivals]);

    useEffect(() => {
        void fetchRivalScores();
    }, [fetchRivalScores]);

    const removeRival = (entryId: number) => {
        const newRivals = rivals.filter((r) => r.entry !== entryId);
        setRivals(newRivals);
        localStorage.setItem('fpl_pinned_rivals', JSON.stringify(newRivals));
        if (expandedEntry === entryId) setExpandedEntry(null);
    };

    if (rivals.length === 0) return null;

    return (
        <Card className="relative min-w-0 max-w-full overflow-x-auto border-border bg-gradient-to-br from-surface to-background shadow-md">
            <div className="absolute left-0 top-0 h-full w-1 bg-destructive" />
            <CardHeader className="border-b border-border/50 p-4 pb-2 md:p-6">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Activity className="h-5 w-5 text-destructive" />
                        Live Rival Radar
                    </CardTitle>
                    <button
                        type="button"
                        onClick={() => void fetchRivalScores()}
                        disabled={loading}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Refresh rival data"
                    >
                        <RefreshCcw className={cn('h-4 w-4', loading && 'animate-spin')} />
                    </button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                    Tap a rival to open their GW squad — same stat breakdown as Live Match Center (captain multiplier
                    applied to points).
                </p>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                    {rivals.map((r) => {
                        const open = expandedEntry === r.entry;
                        const picksPayload = picksByEntry[r.entry];
                        return (
                            <div key={r.entry}>
                                <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setExpandedEntry((e) => (e === r.entry ? null : r.entry))}
                                        className="flex min-w-0 flex-1 items-center gap-2 rounded-lg text-left hover:bg-muted/30 sm:gap-3"
                                    >
                                        <ChevronDown
                                            className={cn(
                                                'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                                                open && 'rotate-180'
                                            )}
                                        />
                                        <UserCircle2 className="h-8 w-8 shrink-0 text-muted-foreground" />
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-bold max-w-[140px] md:max-w-[200px]">
                                                {r.team_name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{r.player_name}</p>
                                        </div>
                                    </button>

                                    <div className="flex items-center justify-end gap-4 pl-8 sm:pl-0">
                                        {rivalPoints[r.entry] ? (
                                            <>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                                        GW {currentGw}
                                                    </p>
                                                    <p className="text-lg font-black text-primary">
                                                        {rivalPoints[r.entry].gw_points}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                                        Total
                                                    </p>
                                                    <p className="text-lg font-bold">{rivalPoints[r.entry].total_points}</p>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="h-8 w-20 animate-pulse rounded bg-muted" />
                                        )}

                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeRival(r.entry);
                                            }}
                                            className="ml-1 rounded-lg bg-muted p-2 text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
                                            aria-label="Unpin rival"
                                        >
                                            <PinOff className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                {open && liveMap && picksPayload?.picks?.length ? (
                                    <div className="min-w-0 max-w-full border-t border-border/50 bg-muted/15 px-2 pb-4 pt-1 md:px-4">
                                        <GwSquadStatsTable
                                            picks={picksPayload.picks}
                                            liveMap={liveMap}
                                            playersMap={playersMap}
                                            teamShort={teamShort}
                                            activeChip={picksPayload.active_chip}
                                        />
                                    </div>
                                ) : open && !liveMap ? (
                                    <div className="border-t border-border/50 px-4 pb-4 pt-2 text-xs text-muted-foreground">
                                        Live GW data could not be loaded. Try refresh.
                                    </div>
                                ) : open && !picksPayload?.picks?.length ? (
                                    <div className="border-t border-border/50 px-4 pb-4 pt-2 text-xs text-muted-foreground">
                                        Squad picks unavailable for this gameweek.
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
