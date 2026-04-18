'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Goal, Activity } from "lucide-react";

export function LiveMatchCenter({ currentEventId }: { currentEventId: number | undefined }) {
    const [fixtures, setFixtures] = useState<any[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentEventId) return;

        let mounted = true;

        const loadMatches = async () => {
            try {
                // Fetch basic bootstrap to get teams
                const bootRes = await fetch('/api/fpl/bootstrap-static/');
                const bootData = await bootRes.json();
                if (!mounted) return;
                setTeams(bootData.teams);

                // Fetch real-time fixtures for the event
                const fixRes = await fetch(`/api/fpl/fixtures/?event=${currentEventId}`);
                if (fixRes.ok) {
                    const data = await fixRes.json();
                    if (mounted) {
                        setFixtures(data);
                    }
                }
            } catch (error) {
                console.error("Failed to load Live Match Center", error);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        loadMatches();
        
        // Auto-poll every 60 seconds if there are active matches
        const interval = setInterval(() => {
            const hasOngoingMatch = fixtures.some(f => f.started && !f.finished_provisional);
            if (hasOngoingMatch) {
                loadMatches();
            }
        }, 60000);

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, [currentEventId, fixtures.length]);

    const getTeamName = (id: number) => {
        const t = teams.find(team => team.id === id);
        return t ? t.short_name : 'UNK';
    };

    if (!currentEventId || loading) return null;

    // Filter to only matches that are TODAY (or simply sort by kickoff)
    // Actually, displaying "Active" and "Upcoming" matches for the gameweek is fine.
    
    // Check if any matches are currently running
    const activeMatches = fixtures.filter((f: any) => f.started && !f.finished_provisional);
    
    // Sort fixtures so active are at top, then upcoming, then finished
    const sorted = [...fixtures].sort((a: any, b: any) => {
        if (a.started && !a.finished_provisional && (!b.started || b.finished_provisional)) return -1;
        if (!a.started && (b.started || b.finished_provisional)) return 1;
        return new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime();
    });

    return (
        <Card className="border-border">
            <CardHeader className="p-4 md:p-6 pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Activity className={`w-5 h-5 ${activeMatches.length > 0 ? 'text-positive animate-pulse' : 'text-primary'}`} />
                        Live Match Center 
                        {activeMatches.length > 0 && <Badge className="bg-positive-muted text-positive font-bold border border-positive/40 hover:bg-positive-muted/80">L I V E</Badge>}
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-2">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sorted.slice(0, 6).map((match: any) => {
                        const isLive = match.started && !match.finished_provisional;
                        const isFinished = match.finished_provisional || match.finished;
                        const hasStarted = match.started;
                        const matchDate = match.kickoff_time ? new Date(match.kickoff_time) : null;

                        return (
                            <div key={match.id} className={`p-4 rounded-xl border ${isLive ? 'bg-positive-muted/40 border-positive/35' : 'bg-surface border-border'} flex flex-col justify-between transition-colors`}>
                                {/* Header / Status */}
                                <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex justify-between mb-3 border-b border-border/50 pb-2">
                                    <span>{matchDate ? matchDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : 'TBA'}</span>
                                    {isLive ? (
                                        <span className="text-positive flex items-center gap-1"><Clock className="w-3 h-3 animate-spin duration-3000" /> {match.minutes}'</span>
                                    ) : isFinished ? (
                                        <span>FT</span>
                                    ) : (
                                        <span>{matchDate ? matchDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : 'TBA'}</span>
                                    )}
                                </div>
                                
                                {/* Score Line */}
                                <div className="flex items-center justify-between gap-4 py-2">
                                    <div className="flex-1 font-headline font-bold text-lg text-right">{getTeamName(match.team_h)}</div>
                                    <div className={`px-3 py-1 rounded bg-muted font-black text-xl tracking-widest ${isLive ? 'text-positive outline outline-1 outline-positive/45' : 'text-foreground'}`}>
                                        {hasStarted ? `${match.team_h_score} - ${match.team_a_score}` : 'v'}
                                    </div>
                                    <div className="flex-1 font-headline font-bold text-lg text-left">{getTeamName(match.team_a)}</div>
                                </div>

                                {/* Goal Stats (If any exist) */}
                                {hasStarted && match.stats && match.stats.length > 0 && (
                                    <div className="mt-3 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                                        {/* Find the goals stat index */}
                                        {match.stats.find((s: any) => s.identifier === 'goals_scored')?.a.slice(0, 1).map((g: any) => (
                                            <div key={g.element} className="flex gap-1 items-center justify-end">
                                                <span>({g.value})</span> <Goal className="w-3 h-3 text-primary" /> 
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
