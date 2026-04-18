'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Trophy, Star, ArrowUp, ArrowDown, Calendar, BrainCircuit } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useFPLData } from "@/lib/hooks/use-fpl-data";
import { FPLNewsFeed } from "@/components/dashboard/fpl-news-feed";
import { RivalRadar } from "@/components/rival-radar";
import { LiveMatchCenter } from "@/components/live-match-center";
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function Dashboard() {
    const router = useRouter();
    const [sessionData, setSessionData] = useState<{ entryId: number; teamName: string; playerName: string } | null>(null);
    const [currentEventId, setCurrentEventId] = useState<number>();

    useEffect(() => {
        let mounted = true;

        const loadSession = async () => {
            try {
                let res: Response | null = null;
                for (let i = 0; i < 3; i++) {
                    try {
                        res = await fetch('/api/session', {
                            credentials: 'include'
                        });
                        if (res.ok || res.status === 401 || i === 2) break;
                        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
                    } catch (error) {
                        if (i === 2) throw error;
                        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
                    }
                }

                if (!res || res.status === 401) {
                    // Only redirect if truly unauthorized (no session)
                    router.push('/login');
                    return;
                }

                if (!res.ok) {
                    // For other errors, don't redirect - just log
                    console.warn('[Dashboard] Session check failed:', res.status);
                    return;
                }

                // Get full session data
                const sessionCheck = await res.json();
                const createRes = await fetch('/api/session/create', {
                    credentials: 'include'
                });
                if (createRes.ok) {
                    const sessionData = await createRes.json();
                    if (mounted) {
                        setSessionData(sessionData.session || sessionData);
                    }
                } else if (mounted) {
                    // Fallback to entryId from session check
                    setSessionData({ 
                        entryId: sessionCheck.entryId,
                        teamName: 'Team',
                        playerName: 'Player'
                    });
                }
            } catch (err) {
                console.error('[Dashboard] Error loading session:', err);
                // Don't auto-redirect on errors - let user stay on page
            }
        };

        loadSession();

        return () => {
            mounted = false;
        };
    }, [router]);

    const { bootstrap, entry, history, picks, isLoading } = useFPLData(
        sessionData?.entryId,
        currentEventId
    );

    useEffect(() => {
        if (bootstrap && !currentEventId) {
            const current = bootstrap.events.find((e: any) => e.is_current);
            const next = bootstrap.events.find((e: any) => e.is_next);
            setCurrentEventId(current?.id || next?.id);
        }
    }, [bootstrap, currentEventId]);

    if (!sessionData || isLoading || !bootstrap || !entry || !history) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-lg text-muted-foreground">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    const currentEvent = bootstrap.events.find((e: any) => e.is_current) || bootstrap.events.find((e: any) => e.is_next);
    const lastGW = history.current[history.current.length - 1];
    const prevGW = history.current[history.current.length - 2];

    const sumGwPoints = history.current.reduce((sum: number, gw: any) => sum + (gw.points || 0), 0);
    /** Prefer official cumulative from latest GW (avoids drift vs summing gw.points). */
    const headlineTotalPoints = lastGW?.total_points ?? sumGwPoints;
    const avgPoints = Math.round(sumGwPoints / history.current.length);
    /** Positive = rank number decreased vs prev GW (improved). */
    const rankChange = prevGW && lastGW ? prevGW.overall_rank - lastGW.overall_rank : 0;
    const rankImproved = rankChange > 0;

    // Chart data for ALL gameweeks from GW1
    const chartData = {
        labels: history.current.map((gw: any) => `GW${gw.event}`),
        datasets: [
            {
                label: 'Overall Rank',
                data: history.current.map((gw: any) => gw.overall_rank),
                borderColor: '#ff6b00',
                backgroundColor: 'rgba(255, 107, 0, 0.1)',
                yAxisID: 'y',
                fill: 'end',
                tension: 0.4,
                pointStyle: 'rect',
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: '#ff6b00',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
            },
            {
                label: 'Points',
                data: history.current.map((gw: any) => gw.points),
                borderColor: '#0084ff',
                backgroundColor: 'rgba(0, 132, 255, 0.1)',
                yAxisID: 'y1',
                fill: 'start',
                tension: 0.4,
                pointStyle: 'circle',
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#0084ff',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
            }
        ]
    };

    const formatAxisNumber = (value: number) => {
        if (value >= 1000000) return (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (value >= 1000) return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        return value.toString();
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                titleColor: '#fff',
                bodyColor: '#fff',
                borderColor: '#ff6b00',
                borderWidth: 1,
                callbacks: {
                    label: function(context: any) {
                        return `${context.dataset.label}: ${context.raw.toLocaleString('en-US')}`;
                    }
                }
            }
        },
        scales: {
            y: {
                type: 'linear' as const,
                display: true,
                position: 'left' as const,
                grid: { color: 'rgba(128, 128, 128, 0.2)' },
                ticks: { 
                    color: '#888',
                    callback: function(value: any) {
                        return formatAxisNumber(value);
                    }
                },
                reverse: true,
            },
            y1: {
                type: 'linear' as const,
                display: true,
                position: 'right' as const,
                grid: { display: false },
                ticks: { 
                    color: '#888',
                    callback: function(value: any) {
                        return formatAxisNumber(value);
                    }
                },
            },
            x: {
                grid: { display: false },
                ticks: { color: '#888' }
            }
        }
    };

    return (
        <>
            <div className="min-h-screen bg-surface pb-24 pt-6 overflow-x-hidden">
                <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
                    {/* Header Section */}
                    <div className="mb-8">
                        <h1 className="text-3xl md:text-4xl font-black font-headline tracking-tight text-on-surface">Dashboard</h1>
                        <p className="text-on-surface-variant mt-1 font-medium">Your performance overview for Gameweek {lastGW?.event || currentEvent?.id}.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Total Points Card (Dark) */}
                        <div className="bg-[#1c1b1b] rounded-2xl p-6 text-white relative overflow-hidden border-2 border-[#1c1b1b] shadow-[4px_4px_0px_0px_rgba(255,107,0,1)] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_0px_rgba(255,107,0,1)] transition-all duration-200">
                            <div className="relative z-10">
                                <p className="text-sm font-bold text-muted-foreground tracking-wider font-headline uppercase">TOTAL POINTS</p>
                                <p className="text-5xl font-black mt-2 tracking-tighter drop-shadow-md">{headlineTotalPoints.toLocaleString()}</p>
                                <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-tertiary/20 text-tertiary rounded-full font-bold text-sm">
                                    <TrendingUp className="w-4 h-4" />
                                    <span>+{lastGW?.points || 0} this GW</span>
                                </div>
                            </div>
                            <div className="absolute -right-4 -bottom-4 text-white/5 right-0 rotate-12">
                                <Star className="w-48 h-48 fill-current" />
                            </div>
                        </div>

                        {/* Overall Rank Card (Light) */}
                        <div className="bg-surface-container-lowest rounded-2xl p-6 relative overflow-hidden border-2 border-outline-variant hover:-translate-y-1 hover:shadow-lg transition-all duration-200">
                            <div className="relative z-10">
                                <p className="text-sm font-bold text-primary tracking-wider font-headline uppercase">OVERALL RANK</p>
                                <p className="text-5xl font-black mt-2 tracking-tighter text-on-surface drop-shadow-sm">{lastGW?.overall_rank?.toLocaleString() || 'N/A'}</p>
                                {rankChange !== 0 && (
                                    <div className={`mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-sm ${rankImproved ? 'bg-tertiary/10 text-tertiary' : 'bg-error/10 text-error'}`}>
                                        {rankImproved ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                        <span>
                                            {rankImproved ? 'Up ' : 'Down '}
                                            {Math.abs(rankChange) > 1000 ? `${(Math.abs(rankChange)/1000).toFixed(1)}k` : Math.abs(rankChange).toLocaleString()} places
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Gameweek Rank Card (Orange) */}
                        <div className="bg-primary rounded-2xl p-6 relative overflow-hidden border-2 border-primary text-white shadow-lg shadow-primary/30 hover:-translate-y-1 hover:shadow-primary/40 transition-all duration-200">
                            <div className="relative z-10">
                                <p className="text-sm font-bold tracking-wider font-headline uppercase text-white/90">GAMEWEEK RANK</p>
                                <p className="text-5xl font-black mt-2 tracking-tighter drop-shadow-md">{lastGW?.rank != null ? lastGW.rank.toLocaleString() : 'N/A'}</p>
                                <div className="mt-4 flex flex-col gap-2">
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-black/20 rounded-full font-bold text-sm w-fit">
                                        <span>Average GW: {avgPoints}</span>
                                    </div>
                                    {lastGW?.event_transfers_cost > 0 && (
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-black/30 rounded-full font-bold text-xs text-white/90 w-fit">
                                            <span>Hit: −{lastGW.event_transfers_cost} pts (transfers)</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Rival Radar Container */}
                    <RivalRadar currentGw={currentEvent?.id} />

                    {/* Live Match Center */}
                    <div className="mt-8 mb-8">
                        <LiveMatchCenter currentEventId={currentEvent?.id} />
                    </div>

                    {/* AI Insights Card */}
                    <Link href="/dashboard/ai">
                        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 transition-all cursor-pointer">
                            <CardContent className="p-4 md:p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 md:gap-4">
                                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                                            <BrainCircuit className="w-6 h-6 md:w-7 md:h-7 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg md:text-xl text-foreground">AI Insights</h3>
                                            <p className="text-xs md:text-sm text-muted-foreground">Get captain & transfer recommendations based on Joshua Bull's research</p>
                                        </div>
                                    </div>
                                    <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                                        View →
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    {/* Current Gameweek */}
                    {currentEvent && (
                        <Card className="border-border bg-card">
                            <CardContent className="p-4 md:p-6">
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 md:gap-3">
                                        <Calendar className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                                        <div>
                                            <p className="font-medium text-base md:text-lg">Gameweek {currentEvent.id}</p>
                                            <p className="text-xs md:text-sm text-muted-foreground">{currentEvent.name}</p>
                                        </div>
                                    </div>
                                    <Badge
                                        variant={currentEvent.finished ? "secondary" : currentEvent.is_current ? "default" : "info"}
                                        className="text-sm px-3 py-1 gap-1.5"
                                    >
                                        {currentEvent.finished ? (
                                            <>✓ Finished</>
                                        ) : currentEvent.is_current ? (
                                            <>🔴 Live</>
                                        ) : (
                                            <>📅 Upcoming</>
                                        )}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="grid md:grid-cols-3 gap-6 mt-8">
                        {/* Rank Progression Chart */}
                        <div className="md:col-span-2 bg-surface-container-lowest rounded-2xl border-2 border-outline-variant p-6 p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-headline font-bold text-xl text-on-surface">Rank vs Points</h3>
                                <div className="flex items-center gap-4 text-sm font-semibold">
                                    <div className="flex items-center gap-2 text-[#ff6b00]">
                                        <div className="w-3 h-3 bg-[#ff6b00] border-2 border-[#ff6b00] mr-1" />
                                        Rank
                                    </div>
                                    <div className="flex items-center gap-2 text-[#0084ff]">
                                        <div className="w-3 h-3 bg-[#0084ff] rounded-full mr-1" />
                                        Points
                                    </div>
                                </div>
                            </div>
                            <div className="h-64">
                                <Line data={chartData} options={chartOptions as any} />
                            </div>
                            <p className="text-center text-xs font-semibold text-on-surface-variant mt-4">
                                Chart displaying Rank (Orange, left axis) and Points (Blue, right axis) over the Gameweeks.
                            </p>
                        </div>

                        {/* Top Performers */}
                        <Card className="border-border flex flex-col h-full">
                            <CardHeader className="p-4 md:p-6 pb-3 md:pb-4 flex-none">
                                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                                    <Star className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                                    Season Highlights
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col justify-between p-4 md:p-6 pt-0">
                                <div className="flex items-center justify-between p-2 md:p-3 rounded-lg bg-background border border-border">
                                    <span className="text-xs md:text-sm text-muted-foreground flex items-center gap-1 md:gap-2">
                                        🏆 Best Gameweek
                                    </span>
                                    <span className="font-bold text-sm md:text-base text-primary">{Math.max(...history.current.map((gw: any) => gw.points))} pts</span>
                                </div>
                                <div className="flex items-center justify-between p-2 md:p-3 rounded-lg bg-background border border-border">
                                    <span className="text-xs md:text-sm text-muted-foreground flex items-center gap-1 md:gap-2">
                                        📈 Highest Rank
                                    </span>
                                    <span className="font-bold text-sm md:text-base text-primary">{Math.min(...history.current.map((gw: any) => gw.overall_rank)).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between p-2 md:p-3 rounded-lg bg-background border border-border">
                                    <span className="text-xs md:text-sm text-muted-foreground flex items-center gap-1 md:gap-2">
                                        📊 Avg GW Points
                                    </span>
                                    <span className="font-bold text-sm md:text-base">{avgPoints} pts</span>
                                </div>
                                <div className="flex items-center justify-between p-2 md:p-3 rounded-lg bg-background border border-border">
                                    <span className="text-xs md:text-sm text-muted-foreground flex items-center gap-1 md:gap-2">
                                        🔄 Total Transfers
                                    </span>
                                    <span className="font-bold text-sm md:text-base">{history.current.reduce((sum: number, gw: any) => sum + (gw.event_transfers || 0), 0)}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* FPL News Feed */}
                    <FPLNewsFeed />
                </div>
            </div>
        </>
    );
}
