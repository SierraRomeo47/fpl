'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Trophy, Star, ArrowUp, ArrowDown, Calendar } from "lucide-react";
import { useFPLData } from "@/lib/hooks/use-fpl-data";
import { FPLNewsFeed } from "@/components/dashboard/fpl-news-feed";
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
                // First check if we have a valid session via cookies
                let res: Response | null = null;
                for (let i = 0; i < 3; i++) {
                    try {
                        res = await fetch('/api/session');
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
                const createRes = await fetch('/api/session/create');
                if (createRes.ok) {
                    const sessionData = await createRes.json();
                    if (mounted) {
                        setSessionData(sessionData.session || sessionData);
                    }
                } else if (mounted) {
                    // Fallback to entryId from session check
                    setSessionData({ entryId: sessionCheck.entryId });
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

    const totalPoints = history.current.reduce((sum: number, gw: any) => sum + (gw.points || 0), 0);
    const avgPoints = Math.round(totalPoints / history.current.length);
    const rankChange = prevGW && lastGW ? prevGW.overall_rank - lastGW.overall_rank : 0;

    // Chart data for ALL gameweeks from GW1
    const chartData = {
        labels: history.current.map((gw: any) => `GW${gw.event}`),
        datasets: [{
            label: 'Points',
            data: history.current.map((gw: any) => gw.points),
            borderColor: 'rgb(233, 0, 82)',
            backgroundColor: 'rgba(233, 0, 82, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: 'rgb(233, 0, 82)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
        }]
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
                borderColor: 'rgb(233, 0, 82)',
                borderWidth: 1,
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: 'rgba(255, 255, 255, 0.7)' }
            },
            x: {
                grid: { display: false },
                ticks: { color: 'rgba(255, 255, 255, 0.7)' }
            }
        }
    };

    return (
        <>
            <div className="min-h-screen bg-background pb-24 pt-16">
                <div className="max-w-7xl mx-auto p-3 md:p-4 lg:p-6 space-y-4 md:space-y-6">
                    {/* Hero Section */}
                    <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-card border border-border p-4 md:p-8 lg:p-12">
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                                    <Trophy className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                                </div>
                                <div>
                                    <h1 className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-foreground">
                                        {sessionData.teamName}
                                    </h1>
                                    <p className="text-xs md:text-sm text-muted-foreground">{sessionData.playerName}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mt-4 md:mt-8">
                                <div className="bg-background rounded-xl md:rounded-2xl p-3 md:p-4 border border-border">
                                    <p className="text-xs md:text-sm text-muted-foreground mb-1">Total Points</p>
                                    <p className="text-2xl md:text-3xl font-bold">{totalPoints.toLocaleString()}</p>
                                </div>
                                <div className="bg-card/80 backdrop-blur rounded-2xl p-4 border-2 border-primary/20">
                                    <p className="text-sm text-muted-foreground mb-1">Overall Rank</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-3xl font-bold">{lastGW?.overall_rank?.toLocaleString() || 'N/A'}</p>
                                        {rankChange !== 0 && (
                                            <Badge variant={rankChange > 0 ? "success" : "warning"} className="gap-1 text-xs">
                                                {rankChange > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                                                {Math.abs(rankChange).toLocaleString()}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-card/80 backdrop-blur rounded-2xl p-4 border-2 border-primary/20">
                                    <p className="text-sm text-muted-foreground mb-1">Team Value</p>
                                    <p className="text-3xl font-bold">£{(lastGW?.value / 10).toFixed(1)}m</p>
                                </div>
                                <div className="bg-card/80 backdrop-blur rounded-2xl p-4 border-2 border-primary/20">
                                    <p className="text-sm text-muted-foreground mb-1">Average GW</p>
                                    <p className="text-3xl font-bold">{avgPoints}</p>
                                </div>
                            </div>
                        </div>
                    </div>

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

                    <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                        {/* Points Progression */}
                        <Card className="border-border">
                            <CardHeader className="p-4 md:p-6 pb-3 md:pb-4">
                                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                                    <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                                    Points Progression
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 md:p-6 pt-0">
                                <div className="h-48 md:h-64">
                                    <Line data={chartData} options={chartOptions} />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Top Performers */}
                        <Card className="border-border">
                            <CardHeader className="p-4 md:p-6 pb-3 md:pb-4">
                                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                                    <Star className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                                    Season Highlights
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 md:space-y-4 p-4 md:p-6 pt-0">
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
                                        💺 Points on Bench
                                    </span>
                                    <span className="font-bold text-sm md:text-base">{lastGW?.points_on_bench || 0} pts</span>
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
