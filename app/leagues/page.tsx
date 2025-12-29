'use client';

import { useEffect, useState } from 'react';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, TrendingUp, TrendingDown, Medal, Crown, Award, Globe, Flag } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";

export default function LeaguesPage() {
    const [sessionData, setSessionData] = useState<{ entryId: number } | null>(null);
    const [leagues, setLeagues] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch('/api/session/create')
            .then(res => res.ok ? res.json() : Promise.reject())
            .then(data => {
                setSessionData(data);
                return fetch(`/api/fpl/entry/${data.entryId}/`);
            })
            .then(res => res.json())
            .then(async (data) => {
                console.log('League data:', data.leagues);

                // Fetch detailed standings for each classic league to get total entries
                if (data.leagues?.classic) {
                    const detailedLeagues = await Promise.all(
                        data.leagues.classic.map(async (league: any) => {
                            try {
                                const url = `/api/fpl/leagues-classic/${league.id}/standings/`;
                                console.log(`Fetching standings from: ${url}`);
                                const standingsRes = await fetch(url);

                                if (!standingsRes.ok) {
                                    console.error(`Failed to fetch standings for league ${league.id}, status:`, standingsRes.status);
                                    return league;
                                }

                                const standingsData = await standingsRes.json();
                                console.log(`Standings data for league ${league.id}:`, standingsData);

                                // Calculate total entries
                                let totalEntries = null;

                                if (standingsData.standings) {
                                    // If has_next is false, all players are on this page
                                    if (!standingsData.standings.has_next) {
                                        totalEntries = standingsData.standings.results?.length || null;
                                    } else {
                                        // For paginated leagues, we'd need to fetch all pages or use a different approach
                                        // For now, we'll estimate based on page size
                                        const pageSize = standingsData.standings.results?.length || 50;
                                        // Note: This is an estimate, not exact
                                        totalEntries = pageSize * 10; // Rough estimate
                                    }
                                }

                                console.log(`Total entries for league ${league.name}:`, totalEntries);

                                return {
                                    ...league,
                                    entries: totalEntries
                                };
                            } catch (error) {
                                console.error(`Failed to fetch standings for league ${league.id}:`, error);
                                return league;
                            }
                        })
                    );
                    data.leagues.classic = detailedLeagues;
                }

                console.log('Updated league data with entries:', data.leagues.classic);
                setLeagues(data.leagues);
                setIsLoading(false);
            })
            .catch(() => redirect('/login'));
    }, []);

    if (!sessionData || isLoading || !leagues) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const getRankColor = (rank: number, total: number) => {
        const percentage = (rank / total) * 100;
        if (percentage <= 10) return 'text-yellow-500';
        if (percentage <= 25) return 'text-green-500';
        if (percentage <= 50) return 'text-blue-500';
        return 'text-muted-foreground';
    };

    const getRankBadge = (rank: number) => {
        if (rank === 1) return <Crown className="w-4 h-4 text-yellow-500" />;
        if (rank === 2) return <Medal className="w-4 h-4 text-gray-400" />;
        if (rank === 3) return <Medal className="w-4 h-4 text-orange-600" />;
        return null;
    };

    return (
        <>
            <div className="min-h-screen bg-background pb-32">
                <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
                    {/* Hero Section - Match Dashboard Style */}
                    <div className="relative overflow-hidden rounded-3xl bg-card border border-border p-8">
                        <div className="relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                                    <Trophy className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                                        My Leagues
                                    </h1>
                                    <p className="text-muted-foreground">Compete with friends and rivals</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Classic Leagues */}
                    {leagues.classic && leagues.classic.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <Award className="w-6 h-6 text-primary" />
                                Classic Leagues
                            </h2>

                            <div className="grid gap-4">
                                {leagues.classic.map((league: any) => {
                                    const getLeagueIcon = () => {
                                        if (league.name.toLowerCase().includes('man utd') || league.name.toLowerCase().includes('manchester united')) {
                                            return <div className="w-6 h-6 text-red-600">🔴</div>;
                                        }
                                        if (league.name.toLowerCase().includes('india')) {
                                            return <Flag className="w-6 h-6 text-orange-500" />;
                                        }
                                        if (league.name.toLowerCase().includes('overall')) {
                                            return <Globe className="w-6 h-6 text-blue-500" />;
                                        }
                                        return <Trophy className="w-6 h-6 text-primary" />;
                                    };

                                    return (
                                        <Card key={league.id} className="border-primary/20 hover:border-primary/40 transition-all">
                                            <CardHeader>
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            {getLeagueIcon()}
                                                            <CardTitle className="text-xl">{league.name}</CardTitle>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {league.league_type && (
                                                                <Badge variant="outline" className="bg-primary/10">
                                                                    {league.league_type === 'x' ? 'Invitational' : 'Public'}
                                                                </Badge>
                                                            )}
                                                            <Badge variant="outline">
                                                                <Users className="w-3 h-3 mr-1" />
                                                                {league.entries || 'N/A'} managers
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="flex items-center gap-2 justify-end mb-1">
                                                            {getRankBadge(league.entry_rank)}
                                                            <p className={`text-3xl font-black ${getRankColor(league.entry_rank, league.entries || 1)}`}>
                                                                #{league.entry_rank}
                                                            </p>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground">
                                                            of {league.entries?.toLocaleString() || 'N/A'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                                                        <p className="text-xs text-muted-foreground mb-1">Your Rank</p>
                                                        <p className="text-2xl font-bold text-primary">#{league.entry_rank}</p>
                                                    </div>
                                                    <div className="text-center p-3 bg-green-500/10 rounded-lg">
                                                        <p className="text-xs text-muted-foreground mb-1">Last Rank</p>
                                                        <p className="text-2xl font-bold text-green-600">
                                                            #{league.entry_last_rank || league.entry_rank}
                                                        </p>
                                                    </div>
                                                    <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                                                        <p className="text-xs text-muted-foreground mb-1">Started</p>
                                                        <p className="text-xl font-bold text-blue-600">GW{league.start_event}</p>
                                                    </div>
                                                    <div className="text-center p-3 bg-orange-500/10 rounded-lg">
                                                        <p className="text-xs text-muted-foreground mb-1">Top %</p>
                                                        <p className="text-xl font-bold text-orange-600">
                                                            {(() => {
                                                                if (!league.entries || league.entries === 0) return 'N/A';
                                                                const percentage = (league.entry_rank / league.entries) * 100;
                                                                return `${percentage.toFixed(1)}%`;
                                                            })()}
                                                        </p>
                                                    </div>
                                                </div>

                                                {league.entry_last_rank && league.entry_last_rank !== league.entry_rank && (
                                                    <div className="mt-4 p-3 bg-secondary/50 rounded-lg flex items-center justify-center gap-2">
                                                        {league.entry_last_rank > league.entry_rank ? (
                                                            <>
                                                                <TrendingUp className="w-5 h-5 text-green-500" />
                                                                <span className="text-sm font-semibold text-green-500">
                                                                    Up {league.entry_last_rank - league.entry_rank} places
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <TrendingDown className="w-5 h-5 text-red-500" />
                                                                <span className="text-sm font-semibold text-red-500">
                                                                    Down {league.entry_rank - league.entry_last_rank} places
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* H2H Leagues */}
                    {leagues.h2h && leagues.h2h.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <Users className="w-6 h-6 text-primary" />
                                Head-to-Head Leagues
                            </h2>

                            <div className="grid gap-4">
                                {leagues.h2h.map((league: any) => (
                                    <Card key={league.id} className="border-primary/20 hover:border-primary/40 transition-all">
                                        <CardHeader>
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <CardTitle className="text-xl mb-2">{league.name}</CardTitle>
                                                    <div className="flex flex-wrap gap-2">
                                                        <Badge variant="outline" className="bg-purple-500/10">
                                                            Head-to-Head
                                                        </Badge>
                                                        <Badge variant="outline">
                                                            <Users className="w-3 h-3 mr-1" />
                                                            {league.entries || 'N/A'} managers
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="flex items-center gap-2 justify-end mb-1">
                                                        {getRankBadge(league.entry_rank)}
                                                        <p className={`text-3xl font-black ${getRankColor(league.entry_rank, league.entries || 1)}`}>
                                                            #{league.entry_rank}
                                                        </p>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        of {league.entries?.toLocaleString() || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="text-center p-3 bg-primary/10 rounded-lg">
                                                    <p className="text-xs text-muted-foreground mb-1">Wins</p>
                                                    <p className="text-2xl font-bold text-green-600">{league.entry_win || 0}</p>
                                                </div>
                                                <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
                                                    <p className="text-xs text-muted-foreground mb-1">Draws</p>
                                                    <p className="text-2xl font-bold text-yellow-600">{league.entry_draw || 0}</p>
                                                </div>
                                                <div className="text-center p-3 bg-red-500/10 rounded-lg">
                                                    <p className="text-xs text-muted-foreground mb-1">Losses</p>
                                                    <p className="text-2xl font-bold text-red-600">{league.entry_loss || 0}</p>
                                                </div>
                                                <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                                                    <p className="text-xs text-muted-foreground mb-1">Points</p>
                                                    <p className="text-2xl font-bold text-blue-600">{league.entry_points || 0}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Cup */}
                    {leagues.cup && leagues.cup.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <Trophy className="w-6 h-6 text-yellow-500" />
                                Cup Competitions
                            </h2>

                            <div className="grid gap-4">
                                {leagues.cup.map((cup: any) => (
                                    <Card key={cup.id} className="border-yellow-500/20 hover:border-yellow-500/40 transition-all">
                                        <CardHeader>
                                            <CardTitle className="text-xl flex items-center gap-2">
                                                <Trophy className="w-5 h-5 text-yellow-500" />
                                                {cup.name}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg border border-yellow-500/20">
                                                <p className="text-center text-lg font-semibold">
                                                    {cup.entry_rank ? `Round ${cup.entry_rank}` : 'Qualified'}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {(!leagues.classic || leagues.classic.length === 0) &&
                        (!leagues.h2h || leagues.h2h.length === 0) &&
                        (!leagues.cup || leagues.cup.length === 0) && (
                            <Card className="border-primary/20">
                                <CardContent className="p-12 text-center">
                                    <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                                    <h3 className="text-xl font-bold mb-2">No Leagues Yet</h3>
                                    <p className="text-muted-foreground">
                                        Join or create a league to compete with other managers!
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                    {/* Overall Rank Summary */}
                    <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-purple-500/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Crown className="w-5 h-5 text-yellow-500" />
                                League Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-3 gap-4">
                                <div className="text-center p-4 bg-card rounded-lg">
                                    <p className="text-sm text-muted-foreground mb-1">Total Leagues</p>
                                    <p className="text-3xl font-black text-primary">
                                        {(leagues.classic?.length || 0) + (leagues.h2h?.length || 0) + (leagues.cup?.length || 0)}
                                    </p>
                                </div>
                                <div className="text-center p-4 bg-card rounded-lg">
                                    <p className="text-sm text-muted-foreground mb-1">Best Rank</p>
                                    <p className="text-3xl font-black text-green-600">
                                        #{Math.min(...(leagues.classic?.map((l: any) => l.entry_rank) || [999999]))}
                                    </p>
                                </div>
                                <div className="text-center p-4 bg-card rounded-lg">
                                    <p className="text-sm text-muted-foreground mb-1">Top 3 Finishes</p>
                                    <p className="text-3xl font-black text-yellow-500">
                                        {(leagues.classic?.filter((l: any) => l.entry_rank <= 3).length || 0) +
                                            (leagues.h2h?.filter((l: any) => l.entry_rank <= 3).length || 0)}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            <BottomNav />
        </>
    );
}
