'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    Gamepad2,
    RotateCcw,
    Save,
    Swords,
    Plus,
    Trophy,
    Users,
    Sparkles,
    Share2,
    Info,
    X,
} from 'lucide-react';
import { useFPLData } from '@/lib/hooks/use-fpl-data';
import { InsightsPitchView } from '@/components/insights/insights-pitch-view';
import { CardWars } from '@/components/insights/card-wars';
import { PlayerDetailModal } from '@/components/insights/player-detail-modal';
import { PlaygroundMatchPlayback } from '@/components/playground/match-playback';
import { FoosballTable } from '@/components/playground/foosball-table';
import { buildBestAlternateTeam } from '@/lib/playground/build-alternate-team';
import { getPlaygroundExpectedPoints } from '@/lib/playground/expected-points';
import { simulateMatch, type MatchResult, type SimTuning } from '@/lib/playground/match-engine';
import { toast } from 'sonner';

const TOUR_KEY = 'fpl-playground-tour-dismissed';

async function fetchWithRetry(
    url: string,
    options: RequestInit = {},
    maxRetries = 3
): Promise<Response> {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const res = await fetch(url, options);
            if (res.ok || i === maxRetries - 1) return res;
            await new Promise((r) => setTimeout(r, Math.pow(2, i) * 1000));
        } catch {
            if (i === maxRetries - 1) throw new Error('Max retries exceeded');
            await new Promise((r) => setTimeout(r, Math.pow(2, i) * 1000));
        }
    }
    throw new Error('Max retries exceeded');
}

export default function PlaygroundPage() {
    const router = useRouter();
    const [sessionData, setSessionData] = useState<{ entryId: number } | null>(null);
    const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
    const [playgroundTeam, setPlaygroundTeam] = useState<any[]>([]);
    const [playgroundGW, setPlaygroundGW] = useState<number | null>(null);
    const [battleMode, setBattleMode] = useState(false);
    const [alternateTeam, setAlternateTeam] = useState<any[]>([]);
    const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
    const [showTour, setShowTour] = useState(false);
    const [simTuning, setSimTuning] = useState<SimTuning>({ attackBias: 1, defenseBias: 1 });
    const [playgroundMode, setPlaygroundMode] = useState<'sim' | 'foosball'>('sim');
    const [foosballTarget, setFoosballTarget] = useState<5 | 10>(5);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const dismissed = localStorage.getItem(TOUR_KEY);
        if (!dismissed) setShowTour(true);
    }, []);

    useEffect(() => {
        let mounted = true;
        const loadSession = async () => {
            try {
                const res = await fetchWithRetry('/api/session', { credentials: 'include' });
                if (!res.ok) {
                    if (res.status === 401) {
                        router.push('/login');
                        return;
                    }
                    return;
                }
                const sessionCheck = await res.json();
                const createRes = await fetch('/api/session/create', { credentials: 'include' });
                if (createRes.ok) {
                    const data = await createRes.json();
                    if (mounted) setSessionData(data.session || data);
                } else if (mounted) setSessionData({ entryId: sessionCheck.entryId });
            } catch (e) {
                console.error('[Playground]', e);
            }
        };
        loadSession();
        return () => {
            mounted = false;
        };
    }, [router]);

    const { bootstrap, history, fixtures, isLoading: baseLoading } = useFPLData(sessionData?.entryId);
    const currentEvent = bootstrap?.events?.find((e: any) => e.is_current);
    const { picks } = useFPLData(sessionData?.entryId, currentEvent?.id);
    const teams = bootstrap?.teams || [];
    const elements = bootstrap?.elements || [];

    useEffect(() => {
        if (picks?.picks && playgroundTeam.length === 0 && !playgroundGW && currentEvent?.id) {
            setPlaygroundTeam([...picks.picks]);
            setPlaygroundGW(currentEvent.id);
        }
    }, [picks?.picks, currentEvent?.id, playgroundTeam.length, playgroundGW]);

    const ghostAwayXi = useMemo(() => {
        if (!elements.length) return [] as any[];
        const altPicks = buildBestAlternateTeam(elements as any, 100);
        const awayPicks = (altPicks as any[]).filter((p: any) => p.position <= 11);
        let awayXi = awayPicks
            .map((pick: any) => elements.find((p: any) => p.id === pick.element))
            .filter(Boolean) as any[];
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
        return awayXi.slice(0, 11);
    }, [elements]);

    if (!sessionData || baseLoading || !bootstrap || !history) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    const getPlayer = (elementId: number) => elements.find((p: any) => p.id === elementId);
    const baselineGw = playgroundGW || currentEvent?.id || 1;

    const startingXiPlayers = playgroundTeam
        .filter((p: any) => p.position <= 11)
        .map((pick: any) => getPlayer(pick.element))
        .filter(Boolean);

    const runSimulation = () => {
        if (startingXiPlayers.length < 11) {
            toast.error('Need 11 starters on the pitch to run the sim.');
            return;
        }
        const altPicks = buildBestAlternateTeam(elements as any, 100);
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
        if (awayXi.length < 11) {
            toast.error('Could not build opponent XI from current data.');
            return;
        }
        const res = simulateMatch({
            homeXi: startingXiPlayers.slice(0, 11),
            awayXi: awayXi.slice(0, 11),
            entryId: sessionData.entryId,
            gameweek: baselineGw,
            tuning: simTuning,
        });
        setMatchResult(res);
        toast.success(`Full time: ${res.homeGoals}–${res.awayGoals}`);
    };

    const shareResult = async () => {
        if (!matchResult) return;
        const line = `FPL Playground · GW${baselineGw}: ${matchResult.homeGoals}-${matchResult.awayGoals} · seed ${matchResult.seed}`;
        try {
            await navigator.clipboard.writeText(line);
            toast.success('Result copied to clipboard');
        } catch {
            toast.error('Could not copy');
        }
    };

    const dismissTour = () => {
        localStorage.setItem(TOUR_KEY, '1');
        setShowTour(false);
    };

    return (
        <div className="min-h-screen bg-background pb-32 pt-16">
            <div className="mx-auto max-w-7xl space-y-4 p-3 sm:p-4 md:space-y-6 md:p-6">
                <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 md:rounded-3xl md:p-8">
                    <div className="relative z-10 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary bg-primary/20 md:h-12 md:w-12">
                                <Gamepad2 className="h-5 w-5 text-primary md:h-6 md:w-6" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-foreground md:text-3xl">
                                    Team Playground
                                </h1>
                                <p className="text-xs text-muted-foreground md:text-sm">
                                    Edit your squad, run a quick sim, or jump to{' '}
                                    <Link href="/insights" className="text-primary underline">
                                        Scout
                                    </Link>
                                    .
                                </p>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <span className="text-xs text-muted-foreground">Mode:</span>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={playgroundMode === 'sim' ? 'default' : 'outline'}
                                        onClick={() => setPlaygroundMode('sim')}
                                    >
                                        Instant sim
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={playgroundMode === 'foosball' ? 'default' : 'outline'}
                                        onClick={() => setPlaygroundMode('foosball')}
                                    >
                                        Play foosball
                                    </Button>
                                    {playgroundMode === 'foosball' && (
                                        <>
                                            <span className="text-xs text-muted-foreground">First to</span>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant={foosballTarget === 5 ? 'secondary' : 'outline'}
                                                onClick={() => setFoosballTarget(5)}
                                            >
                                                5
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant={foosballTarget === 10 ? 'secondary' : 'outline'}
                                                onClick={() => setFoosballTarget(10)}
                                            >
                                                10
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {showTour && (
                    <Alert className="border-primary/30 bg-primary/5">
                        <Sparkles className="h-4 w-4" />
                        <AlertTitle>Quick tour</AlertTitle>
                        <AlertDescription className="flex flex-col gap-2 text-foreground">
                            <ol className="list-decimal pl-4 text-sm">
                                <li>Arrange your starting XI on the pitch below.</li>
                                <li>Press &quot;Simulate match&quot; for a seeded, stat-based mini-game.</li>
                                <li>Use Share to copy the scoreline (for bragging rights).</li>
                            </ol>
                            <Button variant="outline" size="sm" className="w-fit gap-1" onClick={dismissTour}>
                                <X className="h-3 w-3" /> Got it
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}

                <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Gamepad2 className="h-5 w-5 text-primary" />
                            Team Playground — Edit your squad
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Drag & drop players to rearrange, experiment with formations
                            {playgroundGW && ` · GW ${playgroundGW}`}
                        </p>
                    </CardHeader>
                    <CardContent>
                        {playgroundTeam.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                                <Gamepad2 className="mx-auto mb-4 h-16 w-16" />
                                <p className="text-lg font-semibold">No team data available</p>
                                <p className="text-sm">
                                    Your current squad will load here — open after the gameweek loads.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-card/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                if (picks?.picks) {
                                                    setPlaygroundTeam([...picks.picks]);
                                                    setPlaygroundGW(currentEvent?.id || null);
                                                    setMatchResult(null);
                                                }
                                            }}
                                            className="gap-2"
                                        >
                                            <RotateCcw className="h-4 w-4" />
                                            Reset
                                        </Button>
                                        <Button variant="outline" size="sm" className="gap-2" type="button">
                                            <Save className="h-4 w-4" />
                                            Save (Preview)
                                        </Button>
                                        <Button
                                            variant="default"
                                            size="sm"
                                            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                                            onClick={() => {
                                                const currentBudget =
                                                    playgroundTeam.reduce((sum: number, pick: any) => {
                                                        const pl = getPlayer(pick.element);
                                                        return sum + (pl?.now_cost || 0);
                                                    }, 0) / 10;
                                                const altTeam = buildBestAlternateTeam(elements as any, currentBudget);
                                                setAlternateTeam(altTeam as any);
                                                setBattleMode(true);
                                            }}
                                        >
                                            <Swords className="h-4 w-4" />
                                            Card Wars
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="gap-2"
                                            onClick={runSimulation}
                                            aria-label="Simulate a playground match using your starting eleven"
                                        >
                                            <Sparkles className="h-4 w-4" />
                                            Simulate match
                                        </Button>
                                        {matchResult && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-2"
                                                onClick={shareResult}
                                                aria-label="Copy match result to clipboard"
                                            >
                                                <Share2 className="h-4 w-4" />
                                                Share
                                            </Button>
                                        )}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {playgroundTeam.filter((p: any) => p.position <= 11).length} Starting ·{' '}
                                        {playgroundTeam.filter((p: any) => p.position > 11).length} Bench
                                    </div>
                                </div>

                                {playgroundMode === 'foosball' && playgroundTeam.length > 0 && (
                                    <div className="rounded-xl border border-primary/25 bg-card/40 p-4">
                                        <h3 className="mb-2 text-sm font-semibold text-foreground">Real-time foosball</h3>
                                        {startingXiPlayers.length >= 11 && ghostAwayXi.length >= 11 ? (
                                            <FoosballTable
                                                homeXi={startingXiPlayers.slice(0, 11) as any[]}
                                                awayXi={ghostAwayXi}
                                                targetScore={foosballTarget}
                                            />
                                        ) : (
                                            <p className="text-sm text-muted-foreground">
                                                Need 11 starters on the pitch and valid opponent data from the game.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {playgroundMode === 'sim' && (
                                <div
                                    className="rounded-lg border border-dashed border-border/90 bg-card/30 p-3 text-sm"
                                    aria-label="Simulation weight tuning"
                                >
                                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                        <span className="font-medium text-foreground">Sim weights (next run)</span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs"
                                            onClick={() =>
                                                setSimTuning({ attackBias: 1, defenseBias: 1 })
                                            }
                                        >
                                            Reset to default
                                        </Button>
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <label className="flex flex-col gap-1">
                                            <span className="text-xs text-muted-foreground">
                                                Attack bias — higher tends to produce more goals
                                            </span>
                                            <input
                                                type="range"
                                                min={0.75}
                                                max={1.5}
                                                step={0.05}
                                                value={simTuning.attackBias ?? 1}
                                                onChange={(e) =>
                                                    setSimTuning((t) => ({
                                                        ...t,
                                                        attackBias: Number.parseFloat(e.target.value),
                                                    }))
                                                }
                                                className="w-full accent-primary"
                                            />
                                            <span className="text-xs tabular-nums text-muted-foreground">
                                                {(simTuning.attackBias ?? 1).toFixed(2)}×
                                            </span>
                                        </label>
                                        <label className="flex flex-col gap-1">
                                            <span className="text-xs text-muted-foreground">
                                                Defence bias — higher makes saves and blocks stronger
                                            </span>
                                            <input
                                                type="range"
                                                min={0.75}
                                                max={1.5}
                                                step={0.05}
                                                value={simTuning.defenseBias ?? 1}
                                                onChange={(e) =>
                                                    setSimTuning((t) => ({
                                                        ...t,
                                                        defenseBias: Number.parseFloat(e.target.value),
                                                    }))
                                                }
                                                className="w-full accent-primary"
                                            />
                                            <span className="text-xs tabular-nums text-muted-foreground">
                                                {(simTuning.defenseBias ?? 1).toFixed(2)}×
                                            </span>
                                        </label>
                                    </div>
                                </div>
                                )}

                                {playgroundMode === 'sim' && matchResult && (
                                    <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
                                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                                            <h3 className="text-lg font-bold text-foreground">
                                                Sim full time:{' '}
                                                <span className="text-primary">
                                                    {matchResult.homeGoals} – {matchResult.awayGoals}
                                                </span>
                                            </h3>
                                            <span className="text-xs text-muted-foreground">
                                                Seed {matchResult.seed} (reproducible for this XI + GW)
                                            </span>
                                        </div>
                                        <PlaygroundMatchPlayback
                                            events={matchResult.events}
                                            homePlayers={startingXiPlayers.map((p: any) => ({
                                                id: p.id,
                                                code: p.code,
                                                photo: p.photo,
                                                web_name: p.web_name,
                                                team: p.team,
                                                element_type: p.element_type,
                                            }))}
                                        />
                                        <Accordion type="single" collapsible className="w-full border border-border rounded-lg px-2">
                                            <AccordionItem value="method">
                                                <AccordionTrigger className="text-sm">
                                                    <span className="flex items-center gap-2">
                                                        <Info className="h-4 w-4" />
                                                        How the sim works
                                                    </span>
                                                </AccordionTrigger>
                                                <AccordionContent className="text-sm text-muted-foreground">
                                                    <ul className="list-disc space-y-1 pl-4">
                                                        <li>Uses your starting XI stats from FPL bootstrap (form, xP, ICT).</li>
                                                        <li>Opponent is a budget-optimised ghost squad (same engine as Card Wars budget).</li>
                                                        <li>
                                                            Seeded randomness — same squad + GW + entry yields the same seed
                                                            (not real PL scores).
                                                        </li>
                                                        <li>Five lanes approximate foosball bands; chances roll vs defence block.</li>
                                                    </ul>
                                                </AccordionContent>
                                            </AccordionItem>
                                        </Accordion>
                                    </div>
                                )}

                                {battleMode && alternateTeam.length > 0 && (
                                    <div className="mb-6">
                                        <CardWars
                                            myTeam={playgroundTeam}
                                            alternateTeam={alternateTeam}
                                            myTeamPlayers={playgroundTeam
                                                .map((pick: any) => getPlayer(pick.element))
                                                .filter(Boolean)}
                                            alternateTeamPlayers={alternateTeam
                                                .map((pick: any) => getPlayer(pick.element))
                                                .filter(Boolean)}
                                            teams={teams}
                                            fixtures={fixtures || []}
                                            currentEvent={playgroundGW || currentEvent?.id || 1}
                                            myTeamBudget={
                                                playgroundTeam.reduce(
                                                    (sum: number, pick: any) =>
                                                        sum + (getPlayer(pick.element)?.now_cost || 0),
                                                    0
                                                ) / 10
                                            }
                                            alternateTeamBudget={
                                                alternateTeam.reduce(
                                                    (sum: number, pick: any) =>
                                                        sum + (getPlayer(pick.element)?.now_cost || 0),
                                                    0
                                                ) / 10
                                            }
                                            onPlayerClick={(p) => setSelectedPlayer(p)}
                                        />
                                        <div className="mt-4 flex justify-center">
                                            <Button variant="outline" onClick={() => setBattleMode(false)}>
                                                Back to Playground
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {!battleMode && (
                                    <>
                                        <div>
                                            <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                                                <Trophy className="h-5 w-5 text-rank-gold" />
                                                Starting 11
                                            </h3>
                                            <InsightsPitchView
                                                players={playgroundTeam
                                                    .filter((p: any) => p.position <= 11)
                                                    .sort((a: any, b: any) => a.position - b.position)
                                                    .map((pick: any) => getPlayer(pick.element))
                                                    .filter(Boolean)}
                                                teams={teams}
                                                fixtures={fixtures || []}
                                                currentEvent={playgroundGW || currentEvent?.id || 1}
                                                onPlayerClick={setSelectedPlayer}
                                                showRanks={false}
                                                picksMap={
                                                    new Map(playgroundTeam.map((pick: any) => [pick.element, pick]))
                                                }
                                                getExpectedPoints={(player: any) =>
                                                    getPlaygroundExpectedPoints(
                                                        player,
                                                        fixtures,
                                                        baselineGw
                                                    )
                                                }
                                            />
                                        </div>

                                        <div>
                                            <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                                                <Users className="h-5 w-5 text-muted-foreground" />
                                                Bench
                                            </h3>
                                            <InsightsPitchView
                                                players={playgroundTeam
                                                    .filter((p: any) => p.position > 11)
                                                    .sort((a: any, b: any) => a.position - b.position)
                                                    .map((pick: any) => getPlayer(pick.element))
                                                    .filter(Boolean)}
                                                teams={teams}
                                                fixtures={fixtures || []}
                                                currentEvent={playgroundGW || currentEvent?.id || 1}
                                                onPlayerClick={setSelectedPlayer}
                                                showRanks={false}
                                                compactLayout
                                                picksMap={
                                                    new Map(playgroundTeam.map((pick: any) => [pick.element, pick]))
                                                }
                                                getExpectedPoints={(player: any) =>
                                                    getPlaygroundExpectedPoints(
                                                        player,
                                                        fixtures,
                                                        baselineGw
                                                    )
                                                }
                                            />
                                        </div>

                                        <div>
                                            <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                                                <Plus className="h-5 w-5 text-positive" />
                                                Available players
                                            </h3>
                                            <div className="grid max-h-96 grid-cols-2 gap-3 overflow-y-auto p-2 md:grid-cols-4 lg:grid-cols-6">
                                                {elements
                                                    .filter(
                                                        (p: any) =>
                                                            !playgroundTeam.some(
                                                                (pick: any) => pick.element === p.id
                                                            )
                                                    )
                                                    .slice(0, 50)
                                                    .map((player: any) => (
                                                        <button
                                                            key={player.id}
                                                            type="button"
                                                            onClick={() => {
                                                                const newPick = {
                                                                    element: player.id,
                                                                    position:
                                                                        12 +
                                                                        playgroundTeam.filter(
                                                                            (p: any) => p.position > 11
                                                                        ).length,
                                                                    is_captain: false,
                                                                    is_vice_captain: false,
                                                                };
                                                                setPlaygroundTeam([...playgroundTeam, newPick]);
                                                            }}
                                                            className="rounded-lg border border-primary/20 bg-card/50 p-2 text-left transition-all hover:border-primary/40 hover:bg-primary/10"
                                                        >
                                                            <p className="truncate text-xs font-bold">
                                                                {player.web_name}
                                                            </p>
                                                            <p className="text-[10px] text-muted-foreground">
                                                                {teams.find((t: any) => t.id === player.team)
                                                                    ?.short_name}
                                                            </p>
                                                            <p className="mt-1 text-[10px] text-primary">
                                                                £{(player.now_cost / 10).toFixed(1)}m
                                                            </p>
                                                        </button>
                                                    ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {selectedPlayer && (
                <PlayerDetailModal
                    player={selectedPlayer}
                    team={teams.find((t: any) => t.id === selectedPlayer.team) ?? null}
                    teams={teams}
                    fixtures={fixtures || []}
                    currentEvent={currentEvent?.id || 1}
                    onClose={() => setSelectedPlayer(null)}
                />
            )}
        </div>
    );
}
