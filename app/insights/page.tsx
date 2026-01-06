'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    TrendingUp,
    TrendingDown,
    Target,
    Zap,
    Users,
    Star,
    Award,
    Sparkles,
    Brain,
    Shield,
    Trophy,
    X,
    ArrowRight,
    LineChart,
    Percent,
    Globe,
    ChevronDown,
    Gamepad2,
    RotateCcw,
    Save,
    Plus,
    Swords
} from "lucide-react";
import { useFPLData } from "@/lib/hooks/use-fpl-data";
import { EnhancedPlayerCard } from "@/components/insights/enhanced-player-card";
import { PlayerDetailModal } from "@/components/insights/player-detail-modal";
import { InsightsPitchView } from "@/components/insights/insights-pitch-view";
import { UpgradeSplitCard } from "@/components/insights/upgrade-split-card";
import { CardWars } from "@/components/insights/card-wars";

function getPlayerPhotoUrl(player: any): string[] {
    return [
        `https://resources.premierleague.com/premierleague/photos/players/250x250/p${player.code}.png`,
        `https://resources.premierleague.com/premierleague/photos/players/250x250/p${player.photo}.png`,
    ];
}

export default function InsightsPage() {
    const router = useRouter();
    const [sessionData, setSessionData] = useState<{ entryId: number } | null>(null);
    const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
    const [upgradeSource, setUpgradeSource] = useState<string>('gw_points');
    const [playgroundTeam, setPlaygroundTeam] = useState<any[]>([]);
    const [playgroundGW, setPlaygroundGW] = useState<number | null>(null);
    const [battleMode, setBattleMode] = useState<boolean>(false);
    const [alternateTeam, setAlternateTeam] = useState<any[]>([]);

    // Retry helper with exponential backoff
    const fetchWithRetry = async (url: string, options: RequestInit = {}, maxRetries = 3): Promise<Response> => {
        for (let i = 0; i < maxRetries; i++) {
            try {
                const res = await fetch(url, options);
                if (res.ok || i === maxRetries - 1) {
                    return res;
                }
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
            } catch (error) {
                if (i === maxRetries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
            }
        }
        throw new Error('Max retries exceeded');
    };

    useEffect(() => {
        let mounted = true;

        const loadSession = async () => {
            try {
                // First check if we have a valid session via cookies
                const res = await fetchWithRetry('/api/session');
                if (!res.ok) {
                    // Only redirect if it's a 401 (unauthorized) - means no valid session
                    if (res.status === 401) {
                        router.push('/login');
                        return;
                    }
                    // For other errors, don't redirect - just log
                    console.warn('[InsightsPage] Session check failed:', res.status);
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
                console.error('[InsightsPage] Error loading session:', err);
                // Don't auto-redirect on errors - let user stay on page
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
    const getTeam = (teamId: number) => teams.find((t: any) => t.id === teamId);
    
    // Initialize playground team with current squad (15 players)
    useEffect(() => {
        if (picks?.picks && playgroundTeam.length === 0 && !playgroundGW && currentEvent?.id) {
            setPlaygroundTeam([...picks.picks]);
            setPlaygroundGW(currentEvent.id);
        }
    }, [picks?.picks, currentEvent?.id, playgroundGW]);

    // Memoized best performers by team (after teams and elements are defined)
    const bestPerformersByTeam = useMemo(() => {
        if (!elements || !teams || elements.length === 0 || teams.length === 0) return [];
        return teams
            .map((team: any) => {
                const teamPlayers = elements.filter((p: any) => p.team === team.id);
                const bestPlayer = teamPlayers.sort((a: any, b: any) => b.event_points - a.event_points)[0];
                return bestPlayer;
            })
            .filter((player: any) => player && player.event_points > 0)
            .sort((a: any, b: any) => b.event_points - a.event_points);
    }, [teams, elements]);

    // Memoized differential players (must be before early return)
    const differentialPlayers = useMemo(() => {
        if (!elements || elements.length === 0) return [];
        const differentials = elements
            .filter((p: any) => parseFloat(p.selected_by_percent) < 10 && parseFloat(p.form) > 4)
            .sort((a: any, b: any) => parseFloat(b.form) - parseFloat(a.form));
        
        // Select with team diversity
        const selected: any[] = [];
        const usedTeams = new Set<number>();
        
        // Goalkeeper (1)
        const gks = differentials.filter((p: any) => p.element_type === 1);
        if (gks.length > 0) {
            const bestGK = gks[0];
            selected.push(bestGK);
            usedTeams.add(bestGK.team);
        }
        
        // Defenders (5) - prioritize different teams
        const defs = differentials.filter((p: any) => p.element_type === 2);
        let defCount = 0;
        for (const def of defs) {
            if (defCount >= 5) break;
            if (defCount < 3 || !usedTeams.has(def.team)) {
                selected.push(def);
                usedTeams.add(def.team);
                defCount++;
            }
        }
        
        // Midfielders (5) - prioritize different teams
        const mids = differentials.filter((p: any) => p.element_type === 3);
        let midCount = 0;
        for (const mid of mids) {
            if (midCount >= 5) break;
            if (midCount < 3 || !usedTeams.has(mid.team)) {
                selected.push(mid);
                usedTeams.add(mid.team);
                midCount++;
            }
        }
        
        // Forwards (3) - prioritize different teams
        const fwds = differentials.filter((p: any) => p.element_type === 4);
        let fwdCount = 0;
        for (const fwd of fwds) {
            if (fwdCount >= 3) break;
            if (fwdCount < 2 || !usedTeams.has(fwd.team)) {
                selected.push(fwd);
                usedTeams.add(fwd.team);
                fwdCount++;
            }
        }
        
        return selected;
    }, [elements]);

    // Memoized multi-source players (must be before early return)
    const multiSourcePlayers = useMemo(() => {
        if (!elements || elements.length === 0) return [];
        const valuePicks = elements
            .filter((p: any) => p.minutes > 500)
            .sort((a: any, b: any) => (b.total_points / (b.now_cost / 10)) - (a.total_points / (a.now_cost / 10)))
            .slice(0, 7);
        
        const hotStreaks = elements
            .filter((p: any) => parseFloat(p.form) > 0)
            .sort((a: any, b: any) => parseFloat(b.form) - parseFloat(a.form))
            .slice(0, 7);
        
        const combined = [...valuePicks];
        hotStreaks.forEach((p: any) => {
            if (!combined.find((cp: any) => cp.id === p.id)) {
                combined.push(p);
            }
        });
        
        // Select with team diversity
        const selected: any[] = [];
        const usedTeams = new Set<number>();
        
        // Goalkeeper (1)
        const gks = combined.filter((p: any) => p.element_type === 1);
        if (gks.length > 0) {
            const bestGK = gks[0];
            selected.push(bestGK);
            usedTeams.add(bestGK.team);
        }
        
        // Defenders (5) - prioritize different teams
        const defs = combined.filter((p: any) => p.element_type === 2);
        let defCount = 0;
        for (const def of defs) {
            if (defCount >= 5) break;
            if (defCount < 3 || !usedTeams.has(def.team)) {
                selected.push(def);
                usedTeams.add(def.team);
                defCount++;
            }
        }
        
        // Midfielders (5) - prioritize different teams
        const mids = combined.filter((p: any) => p.element_type === 3);
        let midCount = 0;
        for (const mid of mids) {
            if (midCount >= 5) break;
            if (midCount < 3 || !usedTeams.has(mid.team)) {
                selected.push(mid);
                usedTeams.add(mid.team);
                midCount++;
            }
        }
        
        // Forwards (3) - prioritize different teams
        const fwds = combined.filter((p: any) => p.element_type === 4);
        let fwdCount = 0;
        for (const fwd of fwds) {
            if (fwdCount >= 3) break;
            if (fwdCount < 2 || !usedTeams.has(fwd.team)) {
                selected.push(fwd);
                usedTeams.add(fwd.team);
                fwdCount++;
            }
        }
        
        return selected;
    }, [elements]);

    // Get top 15 players overall (sorted by form + expected points + total points) - must be before early return
    const top15Players = useMemo(() => {
        if (!elements || elements.length === 0) return [];
        return elements
            .map((p: any) => ({
                ...p,
                score: parseFloat(p.form) * 2 + (parseFloat(p.ep_next) || 0) + (p.total_points / 10)
            }))
            .sort((a: any, b: any) => b.score - a.score)
            .slice(0, 15);
    }, [elements]);

    if (!sessionData || baseLoading || !bootstrap || !history) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Get current team picks
    const myTeamPicks = picks?.picks || [];
    
    const getPlayer = (elementId: number) => elements.find((p: any) => p.id === elementId);

    // Function to build best alternate team within budget
    const buildBestAlternateTeam = (budget: number) => {
        if (!elements || elements.length === 0) return [];

        // Calculate player scores (form + expected points + total points value)
        const scoredPlayers = elements
            .filter((p: any) => p.status === 'a') // Only available players
            .map((p: any) => ({
                ...p,
                score: parseFloat(p.form) * 2 + (parseFloat(p.ep_next) || 0) + (p.total_points / 15)
            }))
            .sort((a: any, b: any) => b.score - a.score);

        // Position requirements: 2 GKP, 5 DEF, 5 MID, 3 FWD (15 total)
        const positionCounts = { 1: 2, 2: 5, 3: 5, 4: 3 };
        const selected: any[] = [];
        let remainingBudget = budget * 10; // Convert to tenths

        // First pass: Select best players by position within budget
        [1, 2, 3, 4].forEach((position) => {
            const count = positionCounts[position as keyof typeof positionCounts];
            const candidates = scoredPlayers
                .filter((p: any) => p.element_type === position)
                .filter((p: any) => !selected.find(s => s.id === p.id));

            let selectedForPosition = 0;
            for (const player of candidates) {
                if (selectedForPosition < count && player.now_cost <= remainingBudget) {
                    selected.push(player);
                    remainingBudget -= player.now_cost;
                    selectedForPosition++;
                }
            }
        });

        // Convert to picks format
        return selected.map((player: any, index: number) => ({
            element: player.id,
            position: index + 1,
            is_captain: index === 0,
            is_vice_captain: index === 1
        }));
    };

    // Position-specific recommendations
    const getTopByPosition = (position: number, count: number) => {
        return elements
            .filter((p: any) => p.element_type === position)
            .sort((a: any, b: any) => {
                const aScore = parseFloat(a.form) * 2 + (parseFloat(a.ep_next) || 0) + (a.total_points / 10);
                const bScore = parseFloat(b.form) * 2 + (parseFloat(b.ep_next) || 0) + (b.total_points / 10);
                return bScore - aScore;
            })
            .slice(0, count);
    };

    // Function to find upgrade suggestion for a player based on upgradeSource
    // Now includes usedUpgradeIds to ensure unique recommendations
    const findUpgradeSuggestion = (currentPlayer: any, myTeamPlayerIds: Set<number>, usedUpgradeIds: Set<number>) => {
        if (!currentPlayer || !elements || elements.length === 0) return null;

        // Get current player's value for the selected metric
        const getPlayerMetricValue = (player: any) => {
            switch (upgradeSource) {
                case 'gw_points': return player.event_points || 0;
                case 'total_points': return player.total_points || 0;
                case 'points_per_game': return parseFloat(player.points_per_game) || 0;
                case 'form': return parseFloat(player.form) || 0;
                case 'expected': return parseFloat(player.ep_next) || 0;
                case 'value': return player.now_cost > 0 ? (player.total_points / (player.now_cost / 10)) : 0;
                case 'ict': return parseFloat(player.ict_index) || 0;
                case 'influence': return parseFloat(player.influence) || 0;
                case 'creativity': return parseFloat(player.creativity) || 0;
                case 'threat': return parseFloat(player.threat) || 0;
                case 'goals': return player.goals_scored || 0;
                case 'assists': return player.assists || 0;
                case 'bonus': return player.bonus || 0;
                case 'clean_sheets': return player.clean_sheets || 0;
                case 'saves': return player.saves || 0;
                default: return parseFloat(player.form) || 0;
            }
        };

        const currentPlayerValue = getPlayerMetricValue(currentPlayer);

        // Get all players of the same position, not in team, available, not already used, and better than current
        const candidates = elements
            .filter((p: any) => p.element_type === currentPlayer.element_type)
            .filter((p: any) => p.status === 'a')
            .filter((p: any) => !myTeamPlayerIds.has(p.id))
            .filter((p: any) => !usedUpgradeIds.has(p.id))
            .filter((p: any) => p.id !== currentPlayer.id)
            .filter((p: any) => getPlayerMetricValue(p) > currentPlayerValue); // Only suggest upgrades (better players)

        if (candidates.length === 0) return null;

        // Sort based on upgradeSource
        const sortedCandidates = [...candidates].sort((a: any, b: any) => {
            const aValue = getPlayerMetricValue(a);
            const bValue = getPlayerMetricValue(b);
            return bValue - aValue; // Sort descending (best first)
        });

        // Return the top candidate that's an actual upgrade
        return sortedCandidates[0] || null;
    };


    const topGK = getTopByPosition(1, 2);
    const topDEF = getTopByPosition(2, 5);
    const topMID = getTopByPosition(3, 5);
    const topFWD = getTopByPosition(4, 3);

    // AI Commentary Generator
    const getAICommentary = (player: any, position: string) => {
        const form = parseFloat(player.form);
        const ownership = parseFloat(player.selected_by_percent);
        const price = player.now_cost / 10;

        let commentary = "";

        if (form > 6) {
            commentary = `🔥 <strong>Hot form</strong> with ${form.toFixed(1)} avg points/game. `;
        } else if (form > 4) {
            commentary = `📈 <strong>Solid performer</strong> averaging ${form.toFixed(1)} points. `;
        }

        if (ownership < 10) {
            commentary += `🎯 <strong>Differential pick</strong> at ${ownership.toFixed(1)}% ownership - could gain you rank points. `;
        } else if (ownership > 30) {
            commentary += `⚠️ <strong>Highly owned</strong> (${ownership.toFixed(1)}%) - essential to avoid rank drops. `;
        }

        if (price < 6) {
            commentary += `💰 <strong>Budget friendly</strong> at £${price.toFixed(1)}m. `;
        } else if (price > 10) {
            commentary += `💎 <strong>Premium option</strong> at £${price.toFixed(1)}m - worth the investment. `;
        }

        const epNext = parseFloat(player.ep_next || 0);
        if (epNext > 0) {
            commentary += `📊 Expected ${epNext.toFixed(1)} pts next GW.`;
        }

        return commentary || `Consistent ${position} option with ${player.total_points} total points.`;
    };

    const PlayerRecommendationCard = ({ player, position, rank }: { player: any, position: string, rank: number }) => {
        const team = getTeam(player.team);
        const photoUrls = getPlayerPhotoUrl(player);

        return (
            <button
                onClick={() => setSelectedPlayer({ ...player, position, rank })}
                className="relative group bg-gradient-to-br from-card to-card/50 rounded-xl p-4 border border-primary/20 hover:border-primary/40 transition-all hover:scale-105 text-left w-full"
            >
                <div className="absolute top-2 left-2 z-10">
                    <Badge variant="outline" className="bg-primary/10">
                        #{rank}
                    </Badge>
                </div>

                <div className="flex items-start gap-3 mb-3">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-orange-500/10 flex-shrink-0">
                        <img
                            src={photoUrls[0]}
                            alt={player.web_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                const img = e.currentTarget;
                                if (photoUrls[1] && img.src !== photoUrls[1]) {
                                    img.src = photoUrls[1];
                                } else {
                                    img.style.display = 'none';
                                    const div = document.createElement('div');
                                    div.className = 'w-full h-full flex items-center justify-center text-2xl font-bold text-primary';
                                    div.textContent = player.web_name[0];
                                    img.parentElement!.appendChild(div);
                                }
                            }}
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-lg truncate">{player.web_name}</p>
                        <p className="text-sm text-muted-foreground">{team?.name}</p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                    <div className="text-center p-2 bg-primary/10 rounded">
                        <p className="text-muted-foreground">Form</p>
                        <p className="font-bold text-primary">{parseFloat(player.form).toFixed(1)}</p>
                    </div>
                    <div className="text-center p-2 bg-green-500/10 rounded">
                        <p className="text-muted-foreground">Points</p>
                        <p className="font-bold text-green-600">{player.total_points}</p>
                    </div>
                    <div className="text-center p-2 bg-orange-500/10 rounded">
                        <p className="text-muted-foreground">Price</p>
                        <p className="font-bold text-orange-600">£{(player.now_cost / 10).toFixed(1)}m</p>
                    </div>
                </div>

                <div className="text-xs text-muted-foreground" dangerouslySetInnerHTML={{ __html: getAICommentary(player, position).substring(0, 100) + '...' }} />

                <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{parseFloat(player.selected_by_percent).toFixed(1)}% owned</span>
                    <span className="text-primary font-semibold flex items-center gap-1">
                        View Details <ArrowRight className="w-3 h-3" />
                    </span>
                </div>
            </button>
        );
    };

    return (
        <div className="min-h-screen bg-background pb-32 pt-16">
            <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5 md:space-y-6">
                {/* Hero Section - Match Dashboard Style */}
                <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-card border border-border p-4 md:p-8">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                                <Brain className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-foreground">
                                    AI Insights
                                </h1>
                                <p className="text-xs md:text-sm text-muted-foreground">Smart recommendations from multiple sources</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="squad" className="w-full">
                    <TabsList className="grid w-full grid-cols-5 h-auto bg-card/50 backdrop-blur-sm p-0.5 md:p-1 gap-0.5 md:gap-1">
                        <TabsTrigger value="squad" className="flex items-center gap-1 md:gap-2 py-2 md:py-3 text-xs md:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            <Brain className="w-3 h-3 md:w-4 md:h-4" />
                            <span className="hidden sm:inline">Squad Builder</span>
                            <span className="sm:hidden">Squad</span>
                        </TabsTrigger>
                        <TabsTrigger value="upgrades" className="flex items-center gap-1 md:gap-2 py-2 md:py-3 text-xs md:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            <LineChart className="w-3 h-3 md:w-4 md:h-4" />
                            <span className="hidden sm:inline">GW Upgrades</span>
                            <span className="sm:hidden">Upgrades</span>
                        </TabsTrigger>
                        <TabsTrigger value="differentials" className="flex items-center gap-1 md:gap-2 py-2 md:py-3 text-xs md:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            <Percent className="w-3 h-3 md:w-4 md:h-4" />
                            <span className="hidden sm:inline">Differentials</span>
                            <span className="sm:hidden">Diff</span>
                        </TabsTrigger>
                        <TabsTrigger value="multi" className="flex items-center gap-1 md:gap-2 py-2 md:py-3 text-xs md:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            <Globe className="w-3 h-3 md:w-4 md:h-4" />
                            <span className="hidden sm:inline">Multi-Source</span>
                            <span className="sm:hidden">Multi</span>
                        </TabsTrigger>
                        <TabsTrigger value="playground" className="flex items-center gap-1 md:gap-2 py-2 md:py-3 text-xs md:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            <Gamepad2 className="w-3 h-3 md:w-4 md:h-4" />
                            <span className="hidden sm:inline">Team Playground</span>
                            <span className="sm:hidden">Play</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Squad Builder Tab */}
                    <TabsContent value="squad" className="space-y-6 mt-6">
                        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Brain className="w-5 h-5 text-primary" />
                                    Top 15 Recommended Players
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">Best players by form, expected points, and total points - ranked</p>
                            </CardHeader>
                            <CardContent>
                                <InsightsPitchView
                                    players={top15Players}
                                                teams={teams || []}
                                                fixtures={fixtures || []}
                                                currentEvent={currentEvent?.id || 1}
                                    onPlayerClick={(player) => setSelectedPlayer(player)}
                                    showRanks={true}
                                    compactLayout={true}
                                            />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* GW Upgrades Tab */}
                    <TabsContent value="upgrades" className="space-y-6 mt-6">
                        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <LineChart className="w-5 h-5 text-primary" />
                                    Top GW Performers by Position
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">Top performers from the last gameweek displayed on pitch</p>
                            </CardHeader>
                            <CardContent>
                                <InsightsPitchView
                                    players={[
                                        ...elements.filter((p: any) => p.element_type === 1).sort((a: any, b: any) => b.event_points - a.event_points).slice(0, 1),
                                        ...elements.filter((p: any) => p.element_type === 2).sort((a: any, b: any) => b.event_points - a.event_points).slice(0, 5),
                                        ...elements.filter((p: any) => p.element_type === 3).sort((a: any, b: any) => b.event_points - a.event_points).slice(0, 5),
                                        ...elements.filter((p: any) => p.element_type === 4).sort((a: any, b: any) => b.event_points - a.event_points).slice(0, 3)
                                    ]}
                                                teams={teams || []}
                                                fixtures={fixtures || []}
                                                currentEvent={currentEvent?.id || 1}
                                    onPlayerClick={(player) => setSelectedPlayer(player)}
                                            />
                            </CardContent>
                        </Card>
                        <Card className="border-primary/30 bg-gradient-to-br from-secondary/10 to-accent/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-secondary" />
                                    Upgrade Recommendations
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">Suggested upgrades for your current team</p>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* My Team Upgrades */}
                                {myTeamPicks.length > 0 && (
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <Trophy className="w-5 h-5 text-secondary" />
                                                <h3 className="text-lg font-semibold">My Team - Upgrades</h3>
                                            </div>

                                            {/* Upgrade Source Selector */}
                                            <div className="relative">
                                                <select
                                                    value={upgradeSource}
                                                    onChange={(e) => setUpgradeSource(e.target.value)}
                                                    className="appearance-none bg-card border border-primary/30 rounded-lg px-4 py-2 pr-10 text-sm font-medium cursor-pointer hover:border-primary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                >
                                                    <optgroup label="Performance">
                                                        <option value="gw_points">Last GW Points</option>
                                                        <option value="total_points">Total Points (Season)</option>
                                                        <option value="points_per_game">Points per Game</option>
                                                        <option value="form">Form (Average)</option>
                                                        <option value="expected">Expected Points (Next)</option>
                                                    </optgroup>
                                                    <optgroup label="Value & Metrics">
                                                        <option value="value">Value (Pts/£m)</option>
                                                        <option value="ict">ICT Index</option>
                                                        <option value="influence">Influence</option>
                                                        <option value="creativity">Creativity</option>
                                                        <option value="threat">Threat</option>
                                                    </optgroup>
                                                    <optgroup label="Attacking">
                                                        <option value="goals">Goals Scored</option>
                                                        <option value="assists">Assists</option>
                                                        <option value="bonus">Bonus Points</option>
                                                    </optgroup>
                                                    <optgroup label="Defensive">
                                                        <option value="clean_sheets">Clean Sheets</option>
                                                        <option value="saves">Saves (GK)</option>
                                                    </optgroup>
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground" />
                                            </div>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Upgrades by: {
                                                upgradeSource === 'gw_points' ? 'Last Gameweek Points' :
                                                    upgradeSource === 'total_points' ? 'Season Total Points' :
                                                        upgradeSource === 'points_per_game' ? 'Average Points per Game' :
                                                            upgradeSource === 'form' ? 'Recent Form Average' :
                                                                upgradeSource === 'expected' ? 'Expected Points (Next GW)' :
                                                                    upgradeSource === 'value' ? 'Points per Million Value' :
                                                                        upgradeSource === 'ict' ? 'ICT Index (Influence, Creativity, Threat)' :
                                                                            upgradeSource === 'influence' ? 'Influence Rating' :
                                                                                upgradeSource === 'creativity' ? 'Creativity Rating' :
                                                                                    upgradeSource === 'threat' ? 'Threat Rating' :
                                                                                        upgradeSource === 'goals' ? 'Goals Scored' :
                                                                                            upgradeSource === 'assists' ? 'Assists Provided' :
                                                                                                upgradeSource === 'bonus' ? 'Bonus Points' :
                                                                                                    upgradeSource === 'clean_sheets' ? 'Clean Sheets' :
                                                                                                        'Saves Made (Goalkeepers)'
                                            } · Each player gets alternating suggestions
                                        </p>

                                        {/* Display upgrade recommendations with split cards */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                                            {(() => {
                                                const myTeamPlayerIds = new Set<number>(myTeamPicks.map((p: any) => p.element as number));
                                                const usedUpgradeIds = new Set<number>();
                                                
                                                return myTeamPicks
                                                    .filter((pick: any) => pick.position <= 11) // Only starting 11
                                                    .sort((a: any, b: any) => a.position - b.position)
                                                    .map((pick: any) => {
                                                        const currentPlayer = elements.find((e: any) => e.id === pick.element);
                                                        if (!currentPlayer) return null;

                                                        // Find unique upgrade suggestion (not already used for another player)
                                                        const upgradePlayer = findUpgradeSuggestion(currentPlayer, myTeamPlayerIds, usedUpgradeIds);
                                                        
                                                        if (!upgradePlayer) return null;
                                                        
                                                        // Mark this upgrade player as used
                                                        usedUpgradeIds.add(upgradePlayer.id);

                                                        const currentTeam = getTeam(currentPlayer.team);
                                                        const upgradeTeam = getTeam(upgradePlayer.team);

                                                            return (
                                                            <UpgradeSplitCard
                                                                key={`${currentPlayer.id}-${upgradePlayer.id}`}
                                                                currentPlayer={currentPlayer}
                                                                upgradePlayer={upgradePlayer}
                                                                currentTeam={currentTeam}
                                                                upgradeTeam={upgradeTeam}
                                                                teams={teams}
                                                                fixtures={fixtures || []}
                                                                currentEvent={currentEvent?.id || 1}
                                                                upgradeSource={upgradeSource}
                                                                onPlayerClick={(player) => setSelectedPlayer(player)}
                                                            />
                                                        );
                                                    })
                                                    .filter(Boolean);
                                            })()}
                                                                            </div>
                                    </div>
                                )}

                                {myTeamPicks.length > 0 && <div className="border-t border-primary/10 my-6"></div>}

                                {/* All Team Suggestions */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                        <Users className="w-5 h-5 text-primary" />
                                        All Team Suggestions
                                    </h3>
                                    <p className="text-sm text-muted-foreground mb-4">Top performers from all teams - click to view details</p>
                                    <InsightsPitchView
                                        players={(() => {
                                            // Get available players (not in user's team)
                                            const availablePlayers = elements.filter((p: any) => !myTeamPicks.some((pick: any) => pick.element === p.id));
                                            
                                            // Select top players by position with team diversity
                                            // Sort by a combination of form, total points, and expected points
                                            const getPlayerScore = (p: any) => {
                                                const form = parseFloat(p.form) || 0;
                                                const totalPoints = p.total_points || 0;
                                                const expectedPoints = parseFloat(p.ep_next) || 0;
                                                return (form * 2) + (totalPoints * 0.1) + (expectedPoints * 1.5);
                                            };
                                            
                                            // Get top players by position, ensuring team diversity
                                            const selectedPlayers: any[] = [];
                                            const usedTeams = new Set<number>();
                                            
                                            // Goalkeeper (1)
                                            const gks = availablePlayers
                                                .filter((p: any) => p.element_type === 1)
                                                .sort((a: any, b: any) => getPlayerScore(b) - getPlayerScore(a));
                                            if (gks.length > 0) {
                                                // Prefer players from different teams
                                                const bestGK = gks.find((p: any) => !usedTeams.has(p.team)) || gks[0];
                                                selectedPlayers.push(bestGK);
                                                usedTeams.add(bestGK.team);
                                            }
                                            
                                            // Defenders (5) - prioritize different teams
                                            const defs = availablePlayers
                                                .filter((p: any) => p.element_type === 2)
                                                .sort((a: any, b: any) => getPlayerScore(b) - getPlayerScore(a));
                                            let defCount = 0;
                                            for (const def of defs) {
                                                if (defCount >= 5) break;
                                                // Prefer different teams, but allow same team if needed
                                                if (defCount < 3 || !usedTeams.has(def.team) || usedTeams.size >= 15) {
                                                    selectedPlayers.push(def);
                                                    usedTeams.add(def.team);
                                                    defCount++;
                                                }
                                            }
                                            
                                            // Midfielders (5) - prioritize different teams
                                            const mids = availablePlayers
                                                .filter((p: any) => p.element_type === 3)
                                                .sort((a: any, b: any) => getPlayerScore(b) - getPlayerScore(a));
                                            let midCount = 0;
                                            for (const mid of mids) {
                                                if (midCount >= 5) break;
                                                if (midCount < 3 || !usedTeams.has(mid.team) || usedTeams.size >= 15) {
                                                    selectedPlayers.push(mid);
                                                    usedTeams.add(mid.team);
                                                    midCount++;
                                                }
                                            }
                                            
                                            // Forwards (3) - prioritize different teams
                                            const fwds = availablePlayers
                                                .filter((p: any) => p.element_type === 4)
                                                .sort((a: any, b: any) => getPlayerScore(b) - getPlayerScore(a));
                                            let fwdCount = 0;
                                            for (const fwd of fwds) {
                                                if (fwdCount >= 3) break;
                                                if (fwdCount < 2 || !usedTeams.has(fwd.team) || usedTeams.size >= 15) {
                                                    selectedPlayers.push(fwd);
                                                    usedTeams.add(fwd.team);
                                                    fwdCount++;
                                                }
                                            }
                                            
                                            return selectedPlayers;
                                        })()}
                                        teams={teams || []}
                                        fixtures={fixtures || []}
                                        currentEvent={currentEvent?.id || 1}
                                        onPlayerClick={(player) => setSelectedPlayer(player)}
                                        showRanks={false}
                                    />
                                </div>

                                <div className="border-t border-primary/10 my-6"></div>

                                {/* Top GW Performers by Position */}
                                {[
                                    { position: 1, name: 'Goalkeepers', icon: Shield, color: 'yellow', data: elements.filter((p: any) => p.element_type === 1).sort((a: any, b: any) => b.event_points - a.event_points).slice(0, 3) },
                                    { position: 2, name: 'Defenders', icon: Shield, color: 'blue', data: elements.filter((p: any) => p.element_type === 2).sort((a: any, b: any) => b.event_points - a.event_points).slice(0, 5) },
                                    { position: 3, name: 'Midfielders', icon: Target, color: 'green', data: elements.filter((p: any) => p.element_type === 3).sort((a: any, b: any) => b.event_points - a.event_points).slice(0, 5) },
                                    { position: 4, name: 'Forwards', icon: Zap, color: 'red', data: elements.filter((p: any) => p.element_type === 4).sort((a: any, b: any) => b.event_points - a.event_points).slice(0, 3) }
                                ].map((posGroup) => (
                                    <div key={posGroup.position}>
                                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                            <posGroup.icon className={`w-5 h-5 text-${posGroup.color}-600`} />
                                            {posGroup.name}
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                            {posGroup.data.map((player: any, idx: number) => (
                                                <div key={player.id} className="bg-card/50 border border-primary/20 rounded-lg p-4">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                                                            <span className="text-lg font-bold">#{idx + 1}</span>
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="font-bold text-sm">{player.web_name}</p>
                                                            <p className="text-xs text-muted-foreground">{getTeam(player.team)?.short_name}</p>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                                        <div className="text-center p-2 bg-green-500/10 rounded">
                                                            <p className="text-muted-foreground">Last GW</p>
                                                            <p className="font-bold text-green-600">{player.event_points}</p>
                                                        </div>
                                                        <div className="text-center p-2 bg-primary/10 rounded">
                                                            <p className="text-muted-foreground">Form</p>
                                                            <p className="font-bold text-primary">{parseFloat(player.form).toFixed(1)}</p>
                                                        </div>
                                                        <div className="text-center p-2 bg-orange-500/10 rounded">
                                                            <p className="text-muted-foreground">Price</p>
                                                            <p className="font-bold text-orange-600">£{(player.now_cost / 10).toFixed(1)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Differentials Tab */}
                    <TabsContent value="differentials" className="space-y-6 mt-6">
                        <Card className="border-primary/30 bg-gradient-to-br from-accent/10 to-primary/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Percent className="w-5 h-5 text-purple-600" />
                                    Differential Picks
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">Low ownership (&lt;10%), high form players displayed on pitch</p>
                            </CardHeader>
                            <CardContent>
                                {differentialPlayers.length > 0 && (
                                    <InsightsPitchView
                                        players={differentialPlayers}
                                        teams={teams || []}
                                        fixtures={fixtures || []}
                                        currentEvent={currentEvent?.id || 1}
                                        onPlayerClick={(player) => setSelectedPlayer(player)}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Multi-Source Tab */}
                    <TabsContent value="multi" className="space-y-6 mt-6">
                        <Card className="border-primary/30 bg-gradient-to-br from-[--success]/10 to-secondary/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-cyan-600" />
                                    Multi-Source Recommendations
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">Best value picks and hot streaks displayed on pitch</p>
                            </CardHeader>
                            <CardContent>
                                {multiSourcePlayers.length > 0 && (
                                    <InsightsPitchView
                                        players={multiSourcePlayers}
                                        teams={teams || []}
                                        fixtures={fixtures || []}
                                        currentEvent={currentEvent?.id || 1}
                                        onPlayerClick={(player) => setSelectedPlayer(player)}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Team Playground Tab */}
                    <TabsContent value="playground" className="space-y-6 mt-6">
                        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Gamepad2 className="w-5 h-5 text-primary" />
                                    Team Playground - Edit Your Squad
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Drag & drop players to rearrange, click to swap, experiment with formations
                                    {playgroundGW && ` · GW ${playgroundGW}`}
                                </p>
                            </CardHeader>
                            <CardContent>
                                {playgroundTeam.length === 0 ? (
                                    <div className="text-center p-8 text-muted-foreground">
                                        <Gamepad2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                                        <p className="text-lg font-semibold">No team data available</p>
                                        <p className="text-sm">Your current squad will load here to start editing</p>
                                    </div>
                                ) : (
                                <div className="space-y-6">
                                        {/* Action Bar */}
                                        <div className="flex items-center justify-between p-4 bg-card/50 rounded-lg border border-primary/20">
                                            <div className="flex items-center gap-3">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        if (picks?.picks) {
                                                            setPlaygroundTeam([...picks.picks]);
                                                            setPlaygroundGW(currentEvent?.id || null);
                                                        }
                                                    }}
                                                    className="flex items-center gap-2"
                                                >
                                                    <RotateCcw className="w-4 h-4" />
                                                    Reset
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex items-center gap-2"
                                                >
                                                    <Save className="w-4 h-4" />
                                                    Save (Preview)
                                                </Button>
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    onClick={() => {
                                                        // Calculate current team budget
                                                        const currentBudget = playgroundTeam.reduce((sum: number, pick: any) => {
                                                            const player = getPlayer(pick.element);
                                                            return sum + (player?.now_cost || 0);
                                                        }, 0) / 10;

                                                        // Build best alternate team
                                                        const altTeam = buildBestAlternateTeam(currentBudget);
                                                        setAlternateTeam(altTeam);
                                                        setBattleMode(true);
                                                    }}
                                                    className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700"
                                                >
                                                    <Swords className="w-4 h-4" />
                                                    Card Wars
                                                </Button>
                                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {playgroundTeam.filter((p: any) => p.position <= 11).length} Starting · {playgroundTeam.filter((p: any) => p.position > 11).length} Bench
                                                            </div>
                                                        </div>

                                    {/* Card Wars Battle Mode */}
                                    {battleMode && alternateTeam.length > 0 && (
                                        <div className="mb-6">
                                            <CardWars
                                                myTeam={playgroundTeam}
                                                alternateTeam={alternateTeam}
                                                myTeamPlayers={playgroundTeam.map((pick: any) => getPlayer(pick.element)).filter((p: any) => p)}
                                                alternateTeamPlayers={alternateTeam.map((pick: any) => getPlayer(pick.element)).filter((p: any) => p)}
                                                teams={teams}
                                                fixtures={fixtures || []}
                                                currentEvent={playgroundGW || currentEvent?.id || 1}
                                                myTeamBudget={playgroundTeam.reduce((sum: number, pick: any) => sum + (getPlayer(pick.element)?.now_cost || 0), 0) / 10}
                                                alternateTeamBudget={alternateTeam.reduce((sum: number, pick: any) => sum + (getPlayer(pick.element)?.now_cost || 0), 0) / 10}
                                                onPlayerClick={(player) => setSelectedPlayer(player)}
                                            />
                                            <div className="mt-4 flex justify-center">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setBattleMode(false)}
                                                >
                                                    Back to Playground
                                                </Button>
                                                            </div>
                                                            </div>
                                    )}

                                    {!battleMode && (
                                    <>
                                    {/* Starting 11 */}
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                                <Trophy className="w-5 h-5 text-yellow-500" />
                                                Starting 11
                                        </h3>
                                            <InsightsPitchView
                                                players={playgroundTeam
                                                    .filter((p: any) => p.position <= 11)
                                                    .sort((a: any, b: any) => a.position - b.position)
                                                    .map((pick: any) => getPlayer(pick.element))
                                                    .filter((p: any) => p)}
                                                teams={teams || []}
                                                fixtures={fixtures || []}
                                                currentEvent={playgroundGW || currentEvent?.id || 1}
                                                onPlayerClick={(player) => setSelectedPlayer(player)}
                                                showRanks={false}
                                                picksMap={new Map(playgroundTeam.map((pick: any) => [pick.element, pick]))}
                                                getExpectedPoints={(player: any) => {
                                                    const nextFixture = fixtures
                                                        ?.filter((f: any) => {
                                                            const isTeamInFixture = f.team_h === player.team || f.team_a === player.team;
                                                            return isTeamInFixture && f.event >= (playgroundGW || currentEvent?.id || 1);
                                                        })
                                                        .sort((a: any, b: any) => a.event - b.event)[0];
                                                    
                                                    if (!nextFixture) return parseFloat(player.ep_next) || 0;
                                                    
                                                    const isHome = nextFixture.team_h === player.team;
                                                    const difficulty = isHome ? nextFixture.team_h_difficulty : nextFixture.team_a_difficulty;
                                                    const basePoints = parseFloat(player.ep_next) || parseFloat(player.form) || 0;
                                                    
                                                    let multiplier = 1.0;
                                                    if (difficulty <= 2) multiplier = 1.2;
                                                    else if (difficulty === 3) multiplier = 1.0;
                                                    else if (difficulty === 4) multiplier = 0.85;
                                                    else if (difficulty === 5) multiplier = 0.7;
                                                    
                                                    if (isHome) multiplier *= 1.1;
                                                    
                                                    return Math.max(0, basePoints * multiplier);
                                                }}
                                            />
                                </div>

                                        {/* Bench */}
                                        <div>
                                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                                <Users className="w-5 h-5 text-gray-500" />
                                                Bench
                                            </h3>
                                            <InsightsPitchView
                                                players={playgroundTeam
                                                    .filter((p: any) => p.position > 11)
                                                    .sort((a: any, b: any) => a.position - b.position)
                                                    .map((pick: any) => getPlayer(pick.element))
                                                    .filter((p: any) => p)}
                                                teams={teams || []}
                                                fixtures={fixtures || []}
                                                currentEvent={playgroundGW || currentEvent?.id || 1}
                                                onPlayerClick={(player) => setSelectedPlayer(player)}
                                                showRanks={false}
                                                compactLayout={true}
                                                picksMap={new Map(playgroundTeam.map((pick: any) => [pick.element, pick]))}
                                                getExpectedPoints={(player: any) => {
                                                    const nextFixture = fixtures
                                                        ?.filter((f: any) => {
                                                            const isTeamInFixture = f.team_h === player.team || f.team_a === player.team;
                                                            return isTeamInFixture && f.event >= (playgroundGW || currentEvent?.id || 1);
                                                        })
                                                        .sort((a: any, b: any) => a.event - b.event)[0];
                                                    
                                                    if (!nextFixture) return parseFloat(player.ep_next) || 0;
                                                    
                                                    const isHome = nextFixture.team_h === player.team;
                                                    const difficulty = isHome ? nextFixture.team_h_difficulty : nextFixture.team_a_difficulty;
                                                    const basePoints = parseFloat(player.ep_next) || parseFloat(player.form) || 0;
                                                    
                                                    let multiplier = 1.0;
                                                    if (difficulty <= 2) multiplier = 1.2;
                                                    else if (difficulty === 3) multiplier = 1.0;
                                                    else if (difficulty === 4) multiplier = 0.85;
                                                    else if (difficulty === 5) multiplier = 0.7;
                                                    
                                                    if (isHome) multiplier *= 1.1;
                                                    
                                                    return Math.max(0, basePoints * multiplier);
                                                }}
                                            />
                                </div>

                                        {/* Available Players Pool */}
                                        <div>
                                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                                <Plus className="w-5 h-5 text-green-500" />
                                                Available Players
                                            </h3>
                                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-96 overflow-y-auto p-2">
                                                {elements
                                                    .filter((p: any) => !playgroundTeam.some((pick: any) => pick.element === p.id))
                                                    .slice(0, 50)
                                                    .map((player: any) => (
                                                        <button
                                                            key={player.id}
                                                            onClick={() => {
                                                                // Add player to bench
                                                                const newPick = {
                                                                    element: player.id,
                                                                    position: 12 + playgroundTeam.filter((p: any) => p.position > 11).length,
                                                                    is_captain: false,
                                                                    is_vice_captain: false
                                                                };
                                                                setPlaygroundTeam([...playgroundTeam, newPick]);
                                                            }}
                                                            className="p-2 bg-card/50 border border-primary/20 rounded-lg hover:border-primary/40 hover:bg-primary/10 transition-all text-left"
                                                        >
                                                            <p className="text-xs font-bold truncate">{player.web_name}</p>
                                                            <p className="text-[10px] text-muted-foreground">{getTeam(player.team)?.short_name}</p>
                                                            <p className="text-[10px] text-primary mt-1">£{(player.now_cost / 10).toFixed(1)}m</p>
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
                    </TabsContent>
                </Tabs>
                    </div>

            {/* Player Detail Modal */}
            <PlayerDetailModal
                player={selectedPlayer}
                team={selectedPlayer ? teams?.find((t: any) => t.id === selectedPlayer.team) : null}
                teams={teams || []}
                fixtures={fixtures || []}
                currentEvent={currentEvent?.id || 1}
                onClose={() => setSelectedPlayer(null)}
            />

        </div>
    );
}
