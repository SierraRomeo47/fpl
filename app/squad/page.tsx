'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, Trophy, TrendingUp, ChevronDown, Search, X as XIcon, GitCompare } from "lucide-react";
import { useFPLData } from "@/lib/hooks/use-fpl-data";
import { InsightsPitchView } from "@/components/insights/insights-pitch-view";
import { PlayerDetailModal } from "@/components/insights/player-detail-modal";
import { UpgradeSplitCard } from "@/components/insights/upgrade-split-card";
import { PlayerComparisonModal } from "@/components/insights/player-comparison-modal";

// ============ UTILITY FUNCTIONS (Module Level) ============
function getPlayerPhotoUrl(player: any): string[] {
    return [
        `https://resources.premierleague.com/premierleague/photos/players/250x250/p${player.code}.png`,
        `https://resources.premierleague.com/premierleague/photos/players/250x250/p${player.photo}.png`,
        `https://resources.premierleague.com/premierleague/photos/players/250x250/p${player.id}.png`,
    ];
}

function getTeamBadgeUrl(teamCode: number): string[] {
    return [
        `https://resources.premierleague.com/premierleague/badges/70/t${teamCode}.png`,
        `https://resources.premierleague.com/premierleague/badges/t${teamCode}.png`,
    ];
}

function getJerseyNumber(player: any): string | number {
    if (player.squad_number && player.squad_number > 0) return player.squad_number;
    const defaults: Record<number, number> = { 1: 1, 2: 5, 3: 8, 4: 9 };
    return defaults[player.element_type] || '?';
}
// ============ END UTILITY FUNCTIONS ============

export default function SquadPage() {
    const router = useRouter();
    const [sessionData, setSessionData] = useState<{ entryId: number } | null>(null);
    const [currentEventId, setCurrentEventId] = useState<number>();
    const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
    const [showUpgrades, setShowUpgrades] = useState<boolean>(false);
    const [upgradeSource, setUpgradeSource] = useState<string>('total_points');
    const [currentTime, setCurrentTime] = useState<Date>(new Date());

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
                    console.warn('[SquadPage] Session check failed:', res.status);
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
                console.error('[SquadPage] Error loading session:', err);
                // Don't auto-redirect on errors - let user stay on page
            }
        };

        loadSession();

        return () => {
            mounted = false;
        };
    }, [router]);

    const { bootstrap, picks, history, myTeam, isLoading, fixtures } = useFPLData(sessionData?.entryId, currentEventId);
    const [showTeamComparison, setShowTeamComparison] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [filterTeam, setFilterTeam] = useState<number | null>(null);
    const [filterMaxPrice, setFilterMaxPrice] = useState<number | null>(null);
    const [selectedForComparison, setSelectedForComparison] = useState<number[]>([]); // Array of player IDs (max 2)
    const [showComparisonModal, setShowComparisonModal] = useState<boolean>(false);
    const currentEvent = bootstrap?.events?.find((e: any) => e.is_current);

    // Update current time every second for countdown timer
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (bootstrap && !currentEventId) {
            const current = bootstrap.events.find((e: any) => e.is_current);
            const next = bootstrap.events.find((e: any) => e.is_next);
            setCurrentEventId(current?.id || next?.id);
        }
    }, [bootstrap, currentEventId]);

    if (!sessionData || isLoading || !bootstrap || !picks) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const teams = bootstrap.teams;
    const elements = bootstrap.elements;

    const starting11 = picks.picks.filter((p: any) => p.position <= 11).sort((a: any, b: any) => a.position - b.position);
    const bench = picks.picks.filter((p: any) => p.position > 11).sort((a: any, b: any) => a.position - b.position);

    const getPlayer = (elementId: number) => elements.find((p: any) => p.id === elementId);
    const getTeam = (teamId: number) => teams.find((t: any) => t.id === teamId);

    // Check if player is unavailable (injured, suspended, or AFCON)
    const isPlayerUnavailable = (player: any): boolean => {
        // Check status - only 'a' means available
        if (player.status !== 'a') return true;
        
        // Check chance of playing next round - less than 75% means likely unavailable
        const chanceOfPlaying = player.chance_of_playing_next_round;
        if (chanceOfPlaying !== null && chanceOfPlaying !== undefined && chanceOfPlaying < 75) {
            return true;
        }
        
        // Check news field for injury, suspension, or AFCON keywords
        const news = (player.news || '').toLowerCase();
        const unavailableKeywords = [
            'injured', 'injury', 'suspended', 'suspension', 'ban',
            'afcon', 'africa cup', 'international duty',
            'doubtful', 'doubt', 'unavailable', 'knock'
        ];
        
        if (news && unavailableKeywords.some(keyword => news.includes(keyword))) {
            return true;
        }
        
        return false;
    };

    // Get player priority for upgrade sorting (higher priority = should be shown first)
    // Suspended > Injured > Unavailable (other) > Available
    const getPlayerUpgradePriority = (player: any): number => {
        // Priority 1: Suspended players (status 's')
        if (player.status === 's') return 1;
        
        // Priority 2: Injured players (status 'i')
        if (player.status === 'i') return 2;
        
        // Priority 3: Other unavailable players (status 'u', 'd', 'n')
        if (player.status !== 'a') return 3;
        
        // Check news for suspension keywords
        const news = (player.news || '').toLowerCase();
        if (news.includes('suspended') || news.includes('suspension') || news.includes('ban')) {
            return 1; // Treated as suspended
        }
        
        // Check news for injury keywords
        if (news.includes('injured') || news.includes('injury') || news.includes('knock')) {
            return 2; // Treated as injured
        }
        
        // Priority 4: Low fitness (less than 75% chance)
        const chanceOfPlaying = player.chance_of_playing_next_round;
        if (chanceOfPlaying !== null && chanceOfPlaying !== undefined && chanceOfPlaying < 75) {
            return 3; // Treated as unavailable
        }
        
        // Priority 5: Available players
        return 4;
    };

    // Calculate overall score across multiple metrics
    const calculateOverallScore = (player: any): number => {
        const form = parseFloat(player.form) || 0;
        const totalPoints = player.total_points || 0;
        const pointsPerGame = parseFloat(player.points_per_game) || 0;
        const expectedPoints = parseFloat(player.ep_next) || 0;
        const ictIndex = parseFloat(player.ict_index) || 0;
        const value = player.now_cost > 0 ? (player.total_points / (player.now_cost / 10)) : 0;
        const chanceOfPlaying = player.chance_of_playing_next_round || 100;
        
        // Weighted scoring system
        const weights = {
            form: 0.25,           // Recent form is very important
            expectedPoints: 0.20,  // Future potential
            pointsPerGame: 0.15,   // Consistency
            totalPoints: 0.15,     // Season performance
            value: 0.15,           // Points per million
            ictIndex: 0.10,        // Advanced metrics
        };
        
        // Normalize scores (assuming max values for scaling)
        const normalizedForm = Math.min(form / 10, 1) * 100;
        const normalizedExpected = Math.min(expectedPoints / 10, 1) * 100;
        const normalizedPPG = Math.min(pointsPerGame / 8, 1) * 100;
        const normalizedTotal = Math.min(totalPoints / 200, 1) * 100;
        const normalizedValue = Math.min(value / 20, 1) * 100;
        const normalizedICT = Math.min(ictIndex / 100, 1) * 100;
        
        // Calculate weighted score
        let score = 
            (normalizedForm * weights.form) +
            (normalizedExpected * weights.expectedPoints) +
            (normalizedPPG * weights.pointsPerGame) +
            (normalizedTotal * weights.totalPoints) +
            (normalizedValue * weights.value) +
            (normalizedICT * weights.ictIndex);
        
        // Bonus for high availability
        const availabilityBonus = (chanceOfPlaying / 100) * 5;
        score += availabilityBonus;
        
        return score;
    };

    // Function to find upgrade suggestion for a player based on upgradeSource
    const findUpgradeSuggestion = (currentPlayer: any, myTeamPlayerIds: Set<number>, usedUpgradeIds: Set<number>) => {
        if (!currentPlayer || !elements || elements.length === 0) return null;

        // Get current player's value for the selected metric
        const getPlayerMetricValue = (player: any) => {
            switch (upgradeSource) {
                case 'overall':
                    return calculateOverallScore(player);
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
            .filter((p: any) => !isPlayerUnavailable(p)) // Filter out unavailable players
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

    // Create picks map for easy lookup
    const picksMap = new Map<number, any>(picks.picks.map((pick: any) => [pick.element as number, pick]));

    // Calculate expected points for current GW
    const getExpectedPoints = (player: any) => {
        const nextFixture = fixtures
            ?.filter((f: any) => {
                const isTeamInFixture = f.team_h === player.team || f.team_a === player.team;
                return isTeamInFixture && f.event >= (currentEvent?.id || currentEventId || 1);
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
    };

    const positionGroups = {
        GKP: starting11.filter((p: any) => getPlayer(p.element)?.element_type === 1),
        DEF: starting11.filter((p: any) => getPlayer(p.element)?.element_type === 2),
        MID: starting11.filter((p: any) => getPlayer(p.element)?.element_type === 3),
        FWD: starting11.filter((p: any) => getPlayer(p.element)?.element_type === 4),
    };

    const TradingCard = ({ pick, isBench = false }: { pick: any, isBench?: boolean }) => {
        const player = getPlayer(pick.element);
        const team = getTeam(player?.team);

        if (!player) return null;

        const positionName = ['', 'GKP', 'DEF', 'MID', 'FWD'][player.element_type];
        const jerseyNumber = getJerseyNumber(player);
        const playerPhotoUrls = getPlayerPhotoUrl(player);
        const teamBadgeUrls = getTeamBadgeUrl(team?.code);

        // AUTHENTIC PL Team Colors
        const teamColors: Record<number, { primary: string, secondary: string, accent: string, text: string }> = {
            1: { primary: 'from-red-600 to-red-700', secondary: 'from-white to-gray-100', accent: 'bg-red-600', text: 'text-white' },
            2: { primary: 'from-purple-700 to-purple-900', secondary: 'from-sky-400 to-sky-500', accent: 'bg-purple-700', text: 'text-white' },
            3: { primary: 'from-blue-500 to-blue-600', secondary: 'from-white to-gray-100', accent: 'bg-blue-500', text: 'text-white' },
            4: { primary: 'from-red-500 to-red-600', secondary: 'from-black to-gray-900', accent: 'bg-red-500', text: 'text-white' },
            5: { primary: 'from-blue-600 to-blue-700', secondary: 'from-white to-gray-100', accent: 'bg-blue-600', text: 'text-white' },
            6: { primary: 'from-blue-600 to-blue-800', secondary: 'from-red-600 to-red-700', accent: 'bg-blue-700', text: 'text-white' },
            7: { primary: 'from-blue-700 to-blue-900', secondary: 'from-white to-gray-100', accent: 'bg-blue-800', text: 'text-white' },
            8: { primary: 'from-white to-gray-100', secondary: 'from-black to-gray-900', accent: 'bg-gray-800', text: 'text-gray-900' },
            9: { primary: 'from-blue-600 to-blue-800', secondary: 'from-white to-gray-100', accent: 'bg-blue-700', text: 'text-white' },
            10: { primary: 'from-red-600 to-red-700', secondary: 'from-white to-gray-100', accent: 'bg-red-600', text: 'text-white' },
            11: { primary: 'from-sky-400 to-sky-500', secondary: 'from-white to-gray-100', accent: 'bg-sky-400', text: 'text-sky-900' },
            12: { primary: 'from-red-700 to-red-800', secondary: 'from-black to-gray-900', accent: 'bg-red-700', text: 'text-white' },
            13: { primary: 'from-black to-gray-900', secondary: 'from-white to-gray-100', accent: 'bg-black', text: 'text-white' },
            14: { primary: 'from-red-600 to-red-700', secondary: 'from-white to-gray-100', accent: 'bg-red-600', text: 'text-white' },
            15: { primary: 'from-red-600 to-red-800', secondary: 'from-white to-gray-200', accent: 'bg-red-700', text: 'text-white' },
            16: { primary: 'from-white to-gray-100', secondary: 'from-blue-900 to-blue-950', accent: 'bg-blue-900', text: 'text-gray-900' },
            17: { primary: 'from-amber-700 to-amber-800', secondary: 'from-blue-900 to-blue-950', accent: 'bg-amber-700', text: 'text-white' },
            18: { primary: 'from-orange-500 to-orange-600', secondary: 'from-black to-gray-900', accent: 'bg-orange-500', text: 'text-white' },
            19: { primary: 'from-red-600 to-red-700', secondary: 'from-black to-gray-900', accent: 'bg-red-600', text: 'text-white' },
            20: { primary: 'from-blue-600 to-blue-800', secondary: 'from-red-600 to-red-700', accent: 'bg-blue-700', text: 'text-white' },
        };

        const colors = teamColors[player.team] || { primary: 'from-primary to-purple-600', secondary: 'from-white to-gray-100', accent: 'bg-primary', text: 'text-white' };

        return (
            <div className={`relative group ${isBench ? 'opacity-75' : ''}`}>
                <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-1 shadow-2xl hover:shadow-primary/50 transition-all hover:scale-105 border-2 border-yellow-500/30">
                    {pick.is_captain && (
                        <div className="absolute -top-3 -right-3 w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex flex-col items-center justify-center shadow-xl z-20 border-4 border-yellow-300">
                            <Shield className="w-5 h-5 text-yellow-900" />
                            <span className="text-[10px] font-bold text-yellow-900">CAP</span>
                        </div>
                    )}
                    {pick.is_vice_captain && (
                        <div className="absolute -top-3 -right-3 w-12 h-12 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full flex flex-col items-center justify-center shadow-xl z-20 border-4 border-gray-200">
                            <Shield className="w-5 h-5 text-gray-700" />
                            <span className="text-[10px] font-bold text-gray-700">VICE</span>
                        </div>
                    )}

                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-[20px] overflow-hidden">
                        {/* Top Section: Player Photo + Team Badge */}
                        <div className={`relative h-36 bg-gradient-to-br ${colors.primary} ${colors.text} flex items-center justify-center overflow-hidden`}>
                            <div className="absolute inset-0 opacity-10">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_60%)]" />
                            </div>

                            {/* Large Player Photo */}
                            <div className="relative z-10 w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-2xl bg-gradient-to-br from-white to-gray-100">
                                <img
                                    src={playerPhotoUrls[0]}
                                    alt={player.web_name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        const img = e.currentTarget;
                                        const currentSrc = img.src;
                                        const currentIndex = playerPhotoUrls.findIndex(url => currentSrc === url);

                                        if (currentIndex < playerPhotoUrls.length - 1) {
                                            img.src = playerPhotoUrls[currentIndex + 1];
                                        } else {
                                            img.style.display = 'none';
                                            const div = document.createElement('div');
                                            div.className = 'w-full h-full flex items-center justify-center text-4xl font-bold text-primary bg-white';
                                            div.textContent = player.web_name[0];
                                            img.parentElement!.appendChild(div);
                                        }
                                    }}
                                />
                            </div>

                            {/* Team Badge - Top Right Corner */}
                            <div className="absolute top-3 right-3 z-10">
                                <div className={`w-12 h-12 ${colors.accent} rounded-full flex items-center justify-center shadow-xl border-3 border-white/70 overflow-hidden bg-white`}>
                                    <img
                                        src={teamBadgeUrls[0]}
                                        alt={team?.short_name}
                                        className="w-10 h-10 object-contain"
                                        onError={(e) => {
                                            const img = e.currentTarget;
                                            const currentSrc = img.src;
                                            const currentIndex = teamBadgeUrls.findIndex(url => currentSrc.includes(url.split('/').pop() || ''));

                                            if (currentIndex < teamBadgeUrls.length - 1) {
                                                img.src = teamBadgeUrls[currentIndex + 1];
                                            } else {
                                                img.style.display = 'none';
                                                const span = document.createElement('span');
                                                span.className = 'font-black text-xs text-gray-800';
                                                span.textContent = team?.short_name?.substring(0, 3).toUpperCase() || '';
                                                img.parentElement!.appendChild(span);
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Center Bar: Player Name */}
                        <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 text-white px-3 py-3 text-center border-y-2 border-white/10">
                            <p className="text-base font-black tracking-wide uppercase truncate drop-shadow-lg">{player.web_name}</p>
                            <p className="text-xs text-gray-300 font-semibold truncate">{team?.short_name}</p>
                        </div>

                        <div className="flex justify-center -mt-0 relative z-10">
                            <div className={`bg-gradient-to-r ${colors.primary} text-white px-4 py-1 text-xs font-bold shadow-md`}>
                                {positionName} #{jerseyNumber}
                            </div>
                        </div>

                        <div className="p-3 space-y-2">
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl p-2 text-center border-2 border-primary/30">
                                    <p className="text-[9px] text-gray-700 font-bold uppercase">GW PTS</p>
                                    <p className="text-xl font-black text-primary">{player.event_points || 0}</p>
                                </div>
                                <div className="bg-gradient-to-br from-[--success]/20 to-[--success]/10 rounded-xl p-2 text-center border-2 border-[--success]/40">
                                    <p className="text-[9px] text-gray-700 font-bold uppercase">TOTAL</p>
                                    <p className="text-xl font-black text-gray-900">{player.total_points}</p>
                                </div>
                                <div className="bg-gradient-to-br from-[--warning]/20 to-[--warning]/10 rounded-xl p-2 text-center border-2 border-[--warning]/40">
                                    <p className="text-[9px] text-gray-700 font-bold uppercase">PRICE</p>
                                    <p className="text-xl font-black text-gray-900">{(player.now_cost / 10).toFixed(1)}</p>
                                    <p className="text-[8px] text-gray-600 font-semibold">(£m)</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex items-center justify-between bg-secondary/60 rounded-lg p-2 border border-secondary/80">
                                    <span className="text-white font-bold text-[10px]">Form</span>
                                    <span className="font-black text-white">{parseFloat(player.form).toFixed(1)}</span>
                                </div>
                                <div className="flex items-center justify-between bg-secondary/60 rounded-lg p-2 border border-secondary/80">
                                    <span className="text-white font-bold text-[10px]">Own</span>
                                    <span className="font-black text-white">{parseFloat(player.selected_by_percent).toFixed(1)}%</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs">
                                <div className="flex-1 bg-accent/20 border border-accent/30 rounded p-1.5 text-center">
                                    <span className="text-gray-700 font-bold text-[10px]">Bonus: </span>
                                    <span className="font-black text-gray-900">{player.bonus || 0}</span>
                                </div>
                                <div className="flex-1 bg-accent/20 border border-accent/30 rounded p-1.5 text-center">
                                    <span className="text-gray-700 font-bold text-[10px]">BPS: </span>
                                    <span className="font-black text-gray-900">{player.bps || 0}</span>
                                </div>
                            </div>
                        </div>

                        <div className={`bg-gradient-to-r ${colors.primary} px-3 py-2 flex items-center justify-between ${colors.text}`}>
                            <span className="text-xs opacity-90 font-semibold">#{player.id}</span>
                            <span className="text-xs font-bold">PL 24/25</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="min-h-screen bg-background pb-24 pt-16">
                <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5 md:space-y-6">
                    {/* Hero Section - Match Dashboard Style */}
                    <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-card border border-border p-4 md:p-8">
                        <div className="relative z-10">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div className="flex items-center gap-2 md:gap-3">
                                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                                        <Trophy className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
                                            Your Squad
                                        </h1>
                                        <p className="text-sm md:text-base text-muted-foreground">Gameweek {currentEventId}</p>
                                    </div>
                                </div>
                                <Badge variant="default" className="text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2 w-full md:w-auto justify-center">
                                    {positionGroups.DEF.length}-{positionGroups.MID.length}-{positionGroups.FWD.length}
                                </Badge>
                            </div>
                            
                            {/* Deadline Box - Moved here below header */}
                            {(() => {
                                    // Find the next deadline that is in the future
                                    const upcomingDeadline = bootstrap?.events
                                        ?.map((e: any) => ({
                                            event: e,
                                            deadline: new Date(e.deadline_time)
                                        }))
                                        .filter(({ deadline }: { deadline: Date }) => deadline > currentTime) // Only future deadlines
                                        .sort((a: { event: any; deadline: Date }, b: { event: any; deadline: Date }) => a.deadline.getTime() - b.deadline.getTime())[0]; // Sort by earliest first
                                    
                                    if (!upcomingDeadline) return null;
                                    
                                    const deadlineTime = upcomingDeadline.deadline;
                                    
                                    // Get user's local timezone and abbreviation
                                    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                                    
                                    // Get timezone abbreviation (e.g., IST, CST, EST, PST)
                                    const getTimezoneAbbr = () => {
                                        // Try with en-GB locale first as it often returns abbreviations like IST, GMT, etc.
                                        const formatterGB = new Intl.DateTimeFormat('en-GB', {
                                            timeZone: userTimezone,
                                            timeZoneName: 'short'
                                        });
                                        const partsGB = formatterGB.formatToParts(new Date());
                                        const tzNameGB = partsGB.find(part => part.type === 'timeZoneName');
                                        
                                        if (tzNameGB && tzNameGB.value && !tzNameGB.value.startsWith('GMT')) {
                                            return tzNameGB.value;
                                        }
                                        
                                        // Fallback: Try en-US locale
                                        const formatterUS = new Intl.DateTimeFormat('en-US', {
                                            timeZone: userTimezone,
                                            timeZoneName: 'short'
                                        });
                                        const partsUS = formatterUS.formatToParts(new Date());
                                        const tzNameUS = partsUS.find(part => part.type === 'timeZoneName');
                                        
                                        if (tzNameUS && tzNameUS.value && !tzNameUS.value.startsWith('GMT')) {
                                            return tzNameUS.value;
                                        }
                                        
                                        // Fallback: Use timezone name mapping for common timezones
                                        const tzMap: Record<string, string> = {
                                            'Asia/Kolkata': 'IST',
                                            'Asia/Calcutta': 'IST',
                                            'America/Chicago': 'CST',
                                            'America/New_York': 'EST',
                                            'America/Los_Angeles': 'PST',
                                            'America/Denver': 'MST',
                                            'Europe/London': 'GMT',
                                            'Europe/Paris': 'CET',
                                            'Asia/Tokyo': 'JST',
                                            'Australia/Sydney': 'AEDT',
                                            'Australia/Melbourne': 'AEDT',
                                        };
                                        
                                        if (tzMap[userTimezone]) {
                                            return tzMap[userTimezone];
                                        }
                                        
                                        // Final fallback: Extract from timezone name
                                        const tzParts = userTimezone.split('/');
                                        if (tzParts.length > 0) {
                                            const lastPart = tzParts[tzParts.length - 1];
                                            // For common patterns, try to extract abbreviation
                                            return lastPart.replace(/_/g, '').substring(0, 3).toUpperCase();
                                        }
                                        
                                        return 'LOCAL';
                                    };
                                    
                                    const userTimezoneName = getTimezoneAbbr();
                                    
                                    // Calculate GMT offset from user's timezone for the deadline date
                                    const getGMTOffset = () => {
                                        // Get the timezone offset for the deadline date
                                        // We need to format the date in the user's timezone and compare with UTC
                                        const utcTime = deadlineTime.getTime();
                                        
                                        // Get local time string in user's timezone
                                        const localTimeStr = deadlineTime.toLocaleString('en-US', {
                                            timeZone: userTimezone,
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: false
                                        });
                                        
                                        // Get UTC time string
                                        const utcTimeStr = deadlineTime.toLocaleString('en-US', {
                                            timeZone: 'UTC',
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: false
                                        });
                                        
                                        // Parse both to get time components
                                        const parseTime = (str: string) => {
                                            const [datePart, timePart] = str.split(', ');
                                            const [month, day, year] = datePart.split('/');
                                            const [hour, minute] = timePart.split(':');
                                            return {
                                                year: parseInt(year),
                                                month: parseInt(month) - 1,
                                                day: parseInt(day),
                                                hour: parseInt(hour),
                                                minute: parseInt(minute)
                                            };
                                        };
                                        
                                        const local = parseTime(localTimeStr);
                                        const utc = parseTime(utcTimeStr);
                                        
                                        // Create date objects (in local browser timezone for comparison)
                                        const localDate = new Date(local.year, local.month, local.day, local.hour, local.minute);
                                        const utcDate = new Date(utc.year, utc.month, utc.day, utc.hour, utc.minute);
                                        
                                        // Calculate offset in minutes
                                        const offsetMs = localDate.getTime() - utcDate.getTime();
                                        const offsetMinutes = Math.round(offsetMs / (1000 * 60));
                                        
                                        // Convert to hours and minutes
                                        const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
                                        const offsetMins = Math.abs(offsetMinutes) % 60;
                                        const sign = offsetMinutes >= 0 ? '+' : '-';
                                        
                                        // Format as GMT+05:30 or GMT-05:00
                                        if (offsetMins === 0) {
                                            return `GMT${sign}${offsetHours.toString().padStart(2, '0')}:00`;
                                        } else {
                                            return `GMT${sign}${offsetHours.toString().padStart(2, '0')}:${offsetMins.toString().padStart(2, '0')}`;
                                        }
                                    };
                                    
                                    const gmtOffset = getGMTOffset();
                                    
                                    // Format deadline in user's local timezone - separate date and time
                                    const deadlineDate = deadlineTime.toLocaleDateString('en-GB', { 
                                        weekday: 'long',
                                        day: 'numeric', 
                                        month: 'long',
                                        year: 'numeric',
                                        timeZone: userTimezone
                                    });
                                    
                                    const deadlineTimeStr = deadlineTime.toLocaleTimeString('en-GB', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: false,
                                        timeZone: userTimezone
                                    });
                                    
                                    // Combine date, time, and timezone: "Saturday, 3 January 2026 at 16:30 IST"
                                    const formattedDeadlineLocal = `${deadlineDate} at ${deadlineTimeStr} ${userTimezoneName}`;
                                    
                                    // Format UTC time for reference (only if different from local)
                                    const formattedDeadlineUTC = deadlineTime.toLocaleDateString('en-GB', { 
                                        weekday: 'short',
                                        day: 'numeric', 
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit', 
                                        minute: '2-digit',
                                        hour12: false,
                                        timeZone: 'UTC'
                                    });
                                    
                                    // Calculate time remaining (updates every second)
                                    const timeRemaining = Math.max(0, deadlineTime.getTime() - currentTime.getTime());
                                    const daysRemaining = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
                                    const hoursRemaining = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                    const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
                                    const secondsRemaining = Math.floor((timeRemaining % (1000 * 60)) / 1000);
                                    
                                    // Format countdown display
                                    const formatCountdown = () => {
                                        if (daysRemaining > 0) {
                                            return `${daysRemaining}d ${hoursRemaining.toString().padStart(2, '0')}h ${minutesRemaining.toString().padStart(2, '0')}m ${secondsRemaining.toString().padStart(2, '0')}s`;
                                        } else if (hoursRemaining > 0) {
                                            return `${hoursRemaining}h ${minutesRemaining.toString().padStart(2, '0')}m ${secondsRemaining.toString().padStart(2, '0')}s`;
                                        } else if (minutesRemaining > 0) {
                                            return `${minutesRemaining}m ${secondsRemaining.toString().padStart(2, '0')}s`;
                                        } else {
                                            return `${secondsRemaining}s`;
                                        }
                                    };
                                    
                                    return (
                                        <div className="mt-4 w-full">
                                            <div className="text-center md:text-left bg-card/50 rounded-lg p-3 md:p-4 border border-primary/20">
                                                <p className="text-xs md:text-sm text-muted-foreground mb-2 font-semibold uppercase tracking-wide">Next Deadline</p>
                                                
                                                {/* Date and Time - Larger and clearer */}
                                                <div className="mb-3">
                                                    <p className="text-sm md:text-base font-bold text-foreground leading-tight mb-1">
                                                        {formattedDeadlineLocal}
                                                    </p>
                                                    {/* GMT offset and UTC time in a row */}
                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                        <p className="text-[10px] md:text-xs text-muted-foreground">
                                                            {gmtOffset}
                                                        </p>
                                                        {userTimezoneName !== 'UTC' && (
                                                            <>
                                                                <span className="text-[10px] md:text-xs text-muted-foreground">•</span>
                                                                <p className="text-[10px] md:text-xs text-muted-foreground">
                                                                    {formattedDeadlineUTC} UTC
                                                                </p>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {/* Live Countdown Timer - Prominent */}
                                                {timeRemaining > 0 ? (
                                                    <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-lg p-2 md:p-3 border-2 border-orange-500/40">
                                                        <p className="text-[10px] md:text-xs text-muted-foreground mb-1 font-semibold uppercase">Time Remaining</p>
                                                        <p className="text-lg md:text-2xl font-black text-orange-400 font-mono tracking-wider">
                                                            {formatCountdown()}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="bg-red-500/20 rounded-lg p-2 md:p-3 border-2 border-red-500/40">
                                                        <p className="text-sm md:text-base font-bold text-red-400">Deadline Passed</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            
                            {/* Action Buttons - Moved here underneath header */}
                            <div className="flex items-center gap-3 mt-4">
                                <button
                                    onClick={() => {
                                        setShowUpgrades(true);
                                        // Scroll to upgrade section after a brief delay to ensure it's rendered
                                        setTimeout(() => {
                                            const upgradeSection = document.getElementById('upgrade-recommendations');
                                            if (upgradeSection) {
                                                upgradeSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                            }
                                        }, 100);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg hover:from-orange-600 hover:to-orange-700 transition-all"
                                >
                                    <TrendingUp className="w-4 h-4" />
                                    <span>Improve</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setShowUpgrades(true);
                                        setShowTeamComparison(true);
                                        // Scroll to upgrade section after a brief delay to ensure it's rendered
                                        setTimeout(() => {
                                            const upgradeSection = document.getElementById('upgrade-recommendations');
                                            if (upgradeSection) {
                                                upgradeSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                            }
                                        }, 100);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all"
                                >
                                    <GitCompare className="w-4 h-4" />
                                    <span>Compare Team vs Database</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Football Pitch with Formation using InsightsPitchView */}
                    <InsightsPitchView
                        players={starting11.map((pick: any) => getPlayer(pick.element)).filter((p: any) => p)}
                        teams={teams || []}
                        fixtures={fixtures || []}
                        currentEvent={currentEvent?.id || currentEventId || 1}
                        onPlayerClick={(player) => setSelectedPlayer(player)}
                        showRanks={false}
                        picksMap={picksMap}
                        getExpectedPoints={getExpectedPoints}
                        isSquadView={true}
                    />

                    {/* Substitutes Bench with Realistic Stadium Stand Design */}
                    {bench.length > 0 && (
                        <div className="relative overflow-hidden rounded-2xl border-2 border-orange-500/40 shadow-xl">
                            {/* Stadium Bench Background */}
                            <div className="relative bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 p-4">
                                {/* Stadium Back Wall / Roof Shadow */}
                                <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-slate-900/80 via-slate-800/60 to-transparent"></div>

                                {/* Bench Backrest Support */}
                                <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-slate-900/90 to-slate-800/70">
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-slate-600/50 to-transparent"></div>
                                </div>

                                {/* Bench Seating Area - Wooden Planks (Reduced Height) */}
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

                                {/* Title Section */}
                                <div className="relative z-20 mb-4 text-center">
                                    <h2 className="text-xl font-black text-white drop-shadow-lg tracking-wide">Substitutes Bench</h2>
                                    <p className="text-xs text-amber-100/90 font-semibold drop-shadow-md">Reserves & Substitutes</p>
                                </div>

                                {/* Players Cards Grid - Elevated on Bench */}
                                <div className="relative z-20 -mt-6 mb-2">
                                    <div className="bg-gradient-to-b from-transparent via-amber-800/5 to-transparent rounded-lg p-1">
                                        <InsightsPitchView
                                            players={bench.map((pick: any) => getPlayer(pick.element)).filter((p: any) => p)}
                                            teams={teams || []}
                                            fixtures={fixtures || []}
                                            currentEvent={currentEvent?.id || currentEventId || 1}
                                            onPlayerClick={(player) => setSelectedPlayer(player)}
                                            showRanks={false}
                                            compactLayout={true}
                                            picksMap={picksMap}
                                            getExpectedPoints={getExpectedPoints}
                                            isSquadView={true}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Upgrade Source Selector - Only show when upgrades are visible */}
                    {showUpgrades && (
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-sm font-semibold text-muted-foreground">Filter By:</span>
                            <div className="relative">
                                <select
                                    value={upgradeSource}
                                    onChange={(e) => setUpgradeSource(e.target.value)}
                                    className="appearance-none bg-card border border-primary/30 rounded-lg px-4 py-2 pr-10 text-sm font-medium cursor-pointer hover:border-primary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 text-white"
                                >
                                    <optgroup label="Analysis">
                                        <option value="overall">Overall (Multi-Metric Analysis)</option>
                                    </optgroup>
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
                    )}

                    {/* Upgrade Recommendations Section */}
                    {showUpgrades && (
                        <Card id="upgrade-recommendations" className="border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-primary" />
                                    Upgrade Recommendations
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">Suggested upgrades for your current team</p>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Bank Balance Display */}
                                {(() => {
                                    // Use correct data from FPL database - history.current has bank and value
                                    const currentHistory = history?.current && history.current.length > 0 
                                        ? history.current[history.current.length - 1] 
                                        : null;
                                    
                                    const bankBalance = currentHistory ? (currentHistory.bank || 0) / 10 : 0; // Convert from tenths to millions
                                    const squadValue = currentHistory ? (currentHistory.value || 0) / 10 : 0; // Squad value from database (includes price changes)
                                    const totalBudget = squadValue + bankBalance;
                                    
                                    // Free transfers available
                                    const freeTransfers = myTeam?.transfers 
                                        ? (myTeam.transfers.limit - myTeam.transfers.made)
                                        : (currentHistory ? 1 : 0); // Default to 1 if no data
                                    
                                    return (
                                        <div className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 border-2 border-orange-500/50 rounded-lg p-4 mb-4">
                                            <div className="grid grid-cols-4 gap-4">
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">In the Bank</p>
                                                    <p className="text-2xl font-black text-orange-400">£{bankBalance.toFixed(1)}m</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">FT Available</p>
                                                    <p className="text-2xl font-black text-green-400">{freeTransfers}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-muted-foreground mb-1">Squad Value</p>
                                                    <p className="text-xl font-bold text-white">£{squadValue.toFixed(1)}m</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-muted-foreground mb-1">Total Budget</p>
                                                    <p className="text-xl font-bold text-white">£{totalBudget.toFixed(1)}m</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* My Team Upgrades (Starting 11 + Bench) */}
                                {picks.picks.length > 0 && (
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <Trophy className="w-5 h-5 text-primary" />
                                                <h3 className="text-lg font-semibold">My Team - Upgrades (Starting XI + Bench)</h3>
                                            </div>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            {upgradeSource === 'overall' ? (
                                                <>
                                                    <span className="font-semibold">Overall Analysis:</span> Multi-metric evaluation across Form, Expected Points, Total Points, Value, ICT Index, and Points per Game. Unavailable players (injured, suspended, or on international duty like AFCON) are automatically excluded.
                                                </>
                                            ) : (
                                                <>
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
                                                    } · Each player gets unique suggestions
                                                </>
                                            )}
                                        </p>

                                        {/* Display upgrade recommendations with split cards */}
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                            {(() => {
                                                const myTeamPlayerIds = new Set<number>(picks.picks.map((p: any) => p.element as number));
                                                const usedUpgradeIds = new Set<number>();
                                                // Use correct bank balance from database - from history.current
                                                const currentHistory = history?.current && history.current.length > 0 
                                                    ? history.current[history.current.length - 1] 
                                                    : null;
                                                const bankBalance = currentHistory ? (currentHistory.bank || 0) / 10 : 0;
                                                
                                                return picks.picks
                                                    .map((pick: any) => {
                                                        const player = elements.find((e: any) => e.id === pick.element);
                                                        return { pick, player, priority: player ? getPlayerUpgradePriority(player) : 999 };
                                                    })
                                                    .sort((a: any, b: any) => {
                                                        // First sort by priority (suspended first, then injured, then available)
                                                        if (a.priority !== b.priority) {
                                                            return a.priority - b.priority;
                                                        }
                                                        // If same priority, sort by position
                                                        return a.pick.position - b.pick.position;
                                                    })
                                                    .map(({ pick, player: currentPlayer }: { pick: any; player: any }) => {
                                                        // currentPlayer is already found in the sort step
                                                        if (!currentPlayer) return null;

                                                        // Find unique upgrade suggestion
                                                        const upgradePlayer = findUpgradeSuggestion(currentPlayer, myTeamPlayerIds, usedUpgradeIds);
                                                        
                                                        if (!upgradePlayer) return null;
                                                        
                                                        // Check if upgrade is financially possible
                                                        const currentPlayerCost = currentPlayer.now_cost / 10;
                                                        const upgradePlayerCost = upgradePlayer.now_cost / 10;
                                                        const costDifference = upgradePlayerCost - currentPlayerCost;
                                                        const isAffordable = costDifference <= bankBalance;
                                                        
                                                        // Mark this upgrade player as used
                                                        usedUpgradeIds.add(upgradePlayer.id);

                                                        const currentTeam = getTeam(currentPlayer.team);
                                                        const upgradeTeam = getTeam(upgradePlayer.team);

                                                        return (
                                                            <div key={`${currentPlayer.id}-${upgradePlayer.id}`} className="relative">
                                                                <UpgradeSplitCard
                                                                    currentPlayer={currentPlayer}
                                                                    upgradePlayer={upgradePlayer}
                                                                    currentTeam={currentTeam}
                                                                    upgradeTeam={upgradeTeam}
                                                                    teams={teams}
                                                                    fixtures={fixtures || []}
                                                                    currentEvent={currentEvent?.id || currentEventId || 1}
                                                                    upgradeSource={upgradeSource}
                                                                    onPlayerClick={(player) => setSelectedPlayer(player)}
                                                                />
                                                                {/* Cost Badge */}
                                                                <div className={`absolute top-2 right-2 z-10 px-2 py-1 rounded-md text-xs font-bold ${
                                                                    isAffordable 
                                                                        ? 'bg-green-500/90 text-white' 
                                                                        : 'bg-red-500/90 text-white'
                                                                }`}>
                                                                    {costDifference >= 0 ? '+' : ''}£{costDifference.toFixed(1)}m
                                                                    {!isAffordable && (
                                                                        <span className="ml-1" title="Not affordable with current bank balance">⚠️</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                    .filter(Boolean);
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Team vs Database Comparison */}
                    {showTeamComparison && (
                        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10 mb-6">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <GitCompare className="w-5 h-5 text-primary" />
                                    Team vs Database Comparison
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">Compare your 15 players against the full database</p>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Search and Filters */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    {/* Search Bar */}
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input
                                            type="text"
                                            placeholder="Search by name..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-10 py-2 bg-card border border-primary/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-white"
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                <XIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    
                                    {/* Team Filter */}
                                    <div className="relative">
                                        <select
                                            value={filterTeam || ''}
                                            onChange={(e) => setFilterTeam(e.target.value ? parseInt(e.target.value) : null)}
                                            className="w-full appearance-none bg-card border border-primary/30 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-white"
                                        >
                                            <option value="">All Teams</option>
                                            {teams?.map((team: any) => (
                                                <option key={team.id} value={team.id}>{team.short_name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground" />
                                    </div>
                                    
                                    {/* Max Price Filter */}
                                    <div className="relative">
                                        <select
                                            value={filterMaxPrice || ''}
                                            onChange={(e) => setFilterMaxPrice(e.target.value ? parseFloat(e.target.value) : null)}
                                            className="w-full appearance-none bg-card border border-primary/30 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-white"
                                        >
                                            <option value="">Max Price: All</option>
                                            <option value="4.0">Max: £4.0m</option>
                                            <option value="5.0">Max: £5.0m</option>
                                            <option value="6.0">Max: £6.0m</option>
                                            <option value="7.0">Max: £7.0m</option>
                                            <option value="8.0">Max: £8.0m</option>
                                            <option value="9.0">Max: £9.0m</option>
                                            <option value="10.0">Max: £10.0m</option>
                                            <option value="12.0">Max: £12.0m</option>
                                            <option value="15.0">Max: £15.0m</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground" />
                                    </div>
                                    
                                    {/* Reset Button */}
                                    <button
                                        onClick={() => {
                                            setSearchQuery('');
                                            setFilterTeam(null);
                                            setFilterMaxPrice(null);
                                        }}
                                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                                    >
                                        <XIcon className="w-4 h-4" />
                                        Reset
                                    </button>
                                </div>
                                
                                {/* Filtered Results Count & Selection Status */}
                                {(() => {
                                    const myTeamPlayerIds = new Set<number>(picks.picks.map((p: any) => p.element as number));
                                    const filteredPlayers = elements.filter((player: any) => {
                                        // Search filter
                                        if (searchQuery) {
                                            const searchLower = searchQuery.toLowerCase();
                                            const matchesSearch = 
                                                player.web_name?.toLowerCase().includes(searchLower) ||
                                                player.first_name?.toLowerCase().includes(searchLower) ||
                                                player.second_name?.toLowerCase().includes(searchLower);
                                            if (!matchesSearch) return false;
                                        }
                                        
                                        // Team filter
                                        if (filterTeam && player.team !== filterTeam) return false;
                                        
                                        // Price filter
                                        if (filterMaxPrice && (player.now_cost / 10) > filterMaxPrice) return false;
                                        
                                        // Show all players (available, injured, suspended, etc.)
                                        // Removed: if (player.status !== 'a') return false;
                                        
                                        return true;
                                    });
                                    
                                    return (
                                        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm text-muted-foreground">
                                                    Showing <span className="font-bold text-white">{filteredPlayers.length}</span> players from database
                                                    {myTeamPlayerIds.size > 0 && ` · Your team: ${myTeamPlayerIds.size} players`}
                                                </p>
                                                {selectedForComparison.length > 0 && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-muted-foreground">
                                                            {selectedForComparison.length}/2 selected
                                                        </span>
                                                        <button
                                                            onClick={() => setSelectedForComparison([])}
                                                            className="text-xs text-orange-400 hover:text-orange-300 underline"
                                                        >
                                                            Clear
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                                
                                {/* Compare Selected Players Button */}
                                {selectedForComparison.length === 2 && (
                                    <div className="flex justify-center">
                                        <button
                                            onClick={() => setShowComparisonModal(true)}
                                            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-lg shadow-lg hover:from-orange-600 hover:to-orange-700 transition-all flex items-center gap-2"
                                        >
                                            <GitCompare className="w-5 h-5" />
                                            Compare Selected Players (1v1)
                                        </button>
                                    </div>
                                )}
                                
                                {/* Comparison Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
                                    {(() => {
                                        const myTeamPlayerIds = new Set<number>(picks.picks.map((p: any) => p.element as number));
                                        const filteredPlayers = elements
                                            .filter((player: any) => {
                                                // Search filter
                                                if (searchQuery) {
                                                    const searchLower = searchQuery.toLowerCase();
                                                    const matchesSearch = 
                                                        player.web_name?.toLowerCase().includes(searchLower) ||
                                                        player.first_name?.toLowerCase().includes(searchLower) ||
                                                        player.second_name?.toLowerCase().includes(searchLower);
                                                    if (!matchesSearch) return false;
                                                }
                                                
                                                // Team filter
                                                if (filterTeam && player.team !== filterTeam) return false;
                                                
                                                // Price filter
                                                if (filterMaxPrice && (player.now_cost / 10) > filterMaxPrice) return false;
                                                
                                                // Show all players (available, injured, suspended, etc.)
                                                // Removed: if (player.status !== 'a') return false;
                                                
                                                return true;
                                            })
                                            .slice(0, 100); // Limit to 100 for performance
                                        
                                        return filteredPlayers.map((player: any) => {
                                            const playerTeam = getTeam(player.team);
                                            const isInMyTeam = myTeamPlayerIds.has(player.id);
                                            const pick = picks.picks.find((p: any) => p.element === player.id);
                                            const isSelected = selectedForComparison.includes(player.id);
                                            
                                            const handleCardClick = (e: React.MouseEvent) => {
                                                e.stopPropagation();
                                                if (isSelected) {
                                                    // Deselect
                                                    setSelectedForComparison(selectedForComparison.filter(id => id !== player.id));
                                                } else if (selectedForComparison.length < 2) {
                                                    // Select (max 2)
                                                    setSelectedForComparison([...selectedForComparison, player.id]);
                                                } else {
                                                    // Replace first selection if already have 2
                                                    setSelectedForComparison([selectedForComparison[1], player.id]);
                                                }
                                            };
                                            
                                            const handleViewDetails = (e: React.MouseEvent) => {
                                                e.stopPropagation();
                                                setSelectedPlayer(player);
                                            };
                                            
                                            return (
                                                <div
                                                    key={player.id}
                                                    onClick={handleCardClick}
                                                    className={`relative p-3 rounded-lg border-2 cursor-pointer transition-all hover:scale-105 ${
                                                        isSelected
                                                            ? 'bg-blue-500/30 border-blue-500 ring-2 ring-blue-400'
                                                            : isInMyTeam
                                                                ? 'bg-green-500/20 border-green-500/50'
                                                                : 'bg-card border-primary/30 hover:border-primary/50'
                                                    }`}
                                                >
                                                    {isSelected && (
                                                        <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs font-bold rounded-full z-10 flex items-center justify-center w-6 h-6 shadow-lg">
                                                            {selectedForComparison.indexOf(player.id) + 1}
                                                        </div>
                                                    )}
                                                    {isInMyTeam && !isSelected && (
                                                        <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                                                            IN TEAM
                                                        </div>
                                                    )}
                                                    {isInMyTeam && isSelected && (
                                                        <div className="absolute top-2 right-8 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded z-10">
                                                            IN TEAM
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/30 bg-gray-800">
                                                            <img
                                                                src={`https://resources.premierleague.com/premierleague/photos/players/250x250/p${player.code}.png`}
                                                                alt={player.web_name}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    e.currentTarget.style.display = 'none';
                                                                    const div = document.createElement('div');
                                                                    div.className = 'w-full h-full flex items-center justify-center text-lg font-bold text-orange-400 bg-gray-800';
                                                                    div.textContent = player.web_name?.[0] || '?';
                                                                    e.currentTarget.parentElement?.appendChild(div);
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold text-sm truncate">{player.web_name}</p>
                                                            <p className="text-xs text-muted-foreground truncate">{playerTeam?.short_name || 'N/A'}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-xs font-semibold text-orange-400">£{(player.now_cost / 10).toFixed(1)}m</span>
                                                                <span className="text-xs text-muted-foreground">•</span>
                                                                <span className="text-xs font-semibold">{player.total_points} pts</span>
                                                                {pick && (
                                                                    <>
                                                                        <span className="text-xs text-muted-foreground">•</span>
                                                                        <span className="text-xs font-bold text-green-400">Pos: {pick.position}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                            <button
                                                                onClick={handleViewDetails}
                                                                className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
                                                            >
                                                                View Details
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                </div>
            </div>
            {/* Player Comparison Modal */}
            {showComparisonModal && selectedForComparison.length === 2 && (() => {
                const player1 = elements.find((p: any) => p.id === selectedForComparison[0]);
                const player2 = elements.find((p: any) => p.id === selectedForComparison[1]);
                
                if (!player1 || !player2) return null;
                
                const team1 = getTeam(player1.team);
                const team2 = getTeam(player2.team);
                
                return (
                    <PlayerComparisonModal
                        player1={player1}
                        player2={player2}
                        team1={team1}
                        team2={team2}
                        upgradeSource="overall"
                        onPlayerClick={(player) => {
                            setSelectedPlayer(player);
                            setShowComparisonModal(false);
                        }}
                        onClose={() => setShowComparisonModal(false)}
                    />
                );
            })()}

            <PlayerDetailModal
                player={selectedPlayer}
                team={selectedPlayer ? teams?.find((t: any) => t.id === selectedPlayer.team) : null}
                teams={teams || []}
                fixtures={fixtures || []}
                currentEvent={currentEvent?.id || currentEventId || 1}
                onClose={() => setSelectedPlayer(null)}
            />
        </>
    );
}
