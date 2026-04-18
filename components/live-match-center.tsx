'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    type FixtureStatSnapshot,
    extractFixtureStatsFromExplain,
    type LiveElementRow,
    normaliseLiveElementMap,
    pointsForFixtureBlock,
    POS_SHORT,
    type PlayerProfile,
} from '@/lib/live-match-utils';

type GwOption = { id: number; label: string };

type BootstrapEvent = { id: number; finished: boolean; is_current: boolean };

type FixtureRow = {
    id: number;
    /** FPL gameweek id; used to guard against unfiltered fixture lists */
    event?: number;
    team_h: number;
    team_a: number;
    kickoff_time: string | null;
    started: boolean;
    finished_provisional: boolean;
    finished: boolean;
    minutes: number;
    team_h_score: number;
    team_a_score: number;
    stats?: { identifier: string; a: { element: number; value: number }[]; h: unknown[] }[];
};

type TeamInfo = { id: number; short_name: string; name: string; code: number };

function teamCrestSrc(code: number): string {
    return `https://resources.premierleague.com/premierleague/badges/70/t${code}.png`;
}

function TeamCrest({
    code,
    label,
    className,
}: {
    code: number;
    label: string;
    className?: string;
}) {
    return (
        <img
            src={teamCrestSrc(code)}
            alt={label ? `${label} club crest` : 'Club crest'}
            className={cn('h-8 w-8 shrink-0 object-contain sm:h-9 sm:w-9', className)}
            loading="lazy"
            decoding="async"
        />
    );
}

/** Kickoff in local date + time for fixture rows (collapsed + expanded). */
function formatFixtureSchedule(kickoffIso: string | null): { dateLine: string; timeLine: string } | null {
    if (!kickoffIso) return null;
    const d = new Date(kickoffIso);
    if (Number.isNaN(d.getTime())) return null;
    return {
        dateLine: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
        timeLine: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
    };
}

function buildGwOptionsFromEvents(events: BootstrapEvent[]): GwOption[] {
    if (!events?.length) return [];
    return [...events]
        .sort((a, b) => a.id - b.id)
        .map((e) => {
            let tag = '';
            if (e.is_current) tag = e.finished ? ' · current (complete)' : ' · current / live';
            else if (e.finished) tag = ' · finished';
            return { id: e.id, label: `GW ${e.id}${tag}` };
        });
}

function resolveDefaultGwId(events: BootstrapEvent[], currentEventId?: number): number | null {
    if (!events.length) return null;
    const ids = new Set(events.map((e) => e.id));
    if (currentEventId != null && ids.has(currentEventId)) return currentEventId;
    const cur = events.find((e) => e.is_current);
    if (cur) return cur.id;
    const lastFin = [...events].filter((e) => e.finished).sort((a, b) => b.id - a.id)[0];
    if (lastFin) return lastFin.id;
    return events[0]?.id ?? null;
}

type RosterRow = {
    profile: PlayerProfile;
    total: number;
    stats: FixtureStatSnapshot | null;
};

function fmtStat(v: number | null | undefined): string {
    if (v == null || Number.isNaN(v)) return '—';
    return String(v);
}

/**
 * Players with non-zero FPL points this fixture who were not on 0 minutes (i.e. involved in the match).
 */
function buildRosterForTeam(
    teamId: number,
    fixtureId: number,
    live: Map<number, LiveElementRow> | null,
    players: Map<number, PlayerProfile>
): RosterRow[] {
    if (!live) return [];
    const out: RosterRow[] = [];
    for (const profile of players.values()) {
        if (profile.team !== teamId) continue;
        const row = live.get(profile.id);
        const b = pointsForFixtureBlock(row?.explain, fixtureId);
        const stats = extractFixtureStatsFromExplain(row?.explain, fixtureId);
        if (b.total === 0) continue;
        const mins = stats?.minutes;
        if (mins === 0) continue;
        out.push({ profile, total: b.total, stats });
    }
    out.sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        return a.profile.web_name.localeCompare(b.profile.web_name);
    });
    return out;
}

type LiveMatchCenterProps = { currentEventId?: number };

export function LiveMatchCenter({ currentEventId }: LiveMatchCenterProps) {
    const [teams, setTeams] = useState<TeamInfo[]>([]);
    const [players, setPlayers] = useState<Map<number, PlayerProfile>>(new Map());
    const [gwOptions, setGwOptions] = useState<GwOption[]>([]);
    const [selectedGw, setSelectedGw] = useState<number | null>(null);
    const [fixtures, setFixtures] = useState<FixtureRow[]>([]);
    const [live, setLive] = useState<Map<number, LiveElementRow> | null>(null);
    const [liveError, setLiveError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingData, setLoadingData] = useState(false);
    const [bootstrapDone, setBootstrapDone] = useState(false);
    const hasActiveRef = useRef(false);

    const loadEventData = useCallback(async (eventId: number) => {
        setLoadingData(true);
        setLiveError(null);
        try {
            const [fixRes, liveRes] = await Promise.all([
                fetch(`/api/fpl/fixtures/?event=${eventId}`),
                fetch(`/api/fpl/event/${eventId}/live/`),
            ]);
            if (!fixRes.ok) throw new Error('Failed to load fixtures');
            const fixData = (await fixRes.json()) as FixtureRow[];
            const raw = Array.isArray(fixData) ? fixData : [];
            const scoped = raw.filter((f) => f.event == null || f.event === eventId);
            setFixtures(scoped);
            hasActiveRef.current =
                scoped.length > 0 && scoped.some((f) => f.started && !f.finished_provisional);
            if (liveRes.ok) {
                const liveP = (await liveRes.json()) as any;
                setLive(normaliseLiveElementMap(liveP));
            } else {
                setLive(null);
                setLiveError('Point breakdowns will appear when the live data feed is available.');
            }
        } catch (e) {
            console.error('LiveMatchCenter', e);
            setLiveError('Could not load all match data. Try again shortly.');
        } finally {
            setLoadingData(false);
        }
    }, []);

    useEffect(() => {
        let m = true;
        (async () => {
            try {
                setLoading(true);
                const res = await fetch('/api/fpl/bootstrap-static/');
                if (!res.ok) return;
                const b = await res.json();
                if (!m) return;
                setTeams(
                    (b.teams || []).map((t: { id: number; short_name: string; name: string; code?: number }) => ({
                        id: t.id,
                        short_name: t.short_name,
                        name: t.name,
                        code: typeof t.code === 'number' ? t.code : 0,
                    }))
                );
                const pmap = new Map<number, PlayerProfile>();
                for (const el of b.elements || []) {
                    pmap.set(el.id, {
                        id: el.id,
                        web_name: el.web_name,
                        element_type: el.element_type,
                        team: el.team,
                    });
                }
                setPlayers(pmap);
                const evs = (b.events || []) as BootstrapEvent[];
                setGwOptions(buildGwOptionsFromEvents(evs));
                const useId = resolveDefaultGwId(evs, currentEventId);
                if (useId != null) {
                    setSelectedGw(useId);
                } else {
                    setSelectedGw(null);
                }
            } catch (e) {
                console.error('LiveMatchCenter bootstrap', e);
            } finally {
                if (m) {
                    setLoading(false);
                    setBootstrapDone(true);
                }
            }
        })();
        return () => {
            m = false;
        };
    }, [currentEventId]);

    useEffect(() => {
        if (!bootstrapDone || !selectedGw) return;
        void loadEventData(selectedGw);
    }, [bootstrapDone, selectedGw, loadEventData]);

    useEffect(() => {
        if (!selectedGw) return;
        const id = window.setInterval(() => {
            if (hasActiveRef.current) {
                void loadEventData(selectedGw);
            }
        }, 45_000);
        return () => clearInterval(id);
    }, [selectedGw, loadEventData]);

    const getTeam = (id: number) => teams.find((t) => t.id === id);

    const sortedFixtures = useMemo(() => {
        const scoped =
            selectedGw == null
                ? fixtures
                : fixtures.filter((f) => f.event == null || f.event === selectedGw);
        /** Chronological by kickoff (earliest first). Fixtures without kickoff sort last. */
        return [...scoped].sort((a, b) => {
            const ta = a.kickoff_time ? new Date(a.kickoff_time).getTime() : Number.MAX_SAFE_INTEGER;
            const tb = b.kickoff_time ? new Date(b.kickoff_time).getTime() : Number.MAX_SAFE_INTEGER;
            if (ta !== tb) return ta - tb;
            return a.id - b.id;
        });
    }, [fixtures, selectedGw]);

    const hasLive = sortedFixtures.some((f) => f.started && !f.finished_provisional);

    if (loading) return null;

    return (
        <Card className="border-border">
            <CardHeader className="p-4 md:p-6 pb-2">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <CardTitle className="text-lg flex flex-wrap items-center gap-2">
                        <Activity
                            className={cn('w-5 h-5', hasLive ? 'text-positive animate-pulse' : 'text-primary')}
                        />
                        Live Match Center
                        {hasLive && (
                            <Badge className="bg-positive-muted text-positive font-bold border border-positive/40">
                                L I V E
                            </Badge>
                        )}
                    </CardTitle>
                    {gwOptions.length > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground font-medium">Gameweek</span>
                            <select
                                className="rounded-md border border-border bg-card px-2 py-1.5 text-sm font-medium text-foreground"
                                value={String(selectedGw ?? '')}
                                onChange={(e) => setSelectedGw(Number(e.target.value) || null)}
                            >
                                {gwOptions.map((g) => (
                                    <option key={g.id} value={g.id}>
                                        {g.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
                {liveError && <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">{liveError}</p>}
                {loadingData && <p className="text-xs text-muted-foreground mt-1">Refreshing fixtures…</p>}
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-2">
                {sortedFixtures.length === 0 && (
                    <p className="text-sm text-muted-foreground">No matches for this gameweek in the feed.</p>
                )}
                <Accordion type="multiple" className="w-full space-y-2">
                    {sortedFixtures.map((match) => {
                        const isLiveM = match.started && !match.finished_provisional;
                        const isFinishedM = match.finished_provisional || match.finished;
                        const hasStarted = match.started;
                        const schedule = formatFixtureSchedule(match.kickoff_time);
                        const homeT = getTeam(match.team_h);
                        const awayT = getTeam(match.team_a);
                        const homeN = homeT?.short_name || '?';
                        const awayN = awayT?.short_name || '?';
                        const homeRoster = buildRosterForTeam(match.team_h, match.id, live, players);
                        const awayRoster = buildRosterForTeam(match.team_a, match.id, live, players);

                        return (
                            <AccordionItem
                                key={match.id}
                                value={String(match.id)}
                                className="rounded-xl border border-border bg-surface/60 px-3 has-[data-state=open]:bg-surface"
                            >
                                <AccordionTrigger className="py-3 hover:no-underline [&>svg]:shrink-0">
                                    <div className="flex w-full flex-col gap-2 pr-2 text-left">
                                        <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
                                            <div className="flex min-w-0 items-center justify-end gap-2">
                                                <div className="min-w-0 text-right">
                                                    <div className="truncate font-headline text-sm font-bold leading-tight sm:text-base">
                                                        {homeT?.name ?? homeN}
                                                    </div>
                                                    <div className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                        {homeN}
                                                    </div>
                                                </div>
                                                {homeT?.code != null ? (
                                                    <TeamCrest code={homeT.code} label={homeT?.name ?? homeN} />
                                                ) : (
                                                    <div className="h-8 w-8 shrink-0 rounded-md bg-muted sm:h-9 sm:w-9" aria-hidden />
                                                )}
                                            </div>
                                            <div
                                                className={cn(
                                                    'flex shrink-0 justify-center',
                                                    isLiveM && 'text-positive',
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        'rounded-md bg-muted px-3 py-1 text-base font-black tabular-nums sm:text-lg',
                                                        isLiveM && 'text-positive ring-1 ring-positive/40',
                                                    )}
                                                >
                                                    {hasStarted
                                                        ? `${match.team_h_score} – ${match.team_a_score}`
                                                        : 'v'}
                                                </span>
                                            </div>
                                            <div className="flex min-w-0 items-center justify-start gap-2">
                                                {awayT?.code != null ? (
                                                    <TeamCrest code={awayT.code} label={awayT?.name ?? awayN} />
                                                ) : (
                                                    <div className="h-8 w-8 shrink-0 rounded-md bg-muted sm:h-9 sm:w-9" aria-hidden />
                                                )}
                                                <div className="min-w-0 text-left">
                                                    <div className="truncate font-headline text-sm font-bold leading-tight sm:text-base">
                                                        {awayT?.name ?? awayN}
                                                    </div>
                                                    <div className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                        {awayN}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-center text-[11px] font-medium text-muted-foreground sm:text-xs">
                                            {schedule ? (
                                                <>
                                                    <span>{schedule.dateLine}</span>
                                                    <span className="text-muted-foreground/45" aria-hidden>
                                                        ·
                                                    </span>
                                                    <span className="tabular-nums">{schedule.timeLine}</span>
                                                </>
                                            ) : (
                                                <span>Kickoff TBA</span>
                                            )}
                                            {isLiveM && (
                                                <>
                                                    <span className="text-muted-foreground/45" aria-hidden>
                                                        ·
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 font-bold text-positive">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        LIVE {match.minutes ?? '—'}&rsquo;
                                                    </span>
                                                </>
                                            )}
                                            {isFinishedM && !isLiveM && (
                                                <>
                                                    <span className="text-muted-foreground/45" aria-hidden>
                                                        ·
                                                    </span>
                                                    <span className="font-bold text-foreground">FT</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    {live == null && (
                                        <p className="text-xs text-muted-foreground">Loading player breakdowns…</p>
                                    )}
                                    {live && (homeRoster.length > 0 || awayRoster.length > 0) ? (
                                        <div className="pt-2">
                                            <Tabs defaultValue="home" className="w-full">
                                                <TabsList className="mb-2 grid w-full max-w-md grid-cols-2 text-xs sm:text-sm">
                                                    <TabsTrigger
                                                        value="home"
                                                        className="flex items-center justify-center gap-2 text-xs sm:text-sm"
                                                    >
                                                        {homeT?.code != null && homeT.code > 0 && (
                                                            <TeamCrest
                                                                code={homeT.code}
                                                                label={homeT?.name ?? 'Home'}
                                                                className="h-5 w-5 sm:h-6 sm:w-6"
                                                            />
                                                        )}
                                                        <span className="truncate">{homeT?.name || 'Home'}</span>
                                                    </TabsTrigger>
                                                    <TabsTrigger
                                                        value="away"
                                                        className="flex items-center justify-center gap-2 text-xs sm:text-sm"
                                                    >
                                                        {awayT?.code != null && awayT.code > 0 && (
                                                            <TeamCrest
                                                                code={awayT.code}
                                                                label={awayT?.name ?? 'Away'}
                                                                className="h-5 w-5 sm:h-6 sm:w-6"
                                                            />
                                                        )}
                                                        <span className="truncate">{awayT?.name || 'Away'}</span>
                                                    </TabsTrigger>
                                                </TabsList>
                                                <TabsContent value="home">
                                                    <PlayerRosterTable roster={homeRoster} teamLabel={homeN} />
                                                </TabsContent>
                                                <TabsContent value="away">
                                                    <PlayerRosterTable roster={awayRoster} teamLabel={awayN} />
                                                </TabsContent>
                                            </Tabs>
                                        </div>
                                    ) : live && hasStarted ? (
                                        <p className="pt-2 text-xs text-muted-foreground">
                                            No per-player point lines in the live feed for this match yet, or
                                            play has not been attributed to the FPL API.
                                        </p>
                                    ) : null}
                                </AccordionContent>
                            </AccordionItem>
                        );
                    })}
                </Accordion>
            </CardContent>
        </Card>
    );
}

function PlayerRosterTable({
    roster,
    teamLabel,
}: {
    roster: RosterRow[];
    teamLabel: string;
}) {
    if (roster.length === 0) {
        return (
            <p className="text-xs text-muted-foreground">
                No players with FPL points in this match for {teamLabel} yet — or live data is still updating.
            </p>
        );
    }

    return (
        <ScrollArea className="max-h-[min(28rem,70vh)] w-full rounded-md border border-border">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] caption-bottom text-[11px]">
                    <thead className="sticky top-0 z-[1] border-b border-border bg-muted/80 backdrop-blur-sm">
                        <tr className="text-left text-muted-foreground">
                            <th className="w-11 px-1.5 py-1 font-semibold tabular-nums">Pts</th>
                            <th className="min-w-[6.5rem] px-1 py-1 font-semibold">Player</th>
                            <th className="w-9 px-0.5 py-1 font-semibold">Pos</th>
                            <th className="w-9 px-0.5 py-1 font-semibold" title="Minutes played">
                                Min
                            </th>
                            <th className="w-7 px-0.5 py-1 font-semibold" title="Goals">
                                G
                            </th>
                            <th className="w-7 px-0.5 py-1 font-semibold" title="Assists">
                                A
                            </th>
                            <th className="w-7 px-0.5 py-1 font-semibold" title="Clean sheet">
                                CS
                            </th>
                            <th className="w-8 px-0.5 py-1 font-semibold" title="Goals conceded">
                                GC
                            </th>
                            <th className="w-7 px-0.5 py-1 font-semibold" title="Saves">
                                Sv
                            </th>
                            <th className="w-8 px-0.5 py-1 font-semibold" title="Clearances / blocks / interceptions">
                                CBI
                            </th>
                            <th className="w-7 px-0.5 py-1 font-semibold" title="Yellow cards">
                                YC
                            </th>
                            <th className="w-7 px-0.5 py-1 font-semibold" title="Red cards">
                                RC
                            </th>
                            <th className="w-9 px-0.5 py-1 font-semibold" title="Bonus points system">
                                BPS
                            </th>
                            <th className="w-9 px-0.5 py-1 font-semibold" title="FPL bonus">
                                Bon
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {roster.map((r) => {
                            const s = r.stats;
                            return (
                                <tr key={r.profile.id} className="border-b border-border/50 hover:bg-muted/30">
                                    <td
                                        className={cn(
                                            'px-1.5 py-0.5 align-middle font-mono tabular-nums',
                                            r.total < 0 && 'text-rose-600',
                                            r.total > 0 && 'font-semibold text-foreground'
                                        )}
                                    >
                                        {r.total > 0 ? `+${r.total}` : `${r.total}`}
                                    </td>
                                    <td className="max-w-[8rem] truncate px-1 py-0.5 align-middle font-medium text-foreground">
                                        {r.profile.web_name}
                                    </td>
                                    <td className="px-0.5 py-0.5 align-middle text-muted-foreground">
                                        {POS_SHORT[r.profile.element_type] || '?'}
                                    </td>
                                    <td className="px-0.5 py-0.5 align-middle tabular-nums text-muted-foreground">
                                        {fmtStat(s?.minutes ?? null)}
                                    </td>
                                    <td className="px-0.5 py-0.5 align-middle tabular-nums">{fmtStat(s?.goals ?? null)}</td>
                                    <td className="px-0.5 py-0.5 align-middle tabular-nums">{fmtStat(s?.assists ?? null)}</td>
                                    <td className="px-0.5 py-0.5 align-middle tabular-nums">{fmtStat(s?.cleanSheets ?? null)}</td>
                                    <td className="px-0.5 py-0.5 align-middle tabular-nums">{fmtStat(s?.goalsConceded ?? null)}</td>
                                    <td className="px-0.5 py-0.5 align-middle tabular-nums">{fmtStat(s?.saves ?? null)}</td>
                                    <td className="px-0.5 py-0.5 align-middle tabular-nums">
                                        {fmtStat(s?.clearancesBlocksInterceptions ?? null)}
                                    </td>
                                    <td className="px-0.5 py-0.5 align-middle tabular-nums">{fmtStat(s?.yellowCards ?? null)}</td>
                                    <td className="px-0.5 py-0.5 align-middle tabular-nums">{fmtStat(s?.redCards ?? null)}</td>
                                    <td className="px-0.5 py-0.5 align-middle tabular-nums">{fmtStat(s?.bps ?? null)}</td>
                                    <td className="px-0.5 py-0.5 align-middle tabular-nums">{fmtStat(s?.bonus ?? null)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </ScrollArea>
    );
}
