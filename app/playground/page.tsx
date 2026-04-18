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
    Play,
} from 'lucide-react';
import { useFPLData } from '@/lib/hooks/use-fpl-data';
import { InsightsPitchView } from '@/components/insights/insights-pitch-view';
import { CardWars } from '@/components/insights/card-wars';
import { PlayerDetailModal } from '@/components/insights/player-detail-modal';
import { PlaygroundMatchPlayback } from '@/components/playground/match-playback';
import { FoosballTable } from '@/components/playground/foosball-table';
import { buildBestAlternateTeam } from '@/lib/playground/build-alternate-team';
import { buildGhostStartingXi } from '@/lib/playground/build-ghost-xi';
import { getPlaygroundExpectedPoints } from '@/lib/playground/expected-points';
import { simulateMatch, type MatchResult, type SimTuning } from '@/lib/playground/match-engine';
import { FPL_FORMATION_PRESETS, buildXiForFormation } from '@/lib/playground/fpl-formations';
import { buildOpponentEleven, type OpponentMode } from '@/lib/playground/build-opponent-xi';
import { buildSimShareText, recordSimSessionEnd, readSimEngagement } from '@/lib/playground/engagement';
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
    const [lastAwayXi, setLastAwayXi] = useState<any[]>([]);
    const [simGhostBudget, setSimGhostBudget] = useState<'100' | 'match_squad'>('100');
    const [showTour, setShowTour] = useState(false);
    const [simTuning, setSimTuning] = useState<SimTuning>({ attackBias: 1, defenseBias: 1 });
    const [foosballTarget, setFoosballTarget] = useState<5 | 10>(5);
    const [foosballGameActive, setFoosballGameActive] = useState(false);
    const [foosballTableKey, setFoosballTableKey] = useState(0);
    const [opponentMode, setOpponentMode] = useState<OpponentMode>('last_gw');
    const [foosballFormationId, setFoosballFormationId] = useState<string>(
        FPL_FORMATION_PRESETS.find((f) => f.id === '433')?.id ?? FPL_FORMATION_PRESETS[0]?.id ?? '433',
    );
    const [foosballOverrideHome, setFoosballOverrideHome] = useState<any[] | null>(null);

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

    const awayFoosballXi = useMemo(
        () => (elements.length ? (buildOpponentEleven(elements as any, opponentMode) as any[]) : []),
        [elements, opponentMode]
    );

    const squadBudgetM = useMemo(
        () =>
            playgroundTeam.reduce((sum: number, pick: any) => {
                const pl = elements.find((p: any) => p.id === pick.element);
                return sum + (pl?.now_cost || 0);
            }, 0) / 10,
        [playgroundTeam, elements]
    );

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

    const homeFoosball =
        Array.isArray(foosballOverrideHome) && foosballOverrideHome.length >= 11
            ? foosballOverrideHome.slice(0, 11)
            : startingXiPlayers;

    const runSimulation = () => {
        if (startingXiPlayers.length < 11) {
            toast.error('Need 11 starters on the pitch to run the sim.');
            return;
        }
        const budgetM = simGhostBudget === 'match_squad' ? squadBudgetM : 100;
        const awayXi = buildGhostStartingXi(elements as any, budgetM, getPlayer);
        if (!awayXi) {
            toast.error('Could not build opponent XI from current data.');
            return;
        }
        setLastAwayXi(awayXi);
        const res = simulateMatch({
            homeXi: startingXiPlayers.slice(0, 11),
            awayXi,
            entryId: sessionData.entryId,
            gameweek: baselineGw,
            tuning: simTuning,
        });
        setMatchResult(res);
        const streakMeta = recordSimSessionEnd(res.homeGoals, res.awayGoals);
        const extra = streakMeta.streak > 1 ? ` · ${streakMeta.streak} sim wins in a row` : '';
        toast.success(`Full time: ${res.homeGoals}–${res.awayGoals}${extra}`);
    };

    const shareResult = async () => {
        if (!matchResult) return;
        const mvpPlayer = [...startingXiPlayers, ...lastAwayXi].find(
            (p: any) => p?.id === matchResult.mvpPlayerId
        );
        const { streak } = readSimEngagement();
        const line = buildSimShareText(
            matchResult.homeGoals,
            matchResult.awayGoals,
            baselineGw,
            matchResult.seed,
            { mvpName: mvpPlayer?.web_name ?? null, streak }
        );
        try {
            await navigator.clipboard.writeText(line);
            toast.success('Share line copied — challenge your league to beat the sim');
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
                                    Real-time foosball is on top; edit your squad and run the instant sim below, or
                                    open{' '}
                                    <Link href="/insights" className="text-primary underline">
                                        Scout
                                    </Link>
                                    .
                                </p>
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

                {playgroundTeam.length > 0 && (
                    <div className="space-y-4">
                        <Card className="overflow-hidden border border-border bg-card shadow-sm">
                            <CardHeader className="space-y-1 border-b border-border pb-3">
                                <CardTitle className="flex flex-wrap items-center gap-2 text-base md:text-lg">
                                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary/15 text-primary">
                                        <Trophy className="h-4 w-4" />
                                    </span>
                                    Real-time foosball
                                </CardTitle>
                                <p className="text-xs text-muted-foreground">
                                    Press <strong>Start</strong> to run the table; W/S and arrows as per the on-screen
                                    hints. First to {foosballTarget} goals wins.
                                </p>
                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                    <span className="text-xs font-medium text-muted-foreground">First to</span>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={foosballTarget === 5 ? 'default' : 'outline'}
                                        onClick={() => {
                                            setFoosballTarget(5);
                                            setFoosballGameActive(false);
                                            setFoosballTableKey((k) => k + 1);
                                        }}
                                    >
                                        5
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={foosballTarget === 10 ? 'default' : 'outline'}
                                        onClick={() => {
                                            setFoosballTarget(10);
                                            setFoosballGameActive(false);
                                            setFoosballTableKey((k) => k + 1);
                                        }}
                                    >
                                        10
                                    </Button>
                                    {foosballGameActive && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            className="text-xs"
                                            onClick={() => {
                                                setFoosballGameActive(false);
                                                setFoosballTableKey((k) => k + 1);
                                            }}
                                        >
                                            Stop &amp; return to start
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 px-4 pb-6 pt-0 sm:px-6">
                                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
                                    <div className="flex flex-col gap-1 text-xs">
                                        <span className="text-muted-foreground">Opponent (CPU)</span>
                                        <select
                                            className="max-w-xs rounded border border-border bg-card px-2 py-1.5 text-foreground"
                                            value={opponentMode}
                                            onChange={(e) => {
                                                setOpponentMode(e.target.value as OpponentMode);
                                                setFoosballGameActive(false);
                                                setFoosballTableKey((k) => k + 1);
                                            }}
                                        >
                                            <option value="last_gw">Top form / last-GW signal</option>
                                            <option value="season">Best season to date</option>
                                            <option value="template">Budget template (alt)</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1 text-xs">
                                        <span className="text-muted-foreground">FPL formation (you)</span>
                                        <div className="flex flex-wrap gap-1">
                                            <select
                                                className="max-w-xs rounded border border-border bg-card px-2 py-1.5 text-foreground"
                                                value={foosballFormationId}
                                                onChange={(e) => setFoosballFormationId(e.target.value)}
                                            >
                                                {FPL_FORMATION_PRESETS.map((f) => (
                                                    <option key={f.id} value={f.id}>
                                                        {f.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    const shape = FPL_FORMATION_PRESETS.find(
                                                        (f) => f.id === foosballFormationId
                                                    );
                                                    const pool = playgroundTeam
                                                        .map((pk: any) => getPlayer(pk.element))
                                                        .filter(Boolean) as any[];
                                                    if (pool.length < 11) {
                                                        toast.error('Need at least 11 players in the squad list.');
                                                        return;
                                                    }
                                                    if (!shape) return;
                                                    const xi = buildXiForFormation(pool, {
                                                        d: shape.d,
                                                        m: shape.m,
                                                        a: shape.a,
                                                    });
                                                    if (xi) {
                                                        setFoosballOverrideHome(xi);
                                                        setFoosballGameActive(false);
                                                        setFoosballTableKey((k) => k + 1);
                                                        toast.success('Foosball XI updated from your squad for that shape.');
                                                    } else {
                                                        toast.error('Could not build a legal 11 for that shape.');
                                                    }
                                                }}
                                            >
                                                Apply
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                {homeFoosball.length >= 11 && awayFoosballXi.length >= 11 ? (
                                    <div className="space-y-2">
                                        {!foosballGameActive && (
                                            <p className="max-w-4xl text-xs text-muted-foreground">
                                                Keyboard help, rod picks, and live score are above the pitch — only the
                                                start gate covers the table.
                                            </p>
                                        )}
                                        <FoosballTable
                                            key={foosballTableKey}
                                            homeXi={homeFoosball.slice(0, 11) as any[]}
                                            awayXi={awayFoosballXi}
                                            targetScore={foosballTarget}
                                            gameActive={foosballGameActive}
                                            pitchStartOverlay={
                                                !foosballGameActive ? (
                                                    <div className="pointer-events-auto absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-xl bg-zinc-950/75 px-4 text-center backdrop-blur-[2px]">
                                                        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-primary bg-primary/20 shadow-[4px_4px_0_0_hsl(var(--primary))]">
                                                            <Play
                                                                className="h-10 w-10 text-primary-foreground"
                                                                fill="currentColor"
                                                                strokeWidth={0.5}
                                                                aria-hidden
                                                            />
                                                        </div>
                                                        <p className="font-headline text-lg font-black tracking-tight text-white">
                                                            Start game
                                                        </p>
                                                        <Button
                                                            type="button"
                                                            size="lg"
                                                            className="mt-1 gap-2 font-headline"
                                                            onClick={() => setFoosballGameActive(true)}
                                                        >
                                                            <Play className="h-4 w-4" fill="currentColor" />
                                                            Start match
                                                        </Button>
                                                    </div>
                                                ) : null
                                            }
                                        />
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        Need 11 players in your squad and valid opponent data.
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        <div
                            className="relative flex items-center gap-3 py-2"
                            role="separator"
                            aria-label="Squad tools and instant simulation below"
                        >
                            <div className="h-px flex-1 bg-border" />
                            <div className="shrink-0 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-center">
                                <span className="text-xs font-headline font-bold uppercase tracking-widest text-muted-foreground">
                                    Squad lab &amp; instant sim
                                </span>
                            </div>
                            <div className="h-px flex-1 bg-border" />
                        </div>
                    </div>
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
                                <details className="group rounded-lg border border-border/80 bg-muted/20 px-3 py-2 text-sm">
                                    <summary className="cursor-pointer list-none font-headline font-semibold text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
                                        <span className="text-primary">Ideas to keep it viral</span> — sim, Card
                                        Wars &amp; foosball
                                    </summary>
                                    <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs text-muted-foreground">
                                        <li>
                                            <strong className="text-foreground">Share the seed</strong> after Instant
                                            sim: same XI + GW + your entry id → same score — dares land in group chats.
                                        </li>
                                        <li>
                                            <strong className="text-foreground">Tag a rival</strong> on Card Wars:
                                            &quot;My XI beat the Best Alternate 5-2 on stats—screenshot or it didn’t
                                            happen&quot; (use the orange copy button).
                                        </li>
                                        <li>
                                            <strong className="text-foreground">Foosball streaks</strong> (this
                                            device): we toast when you go on a run — use &quot;Copy share line&quot; on
                                            the end screen to challenge mates.
                                        </li>
                                        <li>
                                            <strong className="text-foreground">League weeklies</strong>: pick one
                                            scoreline a week (sim or table), pin it in the WhatsApp group, loser buys
                                            coffee.
                                        </li>
                                    </ul>
                                </details>
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
                                                    setLastAwayXi([]);
                                                    setFoosballOverrideHome(null);
                                                    setFoosballGameActive(false);
                                                    setFoosballTableKey((k) => k + 1);
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

                                <div
                                    className="rounded-lg border border-dashed border-border/90 bg-card/30 p-3 text-sm"
                                    aria-label="Simulation weight tuning"
                                >
                                    <label className="mb-3 flex max-w-md flex-col gap-1">
                                        <span className="text-xs font-medium text-foreground">
                                            Ghost opponent budget
                                        </span>
                                        <span className="text-[11px] text-muted-foreground">
                                            Same optimiser as Card Wars; £100m is the classic ghost. Match squad uses
                                            your team&apos;s total value.
                                        </span>
                                        <select
                                            className="mt-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                                            value={simGhostBudget}
                                            onChange={(e) =>
                                                setSimGhostBudget(e.target.value as '100' | 'match_squad')
                                            }
                                        >
                                            <option value="100">£100.0m ghost</option>
                                            <option value="match_squad">
                                                Match my squad (£{squadBudgetM.toFixed(1)}m)
                                            </option>
                                        </select>
                                    </label>
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

                                {matchResult && (
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
                                        {matchResult.mvpPlayerId != null && (
                                            <p className="text-sm text-muted-foreground">
                                                MOTM (most sim goals):{' '}
                                                <span className="font-medium text-foreground">
                                                    {(
                                                        [...startingXiPlayers, ...lastAwayXi].find(
                                                            (p: any) => p.id === matchResult.mvpPlayerId
                                                        ) as { web_name?: string } | undefined
                                                    )?.web_name ?? '—'}
                                                </span>
                                            </p>
                                        )}
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
                                            awayPlayers={lastAwayXi.map((p: any) => ({
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
                                                        <li>
                                                            Opponent is a budget-optimised ghost squad (picker above:
                                                            £100m or match your squad value — same builder as Card
                                                            Wars).
                                                        </li>
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
