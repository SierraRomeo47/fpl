'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, ArrowLeft, Trophy, Users, ShieldAlert, CircleAlert, Crown, ArrowUp, ArrowDown, ChevronRight, TrendingUp, TrendingDown, Eye, Pin } from "lucide-react";
import { toast } from "sonner";

export default function LeagueLiveDashboard({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [activeGw, setActiveGw] = useState<number | null>(null);
    const [liveData, setLiveData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pinnedRivals, setPinnedRivals] = useState<any[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('fpl_pinned_rivals');
        if (saved) {
            try {
                setPinnedRivals(JSON.parse(saved));
            } catch (e) {}
        }
    }, []);

    const togglePin = (c: any) => {
        let newPinned = [...pinnedRivals];
        const exists = newPinned.find(p => p.entry === c.entry);
        if (exists) {
            newPinned = newPinned.filter(p => p.entry !== c.entry);
            toast("Rival Unpinned", { description: `${c.team_name} removed from your Radar.` });
        } else {
            if (newPinned.length >= 3) {
                toast.error("Radar Capacity Full", { description: "You can only track up to 3 direct rivals." });
                return;
            }
            newPinned.push({
                entry: c.entry,
                team_name: c.team_name,
                player_name: c.player_name,
            });
            toast.success("Rival Pinned", { description: `${c.team_name} added to your Dashboard Radar.` });
        }
        setPinnedRivals(newPinned);
        localStorage.setItem('fpl_pinned_rivals', JSON.stringify(newPinned));
    };

    useEffect(() => {
        let mounted = true;

        const loadDashboard = async () => {
            try {
                // 1. Fetch current Gameweek
                const bootRes = await fetch('/api/fpl/bootstrap-static/');
                if (!bootRes.ok) throw new Error('Failed to load FPL bootstrap');
                const bootData = await bootRes.json();
                
                const currentEvent = bootData.events.find((e: any) => e.is_current)?.id || null;
                if (!currentEvent) {
                    throw new Error('No active Gameweek found');
                }
                if (!mounted) return;
                setActiveGw(currentEvent);

                // 2. Map Player DB for EO mapping
                const playerCache: Record<number, string> = {};
                bootData.elements.forEach((p: any) => {
                    playerCache[p.id] = p.web_name;
                });

                // 3. Fetch Live Sweeper API
                const sweeperRes = await fetch(`/api/league-live/${id}?gw=${currentEvent}`);
                if (!sweeperRes.ok) throw new Error('Failed to sweep league');
                
                const sweeperData = await sweeperRes.json();
                if (!sweeperData.success) throw new Error(sweeperData.error);
                
                // Attach player names to MLEO array and sort
                const mleoArray = Object.keys(sweeperData.mleo).map(key => {
                    const elId = Number(key);
                    return {
                        id: elId,
                        name: playerCache[elId] || `Player ${elId}`,
                        ...sweeperData.mleo[elId]
                    };
                }).sort((a,b) => b.eo - a.eo).slice(0, 50); // Top 50 relevant players

                sweeperData.mleoArray = mleoArray;

                if (!mounted) return;
                setLiveData(sweeperData);
                setLoading(false);

            } catch (err) {
                console.error(err);
                if (mounted) {
                    setError(err instanceof Error ? err.message : 'Unknown error');
                    setLoading(false);
                }
            }
        };

        loadDashboard();
        return () => { mounted = false; };
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen pt-24 pb-12 flex flex-col items-center justify-center space-y-6">
                <div className="relative w-20 h-20">
                    <Activity className="w-20 h-20 text-primary animate-pulse absolute" />
                    <div className="w-20 h-20 border-4 border-t-primary border-r-transparent border-b-primary/30 border-l-transparent rounded-full animate-spin"></div>
                </div>
                <div className="text-center">
                    <h3 className="text-xl font-bold font-headline">Sweeping Mini-League...</h3>
                    <p className="text-muted-foreground text-sm max-w-sm mt-2">
                        Querying up to the Top 50 rival squads to calculate Live Points and Effective Ownership metrics.
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen pt-24 pb-12 flex items-center justify-center">
                <Card className="max-w-md w-full border-destructive bg-destructive/10">
                    <CardContent className="p-8 justify-center text-center space-y-4">
                        <CircleAlert className="w-12 h-12 text-destructive mx-auto" />
                        <div>
                            <h2 className="text-xl font-bold text-destructive">Sweeper Failed</h2>
                            <p className="text-sm text-destructive/80 mt-1">{error}</p>
                        </div>
                        <button onClick={() => router.back()} className="px-6 py-2 bg-background border border-border rounded-lg hover:bg-muted font-bold text-sm">
                            Go Back
                        </button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-32 pt-20">
            <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-8">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface p-6 rounded-2xl border border-border">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/leagues')} className="p-3 bg-muted rounded-xl hover:bg-primary/20 transition-colors">
                            <ArrowLeft className="w-5 h-5 text-foreground" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold tracking-widest uppercase">
                                    LIVE GW{activeGw}
                                </Badge>
                                <span className="text-xs text-muted-foreground ml-2">Sweep Sample: Top {liveData.league.sample_size}</span>
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-bold text-foreground font-headline truncate max-w-[60vw]">
                                {liveData.league.name}
                            </h1>
                        </div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    
                    {/* Left Col: Leaderboard */}
                    <div className="lg:col-span-2 space-y-6">
                        <h2 className="text-2xl font-bold font-headline flex items-center gap-2">
                            <Crown className="w-6 h-6 text-yellow-500" />
                            Live Standings (Top 50)
                        </h2>
                        
                        <div className="bg-card border border-border rounded-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted text-muted-foreground uppercase text-[0.65rem] font-bold tracking-wider">
                                        <tr>
                                            <th className="px-4 py-4 text-center">Rank</th>
                                            <th className="px-4 py-4">Manager</th>
                                            <th className="px-4 py-4 text-right">GW Pts</th>
                                            <th className="px-4 py-4 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {liveData.competitors.map((c: any, i: number) => {
                                            const rankChange = c.last_rank - (i+1); // Positive means they went UP in rank
                                            return (
                                                <tr key={c.entry} className="hover:bg-primary/5 transition-colors">
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <span className="font-bold text-base text-foreground">{i + 1}</span>
                                                            {rankChange > 0 && <ArrowUp className="w-4 h-4 text-positive" />}
                                                            {rankChange < 0 && <ArrowDown className="w-4 h-4 text-negative" />}
                                                            {rankChange === 0 && <div className="w-4 h-4 rounded-full bg-border/50" />}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div>
                                                                <p className="font-bold text-foreground truncate max-w-[150px] md:max-w-[200px]">{c.team_name}</p>
                                                                <p className="text-xs text-muted-foreground">{c.player_name}</p>
                                                            </div>
                                                            <button 
                                                                onClick={() => togglePin(c)}
                                                                className={`p-2 rounded-full transition-colors ${pinnedRivals.find(p => p.entry === c.entry) ? 'bg-primary/20 text-primary' : 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                                                            >
                                                                <Pin className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-right font-bold text-primary">
                                                        {c.gw_points}
                                                    </td>
                                                    <td className="px-4 py-4 text-right font-bold text-foreground text-lg">
                                                        {c.total_points}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Right Col: MLEO Analyzer */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2">
                            <Activity className="w-6 h-6 text-primary" />
                            <h2 className="text-2xl font-bold font-headline">Rivalry MLEO</h2>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            <strong>Mini-League Effective Ownership (MLEO)</strong> calculates the threat level of players in your specific league. If a player has &gt;100% MLEO, every point they score damages you unless you capain them!
                        </p>

                        <div className="grid gap-3">
                            {liveData.mleoArray.slice(0, 15).map((player: any) => {
                                const isThreat = player.eo > 100;
                                const isDifferential = player.eo < 20;

                                return (
                                    <div key={player.id} className="bg-card border border-border p-4 rounded-xl flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-bold text-sm text-foreground">{player.name}</span>
                                                <span className={`font-black text-sm ${isThreat ? 'text-destructive' : isDifferential ? 'text-positive' : 'text-primary'}`}>
                                                    {player.eo.toFixed(1)}%
                                                </span>
                                            </div>
                                            
                                            {/* Progress Bar */}
                                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
                                                <div 
                                                    className={`h-full ${isThreat ? 'bg-destructive' : isDifferential ? 'bg-positive' : 'bg-primary'}`} 
                                                    style={{ width: `${Math.min(player.eo, 200) / 2}%` }}
                                                />
                                            </div>
                                            
                                            <div className="flex items-center gap-4 mt-2 text-[0.65rem] text-muted-foreground tracking-wider font-bold uppercase">
                                                <span>Owned: {player.owned}</span>
                                                <span>Caps: {player.captained}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
