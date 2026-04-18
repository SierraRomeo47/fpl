'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, TrendingUp, TrendingDown, Medal, Crown, Award, Globe, Flag, Eye, Activity } from "lucide-react";

// Retry helper with exponential backoff
async function fetchWithRetry(url: string, options: RequestInit = {}, maxRetries = 3): Promise<Response> {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const res = await fetch(url, options);
            if (res.ok || i === maxRetries - 1) {
                return res;
            }
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
    }
    throw new Error('Max retries exceeded');
}

export default function LeaguesPage() {
    const router = useRouter();
    const [sessionData, setSessionData] = useState<{ entryId: number } | null>(null);
    const [leagues, setLeagues] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const loadData = async () => {
            try {
                // First check if we have a valid session via cookies
                const sessionRes = await fetchWithRetry('/api/session', {
                    credentials: 'include'
                });
                
                if (!sessionRes.ok) {
                    // Only redirect if it's a 401 (unauthorized) - means no valid session
                    if (sessionRes.status === 401) {
                        router.push('/login');
                        return;
                    }
                    // For other errors, don't redirect - just log
                    console.warn('[LeaguesPage] Session check failed:', sessionRes.status);
                    return;
                }

                // Get full session data
                const sessionCheck = await sessionRes.json();
                const createRes = await fetch('/api/session/create', {
                    credentials: 'include'
                });
                let data;
                if (createRes.ok) {
                    data = await createRes.json();
                    data = data.session || data;
                } else {
                    // Fallback to entryId from session check
                    data = { entryId: sessionCheck.entryId };
                }

                if (!mounted) return;
                setSessionData(data);
                
                // Fetch entry data with retry
                const entryRes = await fetchWithRetry(`/api/fpl/entry/${data.entryId}/`);
                if (!entryRes.ok) {
                    throw new Error(`Failed to fetch entry: ${entryRes.status}`);
                }

                const entryData = await entryRes.json();
                if (!mounted) return;

                console.log('Entry data:', entryData);
                console.log('League data:', entryData.leagues);
                
                // Check if entries are already in the league objects
                if (entryData.leagues?.classic) {
                    entryData.leagues.classic.forEach((league: any) => {
                        console.log(`League ${league.name} - entries field:`, league.entries);
                    });
                }

                // The FPL API entry endpoint should already include entries count in league objects
                // But if not, we'll fetch it from the league info or standings endpoint
                if (entryData.leagues?.classic) {
                    const detailedLeagues = await Promise.all(
                        entryData.leagues.classic.map(async (league: any) => {
                            try {
                                // The entry endpoint should provide entries directly
                                // Check all possible field names
                                let totalEntries = league.entries || 
                                                  league.max_entries || 
                                                  league.total_entries ||
                                                  null;
                                
                                console.log(`League ${league.name} - Initial check:`, {
                                    entries: league.entries,
                                    max_entries: league.max_entries,
                                    total_entries: league.total_entries,
                                    found: totalEntries
                                });

                                // If not in entry response, fetch league info endpoint (single request)
                                if (!totalEntries || totalEntries === 0) {
                                    try {
                                        const leagueInfoUrl = `/api/fpl/leagues-classic/${league.id}/`;
                                        const leagueInfoRes = await fetchWithRetry(leagueInfoUrl, {}, 2);
                                        
                                        if (leagueInfoRes.ok) {
                                            const leagueInfo = await leagueInfoRes.json();
                                            console.log(`League ${league.name} info response:`, leagueInfo);
                                            
                                            // Check all possible locations in the response
                                            totalEntries = leagueInfo.league?.max_entries || 
                                                          leagueInfo.league?.total_entries || 
                                                          leagueInfo.league?.entries ||
                                                          leagueInfo.max_entries || 
                                                          leagueInfo.total_entries || 
                                                          leagueInfo.entries || 
                                                          null;
                                            
                                            console.log(`League ${league.name} from info endpoint:`, totalEntries);
                                        }
                                    } catch (error) {
                                        console.warn(`Failed to fetch league info for ${league.id}:`, error);
                                    }
                                }

                                // Last resort: fetch first page of standings to get count
                                // The standings endpoint might have a count field or we can check if it's not paginated
                                if (!totalEntries || totalEntries === 0) {
                                    try {
                                        const url = `/api/fpl/leagues-classic/${league.id}/standings/`;
                                        const standingsRes = await fetchWithRetry(url, {}, 1); // Single retry only

                                        if (standingsRes.ok) {
                                            const standingsData = await standingsRes.json();
                                            console.log(`League ${league.name} standings response structure:`, {
                                                has_standings: !!standingsData.standings,
                                                has_results: !!standingsData.standings?.results,
                                                results_length: standingsData.standings?.results?.length,
                                                has_next: standingsData.standings?.has_next,
                                                count: standingsData.standings?.count,
                                                total: standingsData.standings?.total
                                            });
                                            
                                            if (standingsData.standings) {
                                                // Check for count/total fields first
                                                totalEntries = standingsData.standings.count ||
                                                              standingsData.standings.total ||
                                                              null;
                                                
                                                // If no count field and not paginated, use results length
                                                if (!totalEntries && !standingsData.standings.has_next) {
                                                    totalEntries = standingsData.standings.results?.length || null;
                                                }
                                                
                                                // If paginated and no count, we cannot determine accurate total
                                                // Don't estimate - return null to hide components that need this data
                                                if (!totalEntries && standingsData.standings.has_next) {
                                                    console.log(`League ${league.name} is paginated but no count available - cannot determine total`);
                                                    totalEntries = null;
                                                }
                                            }
                                        }
                                    } catch (error) {
                                        console.error(`Failed to fetch standings for league ${league.id}:`, error);
                                    }
                                }

                                // Final validation - ensure we have a reasonable number
                                if (!totalEntries || totalEntries === 0) {
                                    console.warn(`Could not determine entries for league ${league.name}, using null`);
                                    totalEntries = null; // Don't use fake defaults
                                }

                                console.log(`Final total entries for league ${league.name}:`, totalEntries);

                                return {
                                    ...league,
                                    entries: totalEntries
                                };
                            } catch (error) {
                                console.error(`Failed to process league ${league.id}:`, error);
                                return {
                                    ...league,
                                    entries: league.entries || null // Keep original or null, no fake defaults
                                };
                            }
                        })
                    );
                    entryData.leagues.classic = detailedLeagues;
                }

                console.log('Updated league data with entries:', entryData.leagues.classic);
                if (mounted) {
                    setLeagues(entryData.leagues);
                    setIsLoading(false);
                }
            } catch (err) {
                console.error('[LeaguesPage] Error loading data:', err);
                if (mounted) {
                    setError(err instanceof Error ? err.message : 'Failed to load leagues');
                    setIsLoading(false);
                    // Only redirect if it's a session error, not a data error
                    if (err instanceof Error && err.message.includes('Session')) {
                        setTimeout(() => router.push('/login'), 2000);
                    }
                }
            }
        };

        loadData();

        return () => {
            mounted = false;
        };
    }, [router]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center space-y-4 p-4">
                    <p className="text-lg text-destructive font-semibold">Error loading leagues</p>
                    <p className="text-sm text-muted-foreground">{error}</p>
                    <button
                        onClick={() => {
                            setError(null);
                            setIsLoading(true);
                            router.refresh();
                        }}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!sessionData || isLoading || !leagues) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-muted-foreground">Loading leagues...</p>
                </div>
            </div>
        );
    }

    const getRankColor = (rank: number, total: number) => {
        const percentage = (rank / total) * 100;
        if (percentage <= 10) return 'text-rank-gold';
        if (percentage <= 25) return 'text-positive';
        if (percentage <= 50) return 'text-info';
        return 'text-muted-foreground';
    };

    const getRankBadge = (rank: number) => {
        if (rank === 1) return <Crown className="w-4 h-4 text-rank-gold" />;
        if (rank === 2) return <Medal className="w-4 h-4 text-muted-foreground" />;
        if (rank === 3) return <Medal className="w-4 h-4 text-caution" />;
        return null;
    };

    return (
        <>
            <div className="min-h-screen bg-background pb-32 pt-16">
                <div className="max-w-7xl mx-auto p-3 md:p-4 lg:p-6 space-y-4 md:space-y-6">
                    {/* Hero Section - Match Dashboard Style */}
                    <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-card border border-border p-4 md:p-8">
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 md:gap-3">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                                    <Trophy className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                                </div>
                                <div>
                                    <h1 className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-foreground">
                                        My Leagues
                                    </h1>
                                    <p className="text-xs md:text-sm text-muted-foreground">Compete with friends and rivals</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Classic Leagues */}
                    {leagues.classic && leagues.classic.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-lg md:text-2xl font-bold flex items-center gap-2">
                                <Award className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                                Classic Leagues
                            </h2>

                            <div className="grid gap-4">
                                {leagues.classic.map((league: any) => {
                                    const getLeagueIcon = () => {
                                        if (league.name.toLowerCase().includes('man utd') || league.name.toLowerCase().includes('manchester united')) {
                                            return <div className="w-6 h-6 text-red-600">🔴</div>;
                                        }
                                        if (league.name.toLowerCase().includes('india')) {
                                            return <Flag className="w-6 h-6 text-caution" />;
                                        }
                                        if (league.name.toLowerCase().includes('overall')) {
                                            return <Globe className="w-6 h-6 text-info" />;
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
                                                            <CardTitle className="text-xl cursor-pointer hover:text-primary transition-colors flex items-center gap-2" onClick={() => router.push(`/leagues/${league.id}`)}>
                                                                {league.name}
                                                                <Eye className="w-4 h-4 text-primary" />
                                                            </CardTitle>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {league.league_type && (
                                                                <Badge variant="outline" className="bg-primary/10">
                                                                    {league.league_type === 'x' ? 'Invitational' : 'Public'}
                                                                </Badge>
                                                            )}
                                                            {league.entries && league.entries > 0 && (
                                                                <Badge variant="outline">
                                                                    <Users className="w-3 h-3 mr-1" />
                                                                    {league.entries.toLocaleString()} managers
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="flex items-center gap-2 justify-end mb-1">
                                                            {getRankBadge(league.entry_rank)}
                                                            <p className={`text-3xl font-black ${getRankColor(league.entry_rank, league.entries || 1)}`}>
                                                                #{league.entry_rank}
                                                            </p>
                                                        </div>
                                                        {league.entries && league.entries > 0 && (
                                                            <p className="text-sm text-muted-foreground">
                                                                of {league.entries.toLocaleString()}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className={`grid gap-4 ${league.entries && league.entries > 0 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'}`}>
                                                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                                                        <p className="text-xs text-muted-foreground mb-1">Your Rank</p>
                                                        <p className="text-2xl font-bold text-primary">#{league.entry_rank}</p>
                                                    </div>
                                                    <div className="text-center p-3 bg-positive-muted rounded-lg">
                                                        <p className="text-xs text-muted-foreground mb-1">Last Rank</p>
                                                        <p className="text-2xl font-bold text-positive">
                                                            #{league.entry_last_rank || league.entry_rank}
                                                        </p>
                                                    </div>
                                                    <div className="text-center p-3 bg-info-muted rounded-lg">
                                                        <p className="text-xs text-muted-foreground mb-1">Started</p>
                                                        <p className="text-xl font-bold text-info">GW{league.start_event}</p>
                                                    </div>
                                                    {league.entries && league.entries > 0 && (
                                                        <div className="text-center p-3 bg-caution-muted rounded-lg">
                                                            <p className="text-xs text-muted-foreground mb-1">Top %</p>
                                                            <p className="text-xl font-bold text-caution">
                                                                {((league.entry_rank / league.entries) * 100).toFixed(1)}%
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                                {league.entry_last_rank && league.entry_last_rank !== league.entry_rank && (
                                                    <div className="mt-4 p-3 rounded-lg flex items-center justify-center gap-2 border border-border bg-muted">
                                                        {league.entry_last_rank > league.entry_rank ? (
                                                            <>
                                                                <TrendingUp className="w-5 h-5 text-positive" />
                                                                <span className="text-sm font-semibold text-positive">
                                                                    Up {league.entry_last_rank - league.entry_rank} places
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <TrendingDown className="w-5 h-5 text-negative" />
                                                                <span className="text-sm font-semibold text-negative">
                                                                    Down {league.entry_rank - league.entry_last_rank} places
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="mt-4 flex gap-2">
                                                    <button onClick={() => router.push(`/leagues/${league.id}`)} className="flex-1 p-3 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-sm tracking-widest uppercase rounded-lg flex items-center justify-center gap-2 transition-colors">
                                                        <Activity className="w-4 h-4" /> Live Sweep League
                                                    </button>
                                                </div>
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
                                                        {league.entries && league.entries > 0 && (
                                                            <Badge variant="outline">
                                                                <Users className="w-3 h-3 mr-1" />
                                                                {league.entries.toLocaleString()} managers
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                    <div className="text-right">
                                                        <div className="flex items-center gap-2 justify-end mb-1">
                                                            {getRankBadge(league.entry_rank)}
                                                            <p className={`text-3xl font-black ${getRankColor(league.entry_rank, league.entries || 1)}`}>
                                                                #{league.entry_rank}
                                                            </p>
                                                        </div>
                                                        {league.entries && league.entries > 0 && (
                                                            <p className="text-sm text-muted-foreground">
                                                                of {league.entries.toLocaleString()}
                                                            </p>
                                                        )}
                                                    </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="text-center p-3 bg-positive-muted rounded-lg">
                                                    <p className="text-xs text-muted-foreground mb-1">Wins</p>
                                                    <p className="text-2xl font-bold text-positive">{league.entry_win || 0}</p>
                                                </div>
                                                <div className="text-center p-3 bg-draw-muted rounded-lg">
                                                    <p className="text-xs text-muted-foreground mb-1">Draws</p>
                                                    <p className="text-2xl font-bold text-draw">{league.entry_draw || 0}</p>
                                                </div>
                                                <div className="text-center p-3 bg-negative-muted rounded-lg">
                                                    <p className="text-xs text-muted-foreground mb-1">Losses</p>
                                                    <p className="text-2xl font-bold text-negative">{league.entry_loss || 0}</p>
                                                </div>
                                                <div className="text-center p-3 bg-info-muted rounded-lg">
                                                    <p className="text-xs text-muted-foreground mb-1">Points</p>
                                                    <p className="text-2xl font-bold text-info">{league.entry_points || 0}</p>
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
                                <Trophy className="w-6 h-6 text-rank-gold" />
                                Cup Competitions
                            </h2>

                            <div className="grid gap-4">
                                {leagues.cup.map((cup: any) => (
                                    <Card key={cup.id} className="border-yellow-500/20 hover:border-yellow-500/40 transition-all">
                                        <CardHeader>
                                            <CardTitle className="text-xl flex items-center gap-2">
                                                <Trophy className="w-5 h-5 text-rank-gold" />
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
                                <Crown className="w-5 h-5 text-rank-gold" />
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
                                    <p className="text-3xl font-black text-positive">
                                        #{Math.min(...(leagues.classic?.map((l: any) => l.entry_rank) || [999999]))}
                                    </p>
                                </div>
                                <div className="text-center p-4 bg-card rounded-lg">
                                    <p className="text-sm text-muted-foreground mb-1">Top 3 Finishes</p>
                                    <p className="text-3xl font-black text-rank-gold">
                                        {(leagues.classic?.filter((l: any) => l.entry_rank <= 3).length || 0) +
                                            (leagues.h2h?.filter((l: any) => l.entry_rank <= 3).length || 0)}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}
