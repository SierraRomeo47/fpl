'use client';

import { useEffect, useState } from 'react';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Trophy, X, ChevronLeft, ChevronRight, Users, Target, Shield, Zap, Award, Activity, Star } from "lucide-react";
import { useFPLData, useEventPicks } from "@/lib/hooks/use-fpl-data";
import { BottomNav } from "@/components/bottom-nav";
import { InsightsPitchView } from "@/components/insights/insights-pitch-view";
import { PlayerDetailModal } from "@/components/insights/player-detail-modal";
import { getPlayerPhotoUrls, getTeamBadgeUrl, getPlayerInitials } from '@/lib/player-photo-utils';


export default function HistoryPage() {
    const [sessionData, setSessionData] = useState<{ entryId: number } | null>(null);
    const [selectedGW, setSelectedGW] = useState<number | null>(null);
    const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
    const [playerHistories, setPlayerHistories] = useState<Map<number, any[]>>(new Map());
    const [topCategory, setTopCategory] = useState<string>('my_points');
    const [myPlayers, setMyPlayers] = useState<Set<number>>(new Set());
    const [allPicksLoaded, setAllPicksLoaded] = useState(false);
    const [playerStats, setPlayerStats] = useState<Map<number, { points: number, goals: number, assists: number, cleanSheets: number, appearances: number }>>(new Map());

    useEffect(() => {
        fetch('/api/session/create')
            .then(res => res.ok ? res.json() : Promise.reject())
            .then(data => setSessionData(data))
            .catch(() => redirect('/login'));
    }, []);

    const { bootstrap, history, fixtures, isLoading } = useFPLData(sessionData?.entryId);
    const { data: picksData } = useEventPicks(sessionData?.entryId, selectedGW || undefined);
    
    // Set default to most recent GW if not selected (must be before early return)
    useEffect(() => {
        if (history && !selectedGW && history.current && history.current.length > 0) {
            const lastGW = history.current[history.current.length - 1];
            setSelectedGW(lastGW?.event);
        }
    }, [history, selectedGW]);

    // Fetch player histories for all players in the selected gameweek
    useEffect(() => {
        const fetchPlayerHistories = async () => {
            if (!picksData?.picks || !selectedGW) return;

            const playerIds = picksData.picks.map((pick: any) => pick.element);
            const uniquePlayerIds = Array.from(new Set(playerIds));

            // Fetch histories for all players in parallel
            // We'll check for duplicates when updating state
            const fetchPromises = uniquePlayerIds.map(async (playerId: number) => {
                try {
                    const response = await fetch(`/api/fpl/element-summary/${playerId}/`);
                    if (!response.ok) {
                        console.warn(`[HistoryPage] Failed to fetch history for player ${playerId}`);
                        return null;
                    }
                    const data = await response.json();
                    const gwHistory = Array.isArray(data.history) ? data.history : [];
                    
                    // Sort by event number
                    const sortedHistory = gwHistory.sort((a: any, b: any) => {
                        const eventA = a.event || a.round || 0;
                        const eventB = b.event || b.round || 0;
                        return eventA - eventB;
                    });

                    return { playerId, history: sortedHistory };
                } catch (error) {
                    console.error(`[HistoryPage] Error fetching history for player ${playerId}:`, error);
                    return null;
                }
            });

            const results = await Promise.all(fetchPromises);
            const validResults = results.filter((r): r is { playerId: number; history: any[] } => r !== null);

            if (validResults.length === 0) return;

            // Update state with new histories (only add if not already present)
            setPlayerHistories(prev => {
                const newMap = new Map(prev);
                validResults.forEach(result => {
                    if (result && result.history && !newMap.has(result.playerId)) {
                        newMap.set(result.playerId, result.history);
                    }
                });
                return newMap;
            });
        };

        fetchPlayerHistories();
    }, [picksData?.picks, selectedGW]);

    // Fetch picks for all gameweeks to build list of "my players" and calculate their stats
    useEffect(() => {
        const fetchAllPicks = async () => {
            if (!sessionData?.entryId || !history?.current || allPicksLoaded) return;

            const allPlayerIds = new Set<number>();
            const playerGWMap = new Map<number, Set<number>>(); // Map player ID to set of gameweeks they were in team
            
            // First pass: Fetch picks for all gameweeks to identify "my players" and when they were in team
            const fetchPromises = history.current.map(async (gw: any) => {
                try {
                    const response = await fetch(`/api/fpl/entry/${sessionData.entryId}/event/${gw.event}/picks`);
                    if (!response.ok) return null;
                    const data = await response.json();
                    if (data.picks && Array.isArray(data.picks)) {
                        data.picks.forEach((pick: any) => {
                            allPlayerIds.add(pick.element);
                            
                            if (!playerGWMap.has(pick.element)) {
                                playerGWMap.set(pick.element, new Set());
                            }
                            playerGWMap.get(pick.element)!.add(gw.event);
                        });
                    }
                } catch (error) {
                    console.error(`[HistoryPage] Error fetching picks for GW ${gw.event}:`, error);
                }
            });

            await Promise.all(fetchPromises);
            setMyPlayers(allPlayerIds);
            
            // Now fetch player histories for all "my players" and calculate stats
            const statsMap = new Map<number, { points: number, goals: number, assists: number, cleanSheets: number, appearances: number }>();
            
            const historyPromises = Array.from(allPlayerIds).map(async (playerId: number) => {
                try {
                    const response = await fetch(`/api/fpl/element-summary/${playerId}/`);
                    if (!response.ok) return null;
                    const data = await response.json();
                    const gwHistory = Array.isArray(data.history) ? data.history : [];
                    
                    // Initialize stats
                    const stats = { points: 0, goals: 0, assists: 0, cleanSheets: 0, appearances: 0 };
                    const playerGWs = playerGWMap.get(playerId) || new Set();
                    
                    // Calculate stats only for gameweeks when player was in team
                    gwHistory.forEach((entry: any) => {
                        const event = entry.event || entry.round;
                        if (playerGWs.has(event)) {
                            stats.points += entry.total_points || entry.points || 0;
                            stats.goals += entry.goals_scored || 0;
                            stats.assists += entry.assists || 0;
                            stats.cleanSheets += entry.clean_sheets || 0;
                            stats.appearances += 1;
                        }
                    });
                    
                    statsMap.set(playerId, stats);
                } catch (error) {
                    console.error(`[HistoryPage] Error fetching history for player ${playerId}:`, error);
                }
            });

            await Promise.all(historyPromises);
            setPlayerStats(statsMap);
            setAllPicksLoaded(true);
        };

        fetchAllPicks();
    }, [sessionData?.entryId, history?.current, allPicksLoaded]);
    
    const currentEvent = bootstrap?.events?.find((e: any) => e.is_current);

    if (!sessionData || isLoading || !bootstrap || !history) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const teams = bootstrap.teams;
    const elements = bootstrap.elements;
    const getPlayer = (elementId: number) => elements.find((p: any) => p.id === elementId);
    const getTeam = (teamId: number) => teams.find((t: any) => t.id === teamId);

    const selectedGWData = selectedGW ? history.current.find((gw: any) => gw.event === selectedGW) : null;
    const prevGWData = selectedGW ? history.current.find((gw: any) => gw.event === selectedGW - 1) : null;

    // Create picks map for C/VC status and points data
    const picksMap = picksData?.picks ? new Map(picksData.picks.map((pick: any) => [pick.element, pick])) : new Map();
    
    // Function to get historical expected points for a specific GW
    const getHistoricalExpectedPoints = (player: any) => {
        if (!selectedGW || !fixtures) return 0;
        
        // Find the fixture for this player's team in the selected gameweek
        const gwFixture = fixtures.find((f: any) => 
            f.event === selectedGW && 
            (f.team_h === player.team || f.team_a === player.team)
        );
        
        if (!gwFixture) return 0;
        
        const isHome = gwFixture.team_h === player.team;
        const difficulty = isHome ? gwFixture.team_h_difficulty : gwFixture.team_a_difficulty;
        
        // Use form as base (or a default value)
        const basePoints = parseFloat(player.form) || 3;
        
        let multiplier = 1.0;
        if (difficulty <= 2) multiplier = 1.2;
        else if (difficulty === 3) multiplier = 1.0;
        else if (difficulty === 4) multiplier = 0.85;
        else if (difficulty === 5) multiplier = 0.7;
        
        if (isHome) multiplier *= 1.1;
        
        return Math.max(0, basePoints * multiplier);
    };
    
    // Function to get actual points scored in the selected gameweek
    const getHistoricalActualPoints = (playerId: number) => {
        if (!selectedGW) return null;
        
        const history = playerHistories.get(playerId);
        if (!history || !Array.isArray(history)) return null;

        // Find the gameweek entry in the player's history
        const gwEntry = history.find((h: any) => {
            const event = h.event || h.round;
            return event === selectedGW;
        });

        if (!gwEntry) return null;

        // Use total_points for the actual points scored in that gameweek
        if (gwEntry.total_points !== undefined && gwEntry.total_points !== null) {
            return Number(gwEntry.total_points);
        }
        
        // Fallback to points if total_points is not available
        if (gwEntry.points !== undefined && gwEntry.points !== null) {
            return Number(gwEntry.points);
        }

        return null;
    };

    // Get top 3 players by selected category
    const getTopPlayers = () => {
        if (!elements || !myPlayers || myPlayers.size === 0) return [];

        const myPlayersList = elements.filter((p: any) => myPlayers.has(p.id));
        
        const categorySorters: Record<string, (a: any, b: any) => number> = {
            my_points: (a, b) => {
                const statsA = playerStats.get(a.id) || { points: 0 };
                const statsB = playerStats.get(b.id) || { points: 0 };
                return statsB.points - statsA.points;
            },
            total_points: (a, b) => (b.total_points || 0) - (a.total_points || 0),
            my_goals: (a, b) => {
                const statsA = playerStats.get(a.id) || { goals: 0 };
                const statsB = playerStats.get(b.id) || { goals: 0 };
                return statsB.goals - statsA.goals;
            },
            goals_scored: (a, b) => (b.goals_scored || 0) - (a.goals_scored || 0),
            my_assists: (a, b) => {
                const statsA = playerStats.get(a.id) || { assists: 0 };
                const statsB = playerStats.get(b.id) || { assists: 0 };
                return statsB.assists - statsA.assists;
            },
            assists: (a, b) => (b.assists || 0) - (a.assists || 0),
            my_clean_sheets: (a, b) => {
                const statsA = playerStats.get(a.id) || { cleanSheets: 0 };
                const statsB = playerStats.get(b.id) || { cleanSheets: 0 };
                return statsB.cleanSheets - statsA.cleanSheets;
            },
            clean_sheets: (a, b) => (b.clean_sheets || 0) - (a.clean_sheets || 0),
            form: (a, b) => (parseFloat(b.form) || 0) - (parseFloat(a.form) || 0),
            points_per_game: (a, b) => (parseFloat(b.points_per_game) || 0) - (parseFloat(a.points_per_game) || 0),
            value: (a, b) => {
                const valueA = a.now_cost > 0 ? (a.total_points / (a.now_cost / 10)) : 0;
                const valueB = b.now_cost > 0 ? (b.total_points / (b.now_cost / 10)) : 0;
                return valueB - valueA;
            },
            ict_index: (a, b) => (parseFloat(b.ict_index) || 0) - (parseFloat(a.ict_index) || 0),
        };

        const sorter = categorySorters[topCategory] || categorySorters.my_points;
        return [...myPlayersList].sort(sorter).slice(0, 3);
    };

    const topPlayers = getTopPlayers();

    const categoryOptions = [
        { value: 'my_points', label: 'My Points', icon: Trophy },
        { value: 'total_points', label: 'Total Points', icon: Trophy },
        { value: 'my_goals', label: 'My Goals', icon: Target },
        { value: 'goals_scored', label: 'Total Goals', icon: Target },
        { value: 'my_assists', label: 'My Assists', icon: Zap },
        { value: 'assists', label: 'Total Assists', icon: Zap },
        { value: 'my_clean_sheets', label: 'My Clean Sheets', icon: Shield },
        { value: 'clean_sheets', label: 'Total Clean Sheets', icon: Shield },
        { value: 'form', label: 'Form', icon: TrendingUp },
        { value: 'points_per_game', label: 'Points Per Game', icon: Activity },
        { value: 'value', label: 'Value (Pts/£m)', icon: Award },
        { value: 'ict_index', label: 'ICT Index', icon: Star },
    ];

    const getCategoryValue = (player: any, category: string): string | number => {
        const stats = playerStats.get(player.id) || { points: 0, goals: 0, assists: 0, cleanSheets: 0, appearances: 0 };
        
        switch (category) {
            case 'my_points': return stats.points;
            case 'total_points': return player.total_points || 0;
            case 'my_goals': return stats.goals;
            case 'goals_scored': return player.goals_scored || 0;
            case 'my_assists': return stats.assists;
            case 'assists': return player.assists || 0;
            case 'my_clean_sheets': return stats.cleanSheets;
            case 'clean_sheets': return player.clean_sheets || 0;
            case 'form': return parseFloat(player.form) || 0;
            case 'points_per_game': return parseFloat(player.points_per_game) || 0;
            case 'value': return player.now_cost > 0 ? ((player.total_points / (player.now_cost / 10)).toFixed(1)) : '0.0';
            case 'ict_index': return parseFloat(player.ict_index) || 0;
            default: return 0;
        }
    };

    return (
        <>
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
                <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
                    {/* Hero Section - Match Dashboard Style */}
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-secondary/30 via-primary/20 to-background border border-primary/30 p-8">
                        <div className="relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                                    <Trophy className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                                        Season History
                                    </h1>
                                    <p className="text-muted-foreground">Click any gameweek to view details</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Season Summary */}
                    <Card className="border-primary/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Trophy className="w-5 h-5" />
                                Season Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-3 gap-4">
                                <div className="text-center p-6 bg-gradient-to-br from-primary/10 to-orange-500/10 rounded-xl border border-primary/20">
                                    <p className="text-sm text-muted-foreground mb-2">Total Points</p>
                                    <p className="text-4xl font-black">{history.current[history.current.length - 1]?.total_points}</p>
                                </div>
                                <div className="text-center p-6 bg-gradient-to-br from-blue-500/10 to-blue-700/10 rounded-xl border border-blue-500/20">
                                    <p className="text-sm text-muted-foreground mb-2">Current Rank</p>
                                    <p className="text-4xl font-black">{history.current[history.current.length - 1]?.overall_rank.toLocaleString()}</p>
                                </div>
                                <div className="text-center p-6 bg-gradient-to-br from-green-500/10 to-emerald-700/10 rounded-xl border border-green-500/20">
                                    <p className="text-sm text-muted-foreground mb-2">Team Value</p>
                                    <p className="text-4xl font-black">£{(history.current[history.current.length - 1]?.value / 10).toFixed(1)}m</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Top 3 Players Section */}
                    <Card className="border-primary/20">
                        <CardHeader>
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <CardTitle className="flex items-center gap-2">
                                    <Star className="w-5 h-5" />
                                    Top 3 Players
                                </CardTitle>
                                <select
                                    value={topCategory}
                                    onChange={(e) => setTopCategory(e.target.value)}
                                    className="px-4 py-2 bg-background border border-primary/30 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                                >
                                    {categoryOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {topPlayers.length > 0 ? (
                                <div className="grid md:grid-cols-3 gap-4">
                                    {topPlayers.map((player, index) => {
                                        const team = getTeam(player.team);
                                        const categoryValue = getCategoryValue(player, topCategory);
                                        const selectedCategory = categoryOptions.find(c => c.value === topCategory);
                                        const CategoryIcon = selectedCategory?.icon || Trophy;
                                        
                                        return (
                                            <div
                                                key={player.id}
                                                onClick={() => setSelectedPlayer(player)}
                                                className="relative group cursor-pointer bg-gradient-to-br from-card to-card/80 rounded-xl border-2 border-primary/30 p-4 hover:border-primary/60 hover:shadow-lg transition-all duration-300"
                                            >
                                                {/* Rank Badge */}
                                                <div className="absolute -top-3 -left-3 w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-xl border-3 border-white z-10">
                                                    <span className="text-sm font-black text-yellow-900">#{index + 1}</span>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    {/* Player Photo */}
                                                    <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-primary/50 bg-gradient-to-br from-white to-gray-100 flex-shrink-0">
                                                        <img
                                                            src={`https://resources.premierleague.com/premierleague/photos/players/250x250/p${player.code}.png`}
                                                            alt={player.web_name}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                const img = e.currentTarget;
                                                                img.style.display = 'none';
                                                                const span = document.createElement('span');
                                                                span.className = 'w-full h-full flex items-center justify-center text-xl font-bold text-gray-800 bg-gray-200';
                                                                span.textContent = getPlayerInitials(player.web_name);
                                                                img.parentElement!.appendChild(span);
                                                            }}
                                                        />
                                                    </div>

                                                    {/* Player Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-lg truncate">{player.web_name}</h4>
                                                        <p className="text-sm text-muted-foreground truncate">{team?.short_name} • {['', 'GKP', 'DEF', 'MID', 'FWD'][player.element_type]}</p>
                                                        
                                                        {/* Category Value */}
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <CategoryIcon className="w-4 h-4 text-primary" />
                                                            <span className="text-xl font-black text-primary">
                                                                {typeof categoryValue === 'number' 
                                                                    ? categoryValue.toFixed(categoryValue % 1 === 0 ? 0 : 1)
                                                                    : categoryValue
                                                                }
                                                                {topCategory === 'value' && ' pts/£m'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    {!allPicksLoaded ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                            <span>Loading your players...</span>
                                        </div>
                                    ) : (
                                        <span>No players found</span>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Gameweek Timeline - CLICKABLE */}
                    <Card className="border-primary/20">
                        <CardHeader>
                            <CardTitle>Gameweek Timeline</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {history.current.map((gw: any) => {
                                    const isSelected = gw.event === selectedGW;
                                    const prevGW = history.current.find((g: any) => g.event === gw.event - 1);
                                    const rankChange = prevGW ? prevGW.overall_rank - gw.overall_rank : 0;

                                    return (
                                        <button
                                            key={gw.event}
                                            onClick={() => setSelectedGW(gw.event)}
                                            className={`group relative p-4 rounded-xl border-2 transition-all duration-300 ${isSelected
                                                ? 'border-primary bg-gradient-to-br from-primary/20 to-orange-500/20 scale-105 shadow-lg shadow-primary/20'
                                                : 'border-border bg-card hover:border-primary/50 hover:scale-105 hover:shadow-md'
                                                }`}
                                        >
                                            <div className={`absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity ${isSelected ? 'opacity-100' : ''}`} />

                                            <div className="relative">
                                                <p className="text-xs text-muted-foreground mb-1 font-semibold">GW {gw.event}</p>
                                                <p className="text-2xl font-black mb-2">{gw.points}</p>
                                                <div className="flex items-center justify-center gap-1 text-xs">
                                                    {rankChange > 0 ? (
                                                        <TrendingUp className="w-3 h-3 text-green-500" />
                                                    ) : rankChange < 0 ? (
                                                        <TrendingDown className="w-3 h-3 text-red-500" />
                                                    ) : null}
                                                    <span className={rankChange > 0 ? 'text-green-500 font-semibold' : rankChange < 0 ? 'text-red-500 font-semibold' : ''}>
                                                        {gw.overall_rank.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>

                                            {isSelected && (
                                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-primary animate-in slide-in-from-top-2" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Selected GW Detail Panel - ANIMATED */}
                    {selectedGW && selectedGWData && (
                        <div className="animate-in slide-in-from-bottom-4 fade-in duration-500">
                            <Card className="border-primary/40 shadow-xl bg-gradient-to-br from-card to-card/80">
                                <CardHeader className="relative">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Badge variant="outline" className="text-lg px-4 py-1">GW {selectedGW}</Badge>
                                            <CardTitle>Gameweek Details</CardTitle>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => setSelectedGW(prev => Math.max(1, (prev || 1) - 1))}
                                                disabled={selectedGW === 1}
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => setSelectedGW(prev => Math.min(history.current.length, (prev || 1) + 1))}
                                                disabled={selectedGW === history.current.length}
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setSelectedGW(null)}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="p-4 rounded-xl bg-gradient-to-br from-primary/20 to-orange-500/20 border border-primary/30">
                                            <p className="text-xs text-muted-foreground mb-1">Points</p>
                                            <p className="text-3xl font-black">{selectedGWData.points}</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-700/20 border border-blue-500/30">
                                            <p className="text-xs text-muted-foreground mb-1">Overall Rank</p>
                                            <p className="text-2xl font-black">{selectedGWData.overall_rank.toLocaleString()}</p>
                                            {prevGWData && (
                                                <div className="flex items-center gap-1 mt-1">
                                                    {prevGWData.overall_rank - selectedGWData.overall_rank > 0 ? (
                                                        <>
                                                            <TrendingUp className="w-3 h-3 text-green-500" />
                                                            <span className="text-xs text-green-500 font-semibold">+{(prevGWData.overall_rank - selectedGWData.overall_rank).toLocaleString()}</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <TrendingDown className="w-3 h-3 text-red-500" />
                                                            <span className="text-xs text-red-500 font-semibold">{(prevGWData.overall_rank - selectedGWData.overall_rank).toLocaleString()}</span>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-700/20 border border-green-500/30">
                                            <p className="text-xs text-muted-foreground mb-1">Team Value</p>
                                            <p className="text-2xl font-black">£{(selectedGWData.value / 10).toFixed(1)}m</p>
                                            <p className="text-xs text-muted-foreground mt-1">Bank: £{(selectedGWData.bank / 10).toFixed(1)}m</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-700/20 border border-orange-500/30">
                                            <p className="text-xs text-muted-foreground mb-1">Transfers</p>
                                            <p className="text-3xl font-black">{selectedGWData.event_transfers}</p>
                                            <p className="text-xs text-muted-foreground mt-1">Cost: {selectedGWData.event_transfers_cost} pts</p>
                                        </div>
                                    </div>

                                    {/* Team Lineup */}
                                    {picksData?.picks && (
                                        <div className="space-y-6">
                                            {/* Starting XI - Pitch View */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Trophy className="w-5 h-5 text-primary" />
                                                    <h3 className="text-lg font-bold">Starting XI</h3>
                                                </div>
                                                <InsightsPitchView
                                                    players={picksData.picks
                                                        .filter((p: any) => p.position <= 11)
                                                        .sort((a: any, b: any) => a.position - b.position)
                                                        .map((pick: any) => getPlayer(pick.element))
                                                        .filter((p: any) => p)}
                                                    teams={teams || []}
                                                    fixtures={fixtures || []}
                                                    currentEvent={selectedGW || currentEvent?.id || 1}
                                                    onPlayerClick={(player) => setSelectedPlayer(player)}
                                                    showRanks={false}
                                                    picksMap={picksMap}
                                                    isHistoryView={true}
                                                    getHistoricalExpectedPoints={getHistoricalExpectedPoints}
                                                    getHistoricalActualPoints={getHistoricalActualPoints}
                                                />
                                            </div>

                                            {/* Substitutes Bench with Stadium Design */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Users className="w-5 h-5 text-muted-foreground" />
                                                    <h3 className="text-lg font-bold">Substitutes</h3>
                                                </div>
                                                <div className="relative overflow-hidden rounded-2xl border-2 border-orange-500/40 shadow-xl">
                                                    {/* Stadium Bench Background */}
                                                    <div className="relative bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 p-4">
                                                        {/* Stadium Back Wall / Roof Shadow */}
                                                        <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-slate-900/80 via-slate-800/60 to-transparent"></div>

                                                        {/* Bench Backrest Support */}
                                                        <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-slate-900/90 to-slate-800/70">
                                                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-slate-600/50 to-transparent"></div>
                                                        </div>

                                                        {/* Bench Seating Area */}
                                                        <div className="relative mt-8 mb-2" style={{ minHeight: '120px' }}>
                                                            <div className="absolute inset-0 bg-gradient-to-br from-amber-800/90 via-amber-700/85 to-amber-900/90 rounded-lg shadow-inner"></div>
                                                            <div className="absolute inset-0 flex flex-col gap-0.5 p-1">
                                                                {Array.from({ length: 5 }).map((_, i) => (
                                                                    <div
                                                                        key={i}
                                                                        className="flex-1 bg-gradient-to-r from-amber-700/80 via-amber-600/90 to-amber-700/80 rounded-sm shadow-sm border-t border-amber-500/30 border-b border-amber-900/40"
                                                                        style={{
                                                                            backgroundImage: `
                                                                                repeating-linear-gradient(
                                                                                    90deg,
                                                                                    rgba(180, 83, 9, 0.4) 0px,
                                                                                    rgba(180, 83, 9, 0.4) 1px,
                                                                                    rgba(154, 52, 18, 0.3) 1px,
                                                                                    rgba(154, 52, 18, 0.3) 3px
                                                                                )
                                                                            `,
                                                                            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3), inset 0 -1px 1px rgba(255,255,255,0.1)'
                                                                        }}
                                                                    ></div>
                                                                ))}
                                                            </div>
                                                            <div className="absolute inset-0" style={{
                                                                backgroundImage: `
                                                                    repeating-linear-gradient(
                                                                        0deg,
                                                                        transparent 0px,
                                                                        transparent 23px,
                                                                        rgba(0, 0, 0, 0.2) 23px,
                                                                        rgba(0, 0, 0, 0.2) 24px,
                                                                        transparent 24px,
                                                                        transparent 47px
                                                                    )
                                                                `,
                                                                backgroundSize: '100% 47px'
                                                            }}></div>
                                                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500/40 via-amber-400/50 to-amber-500/40"></div>
                                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-t from-black/40 to-transparent rounded-b-lg"></div>
                                                        </div>

                                                        {/* Floor/Base Platform */}
                                                        <div className="relative h-2 bg-gradient-to-b from-slate-700/80 to-slate-800/90 rounded-b-lg shadow-inner">
                                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-600/20 to-transparent"></div>
                                                            <div className="absolute -top-1 left-0 right-0 h-1 bg-gradient-to-b from-slate-900/60 to-transparent"></div>
                                                        </div>

                                                        {/* Ambient Lighting */}
                                                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 pointer-events-none"></div>
                                                        <div className="absolute top-8 left-0 right-0 h-24 bg-gradient-to-b from-orange-500/5 to-transparent pointer-events-none"></div>

                                                        {/* Players Cards Grid - Elevated on Bench */}
                                                        <div className="relative z-20 -mt-6 mb-2">
                                                            <div className="bg-gradient-to-b from-transparent via-amber-800/5 to-transparent rounded-lg p-1">
                                                                <InsightsPitchView
                                                                    players={picksData.picks
                                                                        .filter((p: any) => p.position > 11)
                                                                        .sort((a: any, b: any) => a.position - b.position)
                                                                        .map((pick: any) => getPlayer(pick.element))
                                                                        .filter((p: any) => p)}
                                                                    teams={teams || []}
                                                                    fixtures={fixtures || []}
                                                                    currentEvent={selectedGW || currentEvent?.id || 1}
                                                                    onPlayerClick={(player) => setSelectedPlayer(player)}
                                                                    showRanks={false}
                                                                    compactLayout={true}
                                                                    picksMap={picksMap}
                                                                    isHistoryView={true}
                                                                    getHistoricalExpectedPoints={getHistoricalExpectedPoints}
                                                                    getHistoricalActualPoints={getHistoricalActualPoints}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Additional Stats */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t">
                                                <div className="text-center p-3 bg-secondary/50 rounded-lg">
                                                    <p className="text-xs text-muted-foreground mb-1">Bench Points</p>
                                                    <p className="text-2xl font-bold">{selectedGWData.points_on_bench}</p>
                                                </div>
                                                <div className="text-center p-3 bg-secondary/50 rounded-lg">
                                                    <p className="text-xs text-muted-foreground mb-1">GW Rank</p>
                                                    <p className="text-2xl font-bold">{selectedGWData.rank?.toLocaleString() || 'N/A'}</p>
                                                </div>
                                                <div className="text-center p-3 bg-secondary/50 rounded-lg">
                                                    <p className="text-xs text-muted-foreground mb-1">Total Points</p>
                                                    <p className="text-2xl font-bold">{selectedGWData.total_points}</p>
                                                </div>
                                                <div className="text-center p-3 bg-secondary/50 rounded-lg">
                                                    <p className="text-xs text-muted-foreground mb-1">Chip Used</p>
                                                    <p className="text-lg font-bold">{picksData.active_chip || 'None'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Player Detail Modal */}
            {selectedPlayer && (
                <PlayerDetailModal
                    player={selectedPlayer}
                    team={selectedPlayer ? teams?.find((t: any) => t.id === selectedPlayer.team) : null}
                    teams={teams || []}
                    fixtures={fixtures || []}
                    currentEvent={selectedGW || currentEvent?.id || 1}
                    onClose={() => setSelectedPlayer(null)}
                />
            )}
            
            <BottomNav />
        </>
    );
}
