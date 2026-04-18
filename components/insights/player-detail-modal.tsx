/**
 * Comprehensive Player Detail Modal
 * Shows ALL FPL/PL metrics + latest news from NewsAPI
 */

import { X, TrendingUp, TrendingDown, Activity, Shield, Target, Zap, Award, AlertCircle, Newspaper, Heart, Clock, Users } from 'lucide-react';
import { PlayerAvatar } from '@/components/player-avatar';
import { Badge } from '@/components/ui/badge';
import { FixtureDifficulty } from './fixture-difficulty';
import { FixtureDetailView } from './fixture-detail-view';
import { PlayerGWGraph } from './player-gw-graph';
import { NewsTicker } from './news-ticker';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PlayerDetailModalProps {
    player: any;
    team: any;
    teams: any[];
    fixtures: any[];
    currentEvent: number;
    onClose: () => void;
}


function getTeamBadgeUrl(teamCode: number): string[] {
    return [
        `https://resources.premierleague.com/premierleague/badges/70/t${teamCode}.png`,
        `https://resources.premierleague.com/premierleague/badges/t${teamCode}.png`,
    ];
}

export function PlayerDetailModal({
    player,
    team,
    teams,
    fixtures,
    currentEvent,
    onClose
}: PlayerDetailModalProps) {

    const [loadRisk, setLoadRisk] = useState<any>(null);

    useEffect(() => {
        if (!player?.id) return;
        let mounted = true;
        const run = async () => {
            try {
                const res = await fetch(`/api/enriched/player/${player.id}`, { cache: 'no-store' as any });
                if (!res.ok) return;
                const data = await res.json();
                if (mounted) {
                    setLoadRisk(data?.facts?.loadRisk || null);
                }
            } catch {
                // ignore
            }
        };
        run();
        return () => { mounted = false; };
    }, [player?.id]);

    if (!player) {
        return null;
    }

    const form = parseFloat(player.form) || 0;
    const ownership = parseFloat(player.selected_by_percent) || 0;
    const price = player.now_cost / 10;
    const ppm = player.now_cost > 0 ? (player.total_points / (player.now_cost / 10)) : 0;
    const priceChange = (player.now_cost - player.cost_change_start) / 10;
    const influenceRank = parseFloat(player.influence_rank) || 0;
    const creativityRank = parseFloat(player.creativity_rank) || 0;
    const threatRank = parseFloat(player.threat_rank) || 0;

    // Team colors matching squad page
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

    const colors = team ? teamColors[team.id] || { primary: 'from-orange-600 to-orange-700', secondary: 'from-white to-gray-100', accent: 'bg-orange-600', text: 'text-white' } : { primary: 'from-orange-600 to-orange-700', secondary: 'from-white to-gray-100', accent: 'bg-orange-600', text: 'text-white' };
    const positionName = ['', 'GKP', 'DEF', 'MID', 'FWD'][player.element_type];
    const badgeUrls = team ? getTeamBadgeUrl(team.code) : [];

    return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto"
                onClick={onClose}
            >
                <div className="min-h-screen p-2 sm:p-4 flex items-start justify-center" onClick={(e) => e.stopPropagation()}>
                    <motion.div
                        initial={{ scale: 0.88, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.88, opacity: 0, y: 20 }}
                        transition={{
                            type: "spring",
                            stiffness: 200,
                            damping: 28,
                            mass: 0.6
                        }}
                        className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-1 shadow-2xl border-2 border-orange-500/50 w-full max-w-6xl my-4 md:my-8 mx-2 md:mx-4"
                    >
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute -top-3 -right-3 w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center shadow-xl z-30 border-2 border-yellow-500/50 hover:border-yellow-500 transition-colors"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>

                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg overflow-hidden border-2 border-gray-300/70">
                        {/* Header with Team Colors */}
                        <div className={`relative bg-gradient-to-br ${colors.primary} ${colors.text} p-6`}>
                            <div className="absolute inset-0 opacity-10">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_60%)]" />
                            </div>

                            <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6">
                                {/* Player Photo */}
                                <div className="relative flex-shrink-0">
                                    <PlayerAvatar
                                        player={{ ...player, id: player.id }}
                                        teamBadgeCode={team?.code}
                                        size="xl"
                                        className="border-4 border-white shadow-2xl bg-gradient-to-br from-white to-gray-100 !border-white"
                                    />
                                    {/* Team Badge */}
                                    {team && badgeUrls.length > 0 && (
                                        <div className={`absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 w-12 h-12 md:w-16 md:h-16 ${colors.accent} rounded-full flex items-center justify-center shadow-xl border-2 md:border-4 border-white/70 overflow-hidden bg-white`}>
                                            <img
                                                src={badgeUrls[0]}
                                                alt={team.short_name}
                                                className="w-10 h-10 md:w-14 md:h-14 object-contain"
                                                onError={(e) => {
                                                    const img = e.currentTarget;
                                                    if (badgeUrls[1] && img.src !== badgeUrls[1]) {
                                                        img.src = badgeUrls[1];
                                                    } else {
                                                        img.style.display = 'none';
                                                        const span = document.createElement('span');
                                                        span.className = 'font-black text-sm text-gray-800';
                                                        span.textContent = team?.short_name?.substring(0, 3).toUpperCase() || '';
                                                        img.parentElement!.appendChild(span);
                                                    }
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Player Info */}
                                <div className="flex-1">
                                    {/* Name Bar with Health Status */}
                                    <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 text-white px-4 py-3 rounded-lg mb-4 border-y-2 border-white/10 relative">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 text-center md:text-left">
                                                <h2 className="text-xl md:text-3xl font-black tracking-wide uppercase mb-1 drop-shadow-lg">{player.web_name}</h2>
                                                <p className="text-sm md:text-lg text-gray-300 font-semibold">{team?.name || 'Unknown Team'}</p>
                                            </div>
                                            {/* Health Status Box */}
                                            {(() => {
                                                // Determine health status from player data
                                                let healthPercent = 100;
                                                let statusText = 'Fit';
                                                
                                                // Check player status first
                                                if (player.status === 's') {
                                                    healthPercent = 0;
                                                    statusText = 'Suspended';
                                                } else if (player.status === 'i') {
                                                    healthPercent = player.chance_of_playing_next_round || 0;
                                                    statusText = 'Injured';
                                                } else if (player.status === 'u') {
                                                    healthPercent = 0;
                                                    statusText = 'Unavailable';
                                                } else if (player.status === 'd') {
                                                    healthPercent = player.chance_of_playing_next_round || 50;
                                                    statusText = 'Doubtful';
                                                } else if (player.status === 'n') {
                                                    healthPercent = 0;
                                                    statusText = 'Not in Squad';
                                                } else if (player.status === 'a') {
                                                    healthPercent = player.chance_of_playing_next_round || 100;
                                                    statusText = healthPercent >= 75 ? 'Fit' : healthPercent >= 50 ? 'Doubtful' : 'Unavailable';
                                                } else {
                                                    healthPercent = player.chance_of_playing_next_round || 100;
                                                    statusText = healthPercent >= 75 ? 'Fit' : healthPercent >= 50 ? 'Doubtful' : 'Unavailable';
                                                }
                                                
                                                const healthPercentFinal = Math.max(0, Math.min(100, healthPercent));
                                                let bgColor, borderColor, textColor;
                                                
                                                // Determine colors based on player status
                                                if (player.status === 's') {
                                                    bgColor = 'bg-gradient-to-br from-red-600 to-red-700';
                                                    borderColor = 'border-red-800';
                                                    textColor = 'text-white';
                                                } else if (player.status === 'i' || healthPercentFinal < 50) {
                                                    bgColor = 'bg-gradient-to-br from-red-500 to-red-600';
                                                    borderColor = 'border-red-700';
                                                    textColor = 'text-white';
                                                } else if (healthPercentFinal >= 75) {
                                                    bgColor = 'bg-gradient-to-br from-green-500 to-green-600';
                                                    borderColor = 'border-green-700';
                                                    textColor = 'text-white';
                                                } else {
                                                    bgColor = 'bg-gradient-to-br from-orange-500 to-orange-600';
                                                    borderColor = 'border-orange-700';
                                                    textColor = 'text-white';
                                                }
                                                
                                                return (
                                                    <div className={`${bgColor} ${borderColor} ${textColor} rounded-lg p-2 md:p-3 border-2 shadow-lg w-full md:min-w-[140px] md:w-auto flex-shrink-0`}>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <Heart className={`w-4 h-4 ${textColor === 'text-white' ? 'text-white' : 'text-gray-800'}`} />
                                                                <span className="text-[9px] font-semibold uppercase tracking-wide opacity-90">Availability</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-center mb-2">
                                                            <p className="text-2xl font-black">{healthPercentFinal}%</p>
                                                        </div>
                                                        <div className="text-center border-t border-white/20 pt-2">
                                                            <p className="text-[9px] font-semibold uppercase tracking-wide opacity-90 mb-0.5">Status</p>
                                                            <p className="text-sm font-black">{statusText}</p>
                                                        </div>
                                                        {player.news && (
                                                            <div className="mt-2 pt-2 border-t border-white/20">
                                                                <p className="text-[8px] font-semibold text-white/90 line-clamp-2">{player.news}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* Position Badge */}
                                    <div className="flex justify-start mb-4">
                                        <div className={`bg-gradient-to-r ${colors.primary} text-white px-5 py-2 text-sm font-bold shadow-md rounded-lg`}>
                                            {positionName}
                                        </div>
                                    </div>

                                    {/* Key Stats Grid */}
                                    <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                                        <div className="bg-gradient-to-br from-green-100 to-green-50 rounded-xl p-2 md:p-3 text-center border-2 border-green-500 shadow-sm">
                                            <p className="text-[9px] md:text-[10px] text-gray-800 font-bold uppercase mb-1">Points</p>
                                            <p className="text-lg md:text-xl font-black text-gray-900">{player.total_points}</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl p-2 md:p-3 text-center border-2 border-orange-500 shadow-sm">
                                            <p className="text-[9px] md:text-[10px] text-gray-800 font-bold uppercase mb-1">Price</p>
                                            <p className="text-base md:text-lg font-black text-gray-900">£{price.toFixed(1)}m</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl p-2 md:p-3 text-center border-2 border-orange-500 shadow-sm">
                                            <p className="text-[9px] md:text-[10px] text-gray-800 font-bold uppercase mb-1">Form</p>
                                            <p className="text-lg md:text-xl font-black text-orange-700">{form.toFixed(1)}</p>
                                        </div>
                                        {(() => {
                                            // Calculate next game expected points
                                            const nextFixture = fixtures
                                                .filter((f: any) => {
                                                    const isTeamInFixture = f.team_h === (team?.id || player.team) || f.team_a === (team?.id || player.team);
                                                    return isTeamInFixture && f.event >= currentEvent;
                                                })
                                                .sort((a: any, b: any) => a.event - b.event)[0];
                                            
                                            let nextGameExpected = parseFloat(player.ep_next) || 0;
                                            if (nextFixture) {
                                                const isHome = nextFixture.team_h === (team?.id || player.team);
                                                const difficulty = isHome ? nextFixture.team_h_difficulty : nextFixture.team_a_difficulty;
                                                const basePoints = nextGameExpected || form || 0;
                                                let multiplier = 1.0;
                                                if (difficulty <= 2) multiplier = 1.2;
                                                else if (difficulty === 3) multiplier = 1.0;
                                                else if (difficulty === 4) multiplier = 0.85;
                                                else if (difficulty === 5) multiplier = 0.7;
                                                if (isHome) multiplier *= 1.1;
                                                nextGameExpected = Math.max(0, basePoints * multiplier);
                                            }
                                            
                                            return (
                                                <div className="bg-gradient-to-br from-cyan-100 to-cyan-50 rounded-xl p-2 md:p-3 text-center border-2 border-cyan-500 shadow-sm">
                                                    <p className="text-[9px] md:text-[10px] text-gray-800 font-bold uppercase mb-1">Next GW</p>
                                                    <p className="text-lg md:text-xl font-black text-cyan-700">{nextGameExpected.toFixed(1)}</p>
                                                </div>
                                            );
                                        })()}
                                        <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl p-2 md:p-3 text-center border-2 border-blue-500 shadow-sm">
                                            <p className="text-[9px] md:text-[10px] text-gray-800 font-bold uppercase mb-1">Own</p>
                                            <p className="text-base md:text-lg font-black text-gray-900">{ownership.toFixed(1)}%</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Content Grid */}
                        <div className="p-4 md:p-6 grid lg:grid-cols-3 gap-4 md:gap-6 bg-white">
                        {/* Left Column - Core Stats */}
                        <div className="lg:col-span-2 space-y-4 md:space-y-6">
                            {/* Primary Metrics */}
                            <div>
                                <h3 className="text-base md:text-lg font-bold mb-3 md:mb-4 flex items-center gap-2 text-gray-900 bg-gray-100 px-2 md:px-3 py-1.5 md:py-2 rounded-lg border border-gray-300">
                                    <Activity className="w-4 h-4 md:w-5 md:h-5 text-caution" />
                                    Primary Metrics
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                                    <MetricCard label="Form" value={form.toFixed(1)} color="primary" />
                                    <MetricCard label="Points" value={player.total_points} color="green" />
                                    <MetricCard label="Price" value={`£${price.toFixed(1)}m`} color="orange" />
                                    <MetricCard label="PPM" value={ppm.toFixed(1)} color="cyan" />
                                    <MetricCard label="Bonus" value={player.bonus || 0} color="yellow" />
                                    <MetricCard label="BPS" value={player.bps || 0} color="orange" />
                                    <MetricCard label="Minutes" value={player.minutes || 0} color="blue" />
                                    <MetricCard label="Next xPts" value={parseFloat(player.ep_next || 0).toFixed(1)} color="cyan" />
                                </div>
                            </div>

                            {/* Performance Stats */}
                            <div>
                                <h3 className="text-base md:text-lg font-bold mb-3 md:mb-4 flex items-center gap-2 text-gray-900 bg-gray-100 px-2 md:px-3 py-1.5 md:py-2 rounded-lg border border-gray-300">
                                    <Target className="w-4 h-4 md:w-5 md:h-5 text-positive" />
                                    Performance Stats
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                                    <MetricCard label="Goals" value={player.goals_scored || 0} color="green" icon={Target} />
                                    <MetricCard label="Assists" value={player.assists || 0} color="blue" />
                                    <MetricCard label="Clean Sheets" value={player.clean_sheets || 0} color="cyan" icon={Shield} />
                                    <MetricCard label="Goals Conceded" value={player.goals_conceded || 0} color="red" />
                                    <MetricCard label="Own Goals" value={player.own_goals || 0} color="red" />
                                    <MetricCard label="Penalties Saved" value={player.penalties_saved || 0} color="green" />
                                    <MetricCard label="Penalties Missed" value={player.penalties_missed || 0} color="red" />
                                    <MetricCard label="Yellow Cards" value={player.yellow_cards || 0} color="yellow" />
                                    <MetricCard label="Red Cards" value={player.red_cards || 0} color="red" />
                                    <MetricCard label="Saves" value={player.saves || 0} color="cyan" />
                                </div>
                            </div>

                            {/* ICT Index Breakdown */}
                            <div>
                                <h3 className="text-base md:text-lg font-bold mb-3 md:mb-4 flex items-center gap-2 text-gray-900 bg-gray-100 px-2 md:px-3 py-1.5 md:py-2 rounded-lg border border-gray-300">
                                    <Award className="w-4 h-4 md:w-5 md:h-5 text-caution" />
                                    ICT Index Breakdown
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                                    <MetricCard label="ICT Index" value={parseFloat(player.ict_index || 0).toFixed(1)} color="orange" />
                                    <MetricCard label="Influence" value={parseFloat(player.influence || 0).toFixed(1)} color="orange-dark" />
                                    <MetricCard label="Creativity" value={parseFloat(player.creativity || 0).toFixed(1)} color="cyan" />
                                    <MetricCard label="Threat" value={parseFloat(player.threat || 0).toFixed(1)} color="red" />
                                    <MetricCard label="Influence Rank" value={`#${influenceRank || 'N/A'}`} color="orange-dark" small />
                                    <MetricCard label="Creativity Rank" value={`#${creativityRank || 'N/A'}`} color="cyan" small />
                                    <MetricCard label="Threat Rank" value={`#${threatRank || 'N/A'}`} color="red" small />
                                    <MetricCard label="ICT Rank" value={`#${player.ict_index_rank || 'N/A'}`} color="orange" small />
                                </div>
                            </div>

                            {/* Expected Stats (xG, xA) */}
                            <div>
                                <h3 className="text-base md:text-lg font-bold mb-3 md:mb-4 flex items-center gap-2 text-gray-900 bg-gray-100 px-2 md:px-3 py-1.5 md:py-2 rounded-lg border border-gray-300">
                                    <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-cyan-600" />
                                    Expected Stats
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                                    <MetricCard label="xG (Expected Goals)" value={parseFloat(player.expected_goals || 0).toFixed(2)} color="green" />
                                    <MetricCard label="xA (Expected Assists)" value={parseFloat(player.expected_assists || 0).toFixed(2)} color="blue" />
                                    <MetricCard label="xGI (xG + xA)" value={parseFloat(player.expected_goal_involvements || 0).toFixed(2)} color="cyan" />
                                    <MetricCard label="xGC (Expected Goals Conceded)" value={parseFloat(player.expected_goals_conceded || 0).toFixed(2)} color="red" />
                                </div>
                            </div>

                            {/* Price & Transfers */}
                            <div>
                                <h3 className="text-base md:text-lg font-bold mb-3 md:mb-4 flex items-center gap-2 text-gray-900 bg-gray-100 px-2 md:px-3 py-1.5 md:py-2 rounded-lg border border-gray-300">
                                    <Users className="w-4 h-4 md:w-5 md:h-5 text-info" />
                                    Price & Transfers
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                                    <MetricCard label="Price Change" value={`${priceChange >= 0 ? '+' : ''}£${priceChange.toFixed(1)}m`} color={priceChange >= 0 ? 'green' : 'red'} icon={priceChange >= 0 ? TrendingUp : TrendingDown} />
                                    <MetricCard label="Transfers In" value={(player.transfers_in || 0).toLocaleString()} color="green" />
                                    <MetricCard label="Transfers Out" value={(player.transfers_out || 0).toLocaleString()} color="red" />
                                    <MetricCard label="Net Transfers" value={((player.transfers_in || 0) - (player.transfers_out || 0)).toLocaleString()} color="cyan" />
                                    <MetricCard label="Transfers In (GW)" value={(player.transfers_in_event || 0).toLocaleString()} color="green" small />
                                    <MetricCard label="Transfers Out (GW)" value={(player.transfers_out_event || 0).toLocaleString()} color="red" small />
                                    <MetricCard label="Selected By" value={`${ownership.toFixed(1)}%`} color="blue" />
                                    <MetricCard label="Points/Game" value={(player.points_per_game || 0)} color="cyan" />
                                </div>
                            </div>

                            {/* Gameweek Points Graph */}
                            <PlayerGWGraph playerId={player.id} />
                        </div>

                        {/* Right Column - Fixtures & Analytics */}
                        <div className="space-y-4 md:space-y-6">
                            {/* Fixtures */}
                            <div>
                                <h3 className="text-base md:text-lg font-bold mb-3 md:mb-4 flex items-center gap-2 text-gray-900 bg-gray-100 px-2 md:px-3 py-1.5 md:py-2 rounded-lg border border-gray-300">
                                    <Clock className="w-4 h-4 md:w-5 md:h-5 text-caution" />
                                    <span className="text-xs md:text-base">Next 10 Fixtures</span>
                                </h3>
                                <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200 shadow-sm">
                                    <FixtureDetailView
                                        teamId={team?.id || player.team}
                                        fixtures={fixtures}
                                        teams={teams}
                                        currentEvent={currentEvent}
                                        player={player}
                                    />
                                </div>
                            </div>

                            {/* Load Risk - Fixture Congestion */}
                            <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200 shadow-sm">
                                <div className="flex items-center justify-between gap-3 mb-2">
                                    <div className="flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-purple-600" />
                                        <p className="font-bold text-gray-900">Load risk</p>
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className={
                                            loadRisk?.level === 'high'
                                                ? 'bg-red-100 text-red-800 border-red-300'
                                                : loadRisk?.level === 'medium'
                                                    ? 'bg-orange-100 text-orange-800 border-orange-300'
                                                    : 'bg-green-100 text-green-800 border-green-300'
                                        }
                                    >
                                        {(loadRisk?.level || 'low').toString().toUpperCase()}
                                    </Badge>
                                </div>

                                {loadRisk ? (
                                    <>
                                        <p className="text-xs text-gray-700 font-semibold">
                                            {loadRisk.reason}
                                        </p>
                                        <p className="text-[10px] text-gray-500 mt-1">
                                            Source: {loadRisk?.provenance?.provider || 'football-data.org'} · Window: {loadRisk.windowDays}d · Team ID: {loadRisk?.provenance?.teamId}
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-xs text-gray-500">
                                        Load risk unavailable (configure `FOOTBALL_DATA_API_KEY` to enable cross-competition schedule ingestion).
                                    </p>
                                )}
                            </div>

                            {/* Health Meter - Colored Box Display */}
                            <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200 shadow-sm">
                                <div className="flex items-center gap-2 mb-3">
                                    <Heart className={`w-5 h-5 ${(player.chance_of_playing_next_round || 100) >= 75 ? 'text-positive' : (player.chance_of_playing_next_round || 100) >= 50 ? 'text-caution' : 'text-negative'}`} />
                                    <p className="font-bold text-gray-900">Fitness Status</p>
                                </div>

                                {/* Health Percentage Box with Color Shading */}
                                {(() => {
                                    // Determine health status from player data
                                    let healthPercent = 100;
                                    let statusText = 'Fit';
                                    
                                    // Check player status first
                                    if (player.status === 's') {
                                        healthPercent = 0;
                                        statusText = 'Suspended';
                                    } else if (player.status === 'i') {
                                        healthPercent = player.chance_of_playing_next_round || 0;
                                        statusText = 'Injured';
                                    } else if (player.status === 'u') {
                                        healthPercent = 0;
                                        statusText = 'Unavailable';
                                    } else if (player.status === 'd') {
                                        healthPercent = player.chance_of_playing_next_round || 50;
                                        statusText = 'Doubtful';
                                    } else if (player.status === 'n') {
                                        healthPercent = 0;
                                        statusText = 'Not in Squad';
                                    } else if (player.status === 'a') {
                                        // Available - use chance_of_playing_next_round if provided
                                        healthPercent = player.chance_of_playing_next_round || 100;
                                        statusText = healthPercent >= 75 ? 'Fit' : healthPercent >= 50 ? 'Doubtful' : 'Unavailable';
                                    } else {
                                        // Fallback to chance_of_playing_next_round
                                        healthPercent = player.chance_of_playing_next_round || 100;
                                        statusText = healthPercent >= 75 ? 'Fit' : healthPercent >= 50 ? 'Doubtful' : 'Unavailable';
                                    }
                                    
                                    const healthPercentFinal = Math.max(0, Math.min(100, healthPercent));
                                    let bgColor, borderColor, textColor, iconColor;
                                    
                                    // Determine colors based on player status (statusText already set above)
                                    if (player.status === 's') {
                                        // Suspended - Dark Red shades
                                        bgColor = 'bg-gradient-to-br from-red-600 to-red-700';
                                        borderColor = 'border-red-800';
                                        textColor = 'text-white';
                                        iconColor = 'text-red-100';
                                    } else if (player.status === 'i' || healthPercentFinal < 50) {
                                        // Injured/Unavailable - Red shades
                                        bgColor = 'bg-gradient-to-br from-red-500 to-red-600';
                                        borderColor = 'border-red-700';
                                        textColor = 'text-white';
                                        iconColor = 'text-red-100';
                                    } else if (healthPercentFinal >= 75) {
                                        // Healthy - Green shades
                                        bgColor = 'bg-gradient-to-br from-green-500 to-green-600';
                                        borderColor = 'border-green-700';
                                        textColor = 'text-white';
                                        iconColor = 'text-green-100';
                                    } else {
                                        // Doubtful - Orange shades
                                        bgColor = 'bg-gradient-to-br from-orange-500 to-orange-600';
                                        borderColor = 'border-orange-700';
                                        textColor = 'text-white';
                                        iconColor = 'text-orange-100';
                                    }
                                    
                                    return (
                                        <>
                                            <div className={`${bgColor} ${borderColor} ${textColor} rounded-xl p-5 border-3 shadow-lg mb-3`}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-12 h-12 rounded-full ${iconColor} bg-white/20 flex items-center justify-center backdrop-blur-sm`}>
                                                            <Heart className="w-6 h-6 fill-current" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-semibold opacity-90 uppercase tracking-wide">Availability</p>
                                                            <p className="text-3xl font-black mt-1">{healthPercentFinal}%</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-semibold opacity-90 uppercase tracking-wide mb-1">Status</p>
                                                        <p className="text-lg font-black">{statusText}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Progress Indicator */}
                                            <div className="mb-3">
                                                <div className="w-full h-2 bg-gray-300 rounded-full overflow-hidden border border-gray-400 shadow-inner">
                                                    <div
                                                        className={`h-full transition-all duration-500 ${
                                                            healthPercentFinal >= 75 ? 'bg-green-600' :
                                                            healthPercentFinal >= 50 ? 'bg-orange-500' :
                                                            'bg-red-600'
                                                        }`}
                                                        style={{ width: `${healthPercentFinal}%` }}
                                                    />
                                                </div>
                                                <div className="flex justify-between text-[9px] text-gray-700 font-semibold mt-1">
                                                    <span>0%</span>
                                                    <span>50%</span>
                                                    <span>100%</span>
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()}

                                {player.news && (
                                    <div className="bg-orange-100 border-2 border-orange-400 rounded-lg p-3 flex items-start gap-2 shadow-sm">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-caution" />
                                        <p className="text-xs font-semibold text-gray-900">{player.news}</p>
                                    </div>
                                )}
                            </div>

                            {/* Performance Distribution Pie Chart */}
                            <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200 shadow-sm">
                                <h4 className="font-bold mb-3 text-sm text-gray-900">Contribution Breakdown</h4>
                                <div className="flex items-center justify-center mb-3">
                                    {/* Simple CSS Pie Chart */}
                                    <div className="relative w-32 h-32">
                                        <svg viewBox="0 0 100 100" className="transform -rotate-90">
                                            {(() => {
                                                const goals = player.goals_scored || 0;
                                                const assists = player.assists || 0;
                                                const bonus = player.bonus || 0;
                                                const total = goals + assists + bonus || 1;

                                                const goalsPercent = (goals / total) * 100;
                                                const assistsPercent = (assists / total) * 100;
                                                const bonusPercent = (bonus / total) * 100;

                                                let currentOffset = 0;

                                                return (
                                                    <>
                                                        {/* Goals segment */}
                                                        <circle
                                                            cx="50" cy="50" r="40"
                                                            fill="none"
                                                            stroke="oklch(0.53 0.24 350)" strokeWidth="20"
                                                            strokeDasharray={`${goalsPercent * 2.51} 251`}
                                                            strokeDashoffset={currentOffset}
                                                        />
                                                        {/* Assists segment */}
                                                        <circle
                                                            cx="50" cy="50" r="40"
                                                            fill="none"
                                                            stroke="oklch(0.65 0.12 180)" strokeWidth="20"
                                                            strokeDasharray={`${assistsPercent * 2.51} 251`}
                                                            strokeDashoffset={currentOffset - (goalsPercent * 2.51)}
                                                        />
                                                        {/* Bonus segment */}
                                                        <circle
                                                            cx="50" cy="50" r="40"
                                                            fill="none"
                                                            stroke="oklch(0.55 0.22 285)" strokeWidth="20"
                                                            strokeDasharray={`${bonusPercent * 2.51} 251`}
                                                            strokeDashoffset={currentOffset - ((goalsPercent + assistsPercent) * 2.51)}
                                                        />
                                                    </>
                                                );
                                            })()}
                                        </svg>
                                    </div>
                                </div>
                                <div className="space-y-2 text-xs">
                                    <div className="flex items-center justify-between bg-white px-2 py-1.5 rounded border border-gray-200">
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 rounded-full border-2 border-gray-300" style={{ background: 'oklch(0.53 0.24 350)' }} />
                                            <span className="font-bold text-gray-900">Goals</span>
                                        </div>
                                        <span className="font-black text-gray-900">{player.goals_scored || 0}</span>
                                    </div>
                                    <div className="flex items-center justify-between bg-white px-2 py-1.5 rounded border border-gray-200">
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 rounded-full border-2 border-gray-300" style={{ background: 'oklch(0.65 0.12 180)' }} />
                                            <span className="font-bold text-gray-900">Assists</span>
                                        </div>
                                        <span className="font-black text-gray-900">{player.assists || 0}</span>
                                    </div>
                                    <div className="flex items-center justify-between bg-white px-2 py-1.5 rounded border border-gray-200">
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 rounded-full border-2 border-gray-300" style={{ background: 'oklch(0.55 0.22 285)' }} />
                                            <span className="font-bold text-gray-900">Bonus</span>
                                        </div>
                                        <span className="font-black text-gray-900">{player.bonus || 0}</span>
                                    </div>
                                </div>
                            </div>

                            {/* ICT Index Bar Chart */}
                            <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200 shadow-sm">
                                <h4 className="font-bold mb-3 text-sm text-gray-900">ICT Index Breakdown</h4>
                                <div className="space-y-3">
                                    {/* Influence */}
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="font-bold text-gray-800">Influence</span>
                                            <span className="font-black text-gray-900">{parseFloat(player.influence || 0).toFixed(1)}</span>
                                        </div>
                                        <div className="w-full h-4 bg-gray-300 rounded-full overflow-hidden border border-gray-400 shadow-inner">
                                            <div
                                                className="h-full bg-orange-600"
                                                style={{ width: `${Math.min((parseFloat(player.influence || 0) / 100) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                    {/* Creativity */}
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="font-bold text-gray-800">Creativity</span>
                                            <span className="font-black text-gray-900">{parseFloat(player.creativity || 0).toFixed(1)}</span>
                                        </div>
                                        <div className="w-full h-4 bg-gray-300 rounded-full overflow-hidden border border-gray-400 shadow-inner">
                                            <div
                                                className="h-full bg-green-600"
                                                style={{ width: `${Math.min((parseFloat(player.creativity || 0) / 100) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                    {/* Threat */}
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="font-bold text-gray-800">Threat</span>
                                            <span className="font-black text-gray-900">{parseFloat(player.threat || 0).toFixed(1)}</span>
                                        </div>
                                        <div className="w-full h-4 bg-gray-300 rounded-full overflow-hidden border border-gray-400 shadow-inner">
                                            <div
                                                className="h-full bg-orange-500"
                                                style={{ width: `${Math.min((parseFloat(player.threat || 0) / 100) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* News Ticker */}
                            <div>
                                <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-gray-900 bg-gray-100 px-3 py-2 rounded-lg border border-gray-300">
                                    <Newspaper className="w-5 h-5 text-caution" />
                                    News & Health Updates
                                </h3>
                                <NewsTicker player={player} team={team} />
                            </div>
                        </div>
                        </div>

                        {/* Bottom Bar */}
                        <div className={`bg-gradient-to-r ${colors.primary} px-6 py-4 flex items-center justify-between ${colors.text} rounded-b-lg`}>
                            <span className="text-sm opacity-90 font-semibold">Player ID: #{player.id}</span>
                            <span className="text-sm font-bold">Premier League 24/25</span>
                        </div>
                    </div>
                    </motion.div>
                </div>
            </motion.div>
    );
}

// Helper component for metric cards with gradient styling and improved contrast
function MetricCard({ label, value, color, icon: Icon, small = false }: any) {
    const colorClasses: Record<string, string> = {
        primary: 'bg-gradient-to-br from-orange-100 to-orange-50 text-orange-700 border-2 border-orange-500 shadow-sm',
        green: 'bg-gradient-to-br from-green-100 to-green-50 text-gray-900 border-2 border-green-500 shadow-sm',
        orange: 'bg-gradient-to-br from-orange-100 to-orange-50 text-gray-900 border-2 border-orange-500 shadow-sm',
        'orange-dark': 'bg-gradient-to-br from-orange-200 to-orange-100 text-orange-800 border-2 border-orange-600 shadow-sm',
        cyan: 'bg-gradient-to-br from-cyan-100 to-cyan-50 text-cyan-700 border-2 border-cyan-500 shadow-sm',
        blue: 'bg-gradient-to-br from-blue-100 to-blue-50 text-gray-900 border-2 border-blue-500 shadow-sm',
        yellow: 'bg-gradient-to-br from-yellow-100 to-yellow-50 text-gray-900 border-2 border-yellow-500 shadow-sm',
        red: 'bg-gradient-to-br from-red-100 to-red-50 text-red-700 border-2 border-red-500 shadow-sm',
    };

    return (
        <div className={`text-center p-2 md:p-3 rounded-xl ${colorClasses[color as string] || colorClasses.primary}`}>
            {Icon && <Icon className="w-3 h-3 md:w-4 md:h-4 mx-auto mb-0.5 md:mb-1 text-gray-700" />}
            <p className={`${small ? 'text-[8px] md:text-[9px]' : 'text-[9px] md:text-[10px]'} text-gray-800 font-bold uppercase mb-0.5 md:mb-1`}>{label}</p>
            <p className={`font-black text-gray-900 ${small ? 'text-[10px] md:text-xs' : 'text-xs md:text-sm'}`}>{value}</p>
        </div>
    );
}
