'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, PinOff, RefreshCcw, UserCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function RivalRadar({ currentGw }: { currentGw: number | undefined }) {
    const [rivals, setRivals] = useState<any[]>([]);
    const [rivalPoints, setRivalPoints] = useState<Record<number, any>>({});
    const [loading, setLoading] = useState(false);

    const loadRivals = () => {
        const saved = localStorage.getItem('fpl_pinned_rivals');
        if (saved) {
            try {
                setRivals(JSON.parse(saved));
            } catch (e) {}
        }
    };

    useEffect(() => {
        loadRivals();
        // Optional: Listen to storage events if unpinned from another tab
        window.addEventListener('storage', loadRivals);
        return () => window.removeEventListener('storage', loadRivals);
    }, []);

    const fetchRivalScores = async () => {
        if (!currentGw || rivals.length === 0) return;
        setLoading(true);

        const newPoints: Record<number, any> = {};

        try {
            await Promise.all(rivals.map(async (r) => {
                const res = await fetch(`/api/fpl/entry/${r.entry}/event/${currentGw}/picks/`);
                if (res.ok) {
                    const data = await res.json();
                    newPoints[r.entry] = {
                        gw_points: data.entry_history.points - data.entry_history.event_transfers_cost,
                        total_points: data.entry_history.total_points
                    };
                }
            }));
            setRivalPoints(newPoints);
        } catch (e) {
            console.error("Failed to sync radar.", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRivalScores();
    }, [currentGw, rivals.length]);

    const removeRival = (entryId: number) => {
        const newRivals = rivals.filter(r => r.entry !== entryId);
        setRivals(newRivals);
        localStorage.setItem('fpl_pinned_rivals', JSON.stringify(newRivals));
    };

    if (rivals.length === 0) return null;

    return (
        <Card className="border-border bg-gradient-to-br from-surface to-background shadow-md overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-destructive"></div>
            <CardHeader className="p-4 md:p-6 pb-2 border-b border-border/50">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Activity className="w-5 h-5 text-destructive" />
                        Live Rival Radar
                    </CardTitle>
                    <button onClick={fetchRivalScores} disabled={loading} className="text-muted-foreground hover:text-foreground">
                        <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                    {rivals.map(r => (
                        <div key={r.entry} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3">
                                <UserCircle2 className="w-8 h-8 text-muted-foreground" />
                                <div>
                                    <p className="font-bold text-sm truncate max-w-[120px] md:max-w-[180px]">{r.team_name}</p>
                                    <p className="text-xs text-muted-foreground">{r.player_name}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4 text-right">
                                {rivalPoints[r.entry] ? (
                                    <>
                                        <div>
                                            <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">GW {currentGw}</p>
                                            <p className="font-black text-lg text-primary">{rivalPoints[r.entry].gw_points}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Total</p>
                                            <p className="font-bold text-lg">{rivalPoints[r.entry].total_points}</p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-20 h-8 rounded animate-pulse bg-muted"></div>
                                )}
                                
                                <button onClick={() => removeRival(r.entry)} className="p-2 ml-2 bg-muted hover:bg-destructive hover:text-destructive-foreground rounded-lg transition-colors text-muted-foreground">
                                    <PinOff className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
