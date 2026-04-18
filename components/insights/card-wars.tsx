'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Trophy,
    Swords,
    Shield,
    Zap,
    Target,
    TrendingUp,
    Users,
    Share2,
    type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InsightsPitchView } from './insights-pitch-view';
import { motion } from 'framer-motion';
import {
    buildCardWarsShareText,
    recordCardWarsSessionEnd,
    readCardWarsEngagement,
} from '@/lib/playground/engagement';

interface CardWarsProps {
    myTeam: any[];
    alternateTeam: any[];
    myTeamPlayers: any[];
    alternateTeamPlayers: any[];
    teams: any[];
    fixtures: any[];
    currentEvent: number;
    myTeamBudget: number;
    alternateTeamBudget: number;
    onPlayerClick: (player: any) => void;
}

export type StatKey =
    | 'totalPoints'
    | 'avgForm'
    | 'avgICT'
    | 'totalGoals'
    | 'totalAssists'
    | 'totalCleanSheets'
    | 'avgExpectedPoints'
    | 'totalValue';

const STAT_ORDER: StatKey[] = [
    'totalPoints',
    'avgForm',
    'avgICT',
    'totalGoals',
    'totalAssists',
    'totalCleanSheets',
    'avgExpectedPoints',
    'totalValue',
];

const STAT_META: Record<
    StatKey,
    { label: string; icon: LucideIcon; unit?: string; decimals?: number }
> = {
    totalPoints: { label: 'Total Points', icon: Trophy, decimals: 0 },
    avgForm: { label: 'Avg Form', icon: TrendingUp, decimals: 1 },
    avgICT: { label: 'Avg ICT', icon: Zap, decimals: 1 },
    totalGoals: { label: 'Total Goals', icon: Target, decimals: 0 },
    totalAssists: { label: 'Total Assists', icon: Users, decimals: 0 },
    totalCleanSheets: { label: 'Clean Sheets', icon: Shield, decimals: 0 },
    avgExpectedPoints: { label: 'Avg xPts (Next GW)', icon: TrendingUp, decimals: 1 },
    totalValue: { label: 'Team Value', icon: Trophy, unit: 'm', decimals: 1 },
};

function calcRawStats(players: any[]) {
    if (!players.length) {
        return {
            totalPoints: 0,
            avgForm: 0,
            avgICT: 0,
            totalGoals: 0,
            totalAssists: 0,
            totalCleanSheets: 0,
            avgExpectedPoints: 0,
            totalValue: 0,
        };
    }
    const n = players.length;
    return {
        totalPoints: players.reduce((sum, p) => sum + (p.total_points || 0), 0),
        avgForm: players.reduce((sum, p) => sum + (parseFloat(p.form) || 0), 0) / n,
        avgICT: players.reduce((sum, p) => sum + (parseFloat(p.ict_index) || 0), 0) / n,
        totalGoals: players.reduce((sum, p) => sum + (p.goals_scored || 0), 0),
        totalAssists: players.reduce((sum, p) => sum + (p.assists || 0), 0),
        totalCleanSheets: players.reduce((sum, p) => sum + (p.clean_sheets || 0), 0),
        avgExpectedPoints: players.reduce((sum, p) => sum + (parseFloat(p.ep_next) || 0), 0) / n,
        totalValue: players.reduce((sum, p) => sum + (p.now_cost || 0), 0) / 10,
    };
}

function compareStat(myValue: number, altValue: number, higherBetter: boolean = true) {
    if (higherBetter) {
        if (myValue > altValue) return 'win';
        if (myValue < altValue) return 'lose';
    } else {
        if (myValue < altValue) return 'win';
        if (myValue > altValue) return 'lose';
    }
    return 'tie';
}

function formatStat(key: StatKey, v: number) {
    const d = STAT_META[key].decimals ?? 0;
    return d === 0 ? String(Math.round(v)) : v.toFixed(d);
}

export function CardWars({
    myTeam,
    alternateTeam,
    myTeamPlayers,
    alternateTeamPlayers,
    teams,
    fixtures,
    currentEvent,
    myTeamBudget,
    alternateTeamBudget,
    onPlayerClick,
}: CardWarsProps) {
    const myRaw = useMemo(() => calcRawStats(myTeamPlayers), [myTeamPlayers]);
    const altRaw = useMemo(() => calcRawStats(alternateTeamPlayers), [alternateTeamPlayers]);

    const [selected, setSelected] = useState<Set<StatKey>>(() => new Set(STAT_ORDER));
    const [stagger, setStagger] = useState(false);
    const [revealIndex, setRevealIndex] = useState(0);

    const selectedKeys = useMemo(
        () => STAT_ORDER.filter((k) => selected.has(k)),
        [selected]
    );

    const { myWins, altWins, overallWinner } = useMemo(() => {
        let mw = 0;
        let aw = 0;
        for (const k of selectedKeys) {
            const r = compareStat(myRaw[k], altRaw[k]);
            if (r === 'win') mw++;
            else if (r === 'lose') aw++;
        }
        const overall: 'myTeam' | 'alternate' | 'tie' =
            mw > aw ? 'myTeam' : mw < aw ? 'alternate' : 'tie';
        return { myWins: mw, altWins: aw, overallWinner: overall };
    }, [myRaw, altRaw, selectedKeys]);

    const outcomeRef = useRef(overallWinner);
    outcomeRef.current = overallWinner;
    const recordedRef = useRef(false);
    const recordOnce = useCallback(() => {
        if (recordedRef.current) return;
        recordedRef.current = true;
        recordCardWarsSessionEnd(outcomeRef.current);
    }, []);

    const copyShare = useCallback(async () => {
        recordOnce();
        const { streak } = readCardWarsEngagement();
        const line = buildCardWarsShareText({
            myWins,
            altWins,
            outcome: overallWinner,
            gw: currentEvent,
            streak,
        });
        try {
            await navigator.clipboard.writeText(line);
            toast.success('Card Wars line copied — paste in X, WhatsApp, or your mini-league');
        } catch {
            toast.error('Could not copy');
        }
    }, [myWins, altWins, overallWinner, currentEvent, recordOnce]);

    const toggleStat = (key: StatKey) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                if (next.size <= 3) {
                    toast.message('Pick at least 3 stats for the duel');
                    return prev;
                }
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    useEffect(() => {
        if (stagger) {
            setRevealIndex(0);
        }
    }, [stagger, selectedKeys]);

    useEffect(() => {
        setRevealIndex((i) => Math.min(Math.max(0, i), Math.max(0, selectedKeys.length - 1)));
    }, [selectedKeys.length]);

    const visibleKeys = useMemo(() => {
        if (!stagger) return selectedKeys;
        return selectedKeys.slice(0, revealIndex + 1);
    }, [stagger, selectedKeys, revealIndex]);

    const StatCard = ({
        statKey,
        label,
        icon: Icon,
        unit = '',
    }: {
        statKey: StatKey;
        label: string;
        icon: LucideIcon;
        unit?: string;
    }) => {
        const myV = myRaw[statKey];
        const altV = altRaw[statKey];
        const result = compareStat(myV, altV);
        const myVal = formatStat(statKey, myV);
        const altVal = formatStat(statKey, altV);

        return (
            <div className="rounded-xl border-2 border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900 p-4">
                <div className="mb-3 flex items-center gap-2">
                    {Icon && <Icon className="h-4 w-4 text-orange-500" />}
                    <span className="text-xs font-bold uppercase text-gray-300">{label}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div
                        className={`rounded-lg border-2 p-3 text-center ${
                            result === 'win'
                                ? 'border-green-500 bg-gradient-to-br from-green-600 to-green-700'
                                : result === 'lose'
                                  ? 'border-red-500 bg-gradient-to-br from-red-600 to-red-700'
                                  : 'border-gray-500 bg-gradient-to-br from-gray-600 to-gray-700'
                        }`}
                    >
                        <p className="text-xl font-black text-white">
                            {myVal}
                            {unit}
                        </p>
                        {result === 'win' && <Trophy className="mx-auto mt-1 h-4 w-4 text-yellow-300" />}
                        {result === 'lose' && <Target className="mx-auto mt-1 h-4 w-4 text-red-300" />}
                    </div>

                    <div
                        className={`rounded-lg border-2 p-3 text-center ${
                            result === 'lose'
                                ? 'border-green-500 bg-gradient-to-br from-green-600 to-green-700'
                                : result === 'win'
                                  ? 'border-red-500 bg-gradient-to-br from-red-600 to-red-700'
                                  : 'border-gray-500 bg-gradient-to-br from-gray-600 to-gray-700'
                        }`}
                    >
                        <p className="text-xl font-black text-white">
                            {altVal}
                            {unit}
                        </p>
                        {result === 'lose' && <Trophy className="mx-auto mt-1 h-4 w-4 text-yellow-300" />}
                        {result === 'win' && <Target className="mx-auto mt-1 h-4 w-4 text-red-300" />}
                    </div>
                </div>
            </div>
        );
    };

    const myTeamPicksMap = new Map(myTeam.map((pick: any) => [pick.element, pick]));
    const alternateTeamPicksMap = new Map(alternateTeam.map((pick: any) => [pick.element, pick]));

    return (
        <div className="space-y-6">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-2xl border-4 border-orange-400 bg-gradient-to-br from-orange-600 via-orange-700 to-red-700 p-6 shadow-2xl"
            >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)]" />

                <div className="relative z-10 text-center">
                    <div className="mb-4 flex items-center justify-center gap-4">
                        <Swords className="h-12 w-12 animate-pulse text-white" />
                        <h2 className="text-4xl font-black tracking-wider text-white drop-shadow-lg">
                            CARD WARS
                        </h2>
                        <Swords className="h-12 w-12 animate-pulse text-white" />
                    </div>

                    <div className="mb-4 flex items-center justify-center gap-6">
                        <div
                            className={`max-w-xs flex-1 rounded-xl border-4 p-4 ${
                                overallWinner === 'myTeam'
                                    ? 'border-green-400 bg-gradient-to-br from-green-600 to-green-800 shadow-lg'
                                    : overallWinner === 'alternate'
                                      ? 'border-gray-400 bg-gradient-to-br from-gray-600 to-gray-800'
                                      : 'border-gray-400 bg-gradient-to-br from-gray-600 to-gray-800'
                            }`}
                        >
                            <p className="mb-1 text-xs font-bold uppercase text-white/80">Your Team</p>
                            <p className="text-3xl font-black text-white">{myWins}</p>
                            <p className="text-xs text-white/70">Wins</p>
                        </div>

                        <div className="text-4xl font-black text-white">VS</div>

                        <div
                            className={`max-w-xs flex-1 rounded-xl border-4 p-4 ${
                                overallWinner === 'alternate'
                                    ? 'border-green-400 bg-gradient-to-br from-green-600 to-green-800 shadow-lg'
                                    : overallWinner === 'myTeam'
                                      ? 'border-gray-400 bg-gradient-to-br from-gray-600 to-gray-800'
                                      : 'border-gray-400 bg-gradient-to-br from-gray-600 to-gray-800'
                            }`}
                        >
                            <p className="mb-1 text-xs font-bold uppercase text-white/80">Best Alternate</p>
                            <p className="text-3xl font-black text-white">{altWins}</p>
                            <p className="text-xs text-white/70">Wins</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                        <Badge variant="secondary" className="px-4 py-2">
                            Your Budget: £{myTeamBudget.toFixed(1)}m
                        </Badge>
                        <Badge variant="secondary" className="px-4 py-2">
                            Alternate Budget: £{alternateTeamBudget.toFixed(1)}m
                        </Badge>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="gap-2 font-semibold"
                            onClick={copyShare}
                        >
                            <Share2 className="h-4 w-4" />
                            Copy shareable result
                        </Button>
                    </div>
                </div>
            </motion.div>

            <div className="rounded-xl border border-border bg-card/50 p-4">
                <h3 className="mb-2 text-sm font-semibold text-foreground">Battle deck</h3>
                <p className="mb-3 text-xs text-muted-foreground">
                    Choose which stats count (minimum 3). Overall score uses only ticked categories. Copy shareable
                    result logs your Card Wars streak for this duel (local device).
                </p>
                <div className="mb-4 flex flex-wrap gap-3">
                    {STAT_ORDER.map((k) => (
                        <label
                            key={k}
                            className="flex cursor-pointer items-center gap-2 text-xs text-foreground"
                        >
                            <input
                                type="checkbox"
                                className="accent-primary"
                                checked={selected.has(k)}
                                onChange={() => toggleStat(k)}
                            />
                            {STAT_META[k].label}
                        </label>
                    ))}
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-foreground">
                    <input
                        type="checkbox"
                        className="accent-primary"
                        checked={stagger}
                        onChange={(e) => setStagger(e.target.checked)}
                    />
                    Reveal one stat at a time
                </label>
                {stagger && selectedKeys.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={revealIndex <= 0}
                            onClick={() => setRevealIndex((i) => Math.max(0, i - 1))}
                        >
                            Previous stat
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={revealIndex >= selectedKeys.length - 1}
                            onClick={() =>
                                setRevealIndex((i) => Math.min(selectedKeys.length - 1, i + 1))
                            }
                        >
                            Next stat
                        </Button>
                        <span className="text-xs text-muted-foreground">
                            Showing {visibleKeys.length} / {selectedKeys.length}
                        </span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {visibleKeys.map((k) => (
                    <StatCard
                        key={k}
                        statKey={k}
                        label={STAT_META[k].label}
                        icon={STAT_META[k].icon}
                        unit={STAT_META[k].unit ?? ''}
                    />
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                >
                    <div className="flex items-center justify-between">
                        <h3
                            className={`text-2xl font-black uppercase ${
                                overallWinner === 'myTeam' ? 'text-positive' : 'text-muted-foreground'
                            }`}
                        >
                            Your Team
                        </h3>
                        {overallWinner === 'myTeam' && (
                            <Trophy className="h-8 w-8 animate-bounce text-yellow-500" />
                        )}
                    </div>

                    <InsightsPitchView
                        players={myTeamPlayers}
                        teams={teams}
                        fixtures={fixtures}
                        currentEvent={currentEvent}
                        onPlayerClick={onPlayerClick}
                        showRanks={false}
                        picksMap={myTeamPicksMap}
                    />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                >
                    <div className="flex items-center justify-between">
                        <h3
                            className={`text-2xl font-black uppercase ${
                                overallWinner === 'alternate' ? 'text-positive' : 'text-muted-foreground'
                            }`}
                        >
                            Best Alternate Team
                        </h3>
                        {overallWinner === 'alternate' && (
                            <Trophy className="h-8 w-8 animate-bounce text-yellow-500" />
                        )}
                    </div>

                    <InsightsPitchView
                        players={alternateTeamPlayers}
                        teams={teams}
                        fixtures={fixtures}
                        currentEvent={currentEvent}
                        onPlayerClick={onPlayerClick}
                        showRanks={false}
                        picksMap={alternateTeamPicksMap}
                    />
                </motion.div>
            </div>
        </div>
    );
}
