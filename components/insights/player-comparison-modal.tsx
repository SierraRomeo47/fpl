'use client';

import { X, TrendingUp, TrendingDown, Target, Shield, Zap, Award, Activity, Trophy, Eye, ArrowRight, Cross, Ban } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPlayerPhotoUrls, getTeamBadgeUrl, getPlayerInitials } from '@/lib/player-photo-utils';
import { useState } from 'react';

interface PlayerComparisonModalProps {
    player1: any;
    player2: any;
    team1: any;
    team2: any;
    upgradeSource?: string;
    onPlayerClick?: (player: any) => void;
    onClose: () => void;
}

export function PlayerComparisonModal({
    player1,
    player2,
    team1,
    team2,
    upgradeSource = 'form',
    onPlayerClick,
    onClose
}: PlayerComparisonModalProps) {
    const [photo1Index, setPhoto1Index] = useState(0);
    const [photo2Index, setPhoto2Index] = useState(0);
    const [photo1Failed, setPhoto1Failed] = useState(false);
    const [photo2Failed, setPhoto2Failed] = useState(false);

    const photo1Urls = getPlayerPhotoUrls({
        code: player1.code,
        photo: player1.photo,
        web_name: player1.web_name,
        team: player1.team
    });
    const photo2Urls = getPlayerPhotoUrls({
        code: player2.code,
        photo: player2.photo,
        web_name: player2.web_name,
        team: player2.team
    });

    // Team colors with text color support
    const teamColors: Record<number, { primary: string, accent: string, text: string, buttonBg: string, buttonText: string }> = {
        1: { primary: 'from-red-600 to-red-700', accent: 'bg-red-600', text: 'text-white', buttonBg: 'bg-white/30', buttonText: 'text-white' },
        2: { primary: 'from-orange-700 to-orange-900', accent: 'bg-orange-700', text: 'text-white', buttonBg: 'bg-white/30', buttonText: 'text-white' },
        3: { primary: 'from-blue-500 to-blue-600', accent: 'bg-blue-500', text: 'text-white', buttonBg: 'bg-white/30', buttonText: 'text-white' },
        4: { primary: 'from-red-500 to-red-600', accent: 'bg-red-500', text: 'text-white', buttonBg: 'bg-white/30', buttonText: 'text-white' },
        5: { primary: 'from-blue-600 to-blue-700', accent: 'bg-blue-600', text: 'text-white', buttonBg: 'bg-white/30', buttonText: 'text-white' },
        6: { primary: 'from-blue-600 to-blue-800', accent: 'bg-blue-700', text: 'text-white', buttonBg: 'bg-white/30', buttonText: 'text-white' },
        7: { primary: 'from-blue-700 to-blue-900', accent: 'bg-blue-800', text: 'text-white', buttonBg: 'bg-white/30', buttonText: 'text-white' },
        8: { primary: 'from-white to-gray-100', accent: 'bg-gray-800', text: 'text-gray-900', buttonBg: 'bg-gray-800/90', buttonText: 'text-white' },
        9: { primary: 'from-blue-600 to-blue-800', accent: 'bg-blue-700', text: 'text-white', buttonBg: 'bg-white/30', buttonText: 'text-white' },
        10: { primary: 'from-red-600 to-red-700', accent: 'bg-red-600', text: 'text-white', buttonBg: 'bg-white/30', buttonText: 'text-white' },
        11: { primary: 'from-sky-400 to-sky-500', accent: 'bg-sky-400', text: 'text-white', buttonBg: 'bg-white/30', buttonText: 'text-white' },
        12: { primary: 'from-red-700 to-red-800', accent: 'bg-red-700', text: 'text-white', buttonBg: 'bg-white/30', buttonText: 'text-white' },
        13: { primary: 'from-black to-gray-900', accent: 'bg-black', text: 'text-white', buttonBg: 'bg-white/30', buttonText: 'text-white' },
        14: { primary: 'from-red-600 to-red-700', accent: 'bg-red-600', text: 'text-white', buttonBg: 'bg-white/30', buttonText: 'text-white' },
        15: { primary: 'from-red-600 to-red-800', accent: 'bg-red-700', text: 'text-white', buttonBg: 'bg-white/40', buttonText: 'text-white' },
        16: { primary: 'from-white to-gray-100', accent: 'bg-blue-900', text: 'text-gray-900', buttonBg: 'bg-blue-900/90', buttonText: 'text-white' },
        17: { primary: 'from-amber-700 to-amber-800', accent: 'bg-amber-700', text: 'text-white', buttonBg: 'bg-white/30', buttonText: 'text-white' },
        18: { primary: 'from-orange-500 to-orange-600', accent: 'bg-orange-500', text: 'text-white', buttonBg: 'bg-white/30', buttonText: 'text-white' },
        19: { primary: 'from-red-600 to-red-700', accent: 'bg-red-600', text: 'text-white', buttonBg: 'bg-white/30', buttonText: 'text-white' },
        20: { primary: 'from-blue-600 to-blue-800', accent: 'bg-blue-700', text: 'text-white', buttonBg: 'bg-white/30', buttonText: 'text-white' },
    };

    const colors1 = team1 ? teamColors[team1.id] || { primary: 'from-orange-500 to-orange-600', accent: 'bg-orange-500', text: 'text-white', buttonBg: 'bg-white/30', buttonText: 'text-white' } : { primary: 'from-orange-500 to-orange-600', accent: 'bg-orange-500', text: 'text-white', buttonBg: 'bg-white/30', buttonText: 'text-white' };
    const colors2 = team2 ? teamColors[team2.id] || { primary: 'from-orange-500 to-orange-600', accent: 'bg-orange-500', text: 'text-white', buttonBg: 'bg-white/30', buttonText: 'text-white' } : { primary: 'from-orange-500 to-orange-600', accent: 'bg-orange-500', text: 'text-white', buttonBg: 'bg-white/30', buttonText: 'text-white' };

    // Check player status for injuries and suspensions
    const player1IsSuspended = player1.status === 's' || (player1.news && player1.news.toLowerCase().includes('suspended'));
    const player1IsInjured = player1.status === 'i' || (player1.news && (player1.news.toLowerCase().includes('injured') || player1.news.toLowerCase().includes('injury')));
    const player2IsSuspended = player2.status === 's' || (player2.news && player2.news.toLowerCase().includes('suspended'));
    const player2IsInjured = player2.status === 'i' || (player2.news && (player2.news.toLowerCase().includes('injured') || player2.news.toLowerCase().includes('injury')));

    // Determine injury severity for player 1
    let player1InjurySeverity: 'mild' | 'moderate' | 'severe' = 'mild';
    if (player1IsInjured) {
        const chance = player1.chance_of_playing_next_round || 100;
        if (chance <= 25) player1InjurySeverity = 'severe';
        else if (chance <= 50) player1InjurySeverity = 'moderate';
        else player1InjurySeverity = 'mild';
    }

    // Determine injury severity for player 2
    let player2InjurySeverity: 'mild' | 'moderate' | 'severe' = 'mild';
    if (player2IsInjured) {
        const chance = player2.chance_of_playing_next_round || 100;
        if (chance <= 25) player2InjurySeverity = 'severe';
        else if (chance <= 50) player2InjurySeverity = 'moderate';
        else player2InjurySeverity = 'mild';
    }

    // Get metrics based on upgradeSource - prioritize the selected filter metric
    const getMetrics = () => {
        const allMetrics = [
            {
                label: 'Total Points',
                icon: Trophy,
                value1: player1.total_points || 0,
                value2: player2.total_points || 0,
                higherBetter: true,
                key: 'total_points'
            },
            {
                label: 'Form',
                icon: TrendingUp,
                value1: parseFloat(player1.form) || 0,
                value2: parseFloat(player2.form) || 0,
                higherBetter: true,
                key: 'form'
            },
            {
                label: 'Price',
                icon: Award,
                value1: (player1.now_cost / 10).toFixed(1),
                value2: (player2.now_cost / 10).toFixed(1),
                higherBetter: false,
                suffix: 'm',
                key: 'price'
            },
            {
                label: 'GW Points',
                icon: Activity,
                value1: player1.event_points || 0,
                value2: player2.event_points || 0,
                higherBetter: true,
                key: 'gw_points'
            },
            {
                label: 'Expected Points',
                icon: Zap,
                value1: parseFloat(player1.ep_next) || 0,
                value2: parseFloat(player2.ep_next) || 0,
                higherBetter: true,
                key: 'expected'
            },
            {
                label: 'Points per Game',
                icon: TrendingUp,
                value1: parseFloat(player1.points_per_game) || 0,
                value2: parseFloat(player2.points_per_game) || 0,
                higherBetter: true,
                key: 'points_per_game'
            },
            {
                label: 'Value (Pts/£m)',
                icon: Award,
                value1: player1.now_cost > 0 ? ((player1.total_points / (player1.now_cost / 10)).toFixed(1)) : '0.0',
                value2: player2.now_cost > 0 ? ((player2.total_points / (player2.now_cost / 10)).toFixed(1)) : '0.0',
                higherBetter: true,
                key: 'value'
            },
            {
                label: 'ICT Index',
                icon: Zap,
                value1: parseFloat(player1.ict_index) || 0,
                value2: parseFloat(player2.ict_index) || 0,
                higherBetter: true,
                key: 'ict'
            },
            {
                label: 'Influence',
                icon: Zap,
                value1: parseFloat(player1.influence) || 0,
                value2: parseFloat(player2.influence) || 0,
                higherBetter: true,
                key: 'influence'
            },
            {
                label: 'Creativity',
                icon: Zap,
                value1: parseFloat(player1.creativity) || 0,
                value2: parseFloat(player2.creativity) || 0,
                higherBetter: true,
                key: 'creativity'
            },
            {
                label: 'Threat',
                icon: Zap,
                value1: parseFloat(player1.threat) || 0,
                value2: parseFloat(player2.threat) || 0,
                higherBetter: true,
                key: 'threat'
            },
            {
                label: 'Goals',
                icon: Target,
                value1: player1.goals_scored || 0,
                value2: player2.goals_scored || 0,
                higherBetter: true,
                key: 'goals'
            },
            {
                label: 'Assists',
                icon: Award,
                value1: player1.assists || 0,
                value2: player2.assists || 0,
                higherBetter: true,
                key: 'assists'
            },
            {
                label: 'Clean Sheets',
                icon: Shield,
                value1: player1.clean_sheets || 0,
                value2: player2.clean_sheets || 0,
                higherBetter: true,
                key: 'clean_sheets'
            },
            {
                label: 'Saves',
                icon: Shield,
                value1: player1.saves || 0,
                value2: player2.saves || 0,
                higherBetter: true,
                key: 'saves'
            }
        ];

        // Move the selected metric to the top
        const selectedMetric = allMetrics.find(m => m.key === upgradeSource);
        const otherMetrics = allMetrics.filter(m => m.key !== upgradeSource);
        
        return selectedMetric ? [selectedMetric, ...otherMetrics] : allMetrics;
    };

    const metrics = getMetrics();

    const getWinner = (val1: number, val2: number, higherBetter: boolean) => {
        if (higherBetter) return val1 > val2 ? 1 : val1 < val2 ? 2 : 0;
        return val1 < val2 ? 1 : val1 > val2 ? 2 : 0;
    };

    const MetricBar = ({ label, icon: Icon, value1, value2, higherBetter, suffix = '', player1Name, player2Name }: any) => {
        // Parse values properly
        const numVal1 = typeof value1 === 'string' ? parseFloat(value1) || 0 : (value1 || 0);
        const numVal2 = typeof value2 === 'string' ? parseFloat(value2) || 0 : (value2 || 0);
        const winner = getWinner(numVal1, numVal2, higherBetter);
        
        // Format display values consistently
        const displayVal1 = typeof value1 === 'string' ? value1 : (typeof numVal1 === 'number' && !isNaN(numVal1) ? numVal1.toFixed(numVal1 % 1 === 0 ? 0 : 1) : '0');
        const displayVal2 = typeof value2 === 'string' ? value2 : (typeof numVal2 === 'number' && !isNaN(numVal2) ? numVal2.toFixed(numVal2 % 1 === 0 ? 0 : 1) : '0');
        
        // Calculate bar widths - proportional to values for visual comparison
        // Bars show relative magnitude; WIN badge indicates who wins based on higherBetter flag
        let barWidth1 = 0;
        let barWidth2 = 0;
        
        if (numVal1 === 0 && numVal2 === 0) {
            barWidth1 = 0;
            barWidth2 = 0;
        } else {
            const maxVal = Math.max(Math.abs(numVal1), Math.abs(numVal2), 1);
            barWidth1 = (Math.abs(numVal1) / maxVal) * 100;
            barWidth2 = (Math.abs(numVal2) / maxVal) * 100;
        }

        return (
            <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
                {/* Single Row Layout */}
                <div className="relative flex items-center">
                    {/* Left Side - Player 1 */}
                    <div className={`flex-1 p-3 ${winner === 1 ? 'bg-green-50' : winner === 0 ? 'bg-orange-50' : 'bg-gray-50'}`}>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4 text-orange-600 flex-shrink-0" />
                                <span className="text-xs font-bold text-gray-700">{label}</span>
                            </div>
                            {winner === 1 && <span className="text-xs font-bold text-white bg-green-600 px-2 py-0.5 rounded">WIN</span>}
                            {winner === 0 && <span className="text-xs font-bold text-white bg-orange-500 px-2 py-0.5 rounded">TIE</span>}
                        </div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className={`text-lg font-black ${winner === 1 ? 'text-green-700' : winner === 0 ? 'text-orange-700' : 'text-gray-700'}`}>
                                {displayVal1}{suffix}
                            </span>
                            {winner === 1 && <TrendingUp className="w-4 h-4 text-green-600 flex-shrink-0" />}
                        </div>
                        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all ${winner === 1 ? 'bg-green-600' : winner === 0 ? 'bg-orange-500' : 'bg-gray-400'}`}
                                style={{ width: `${Math.min(barWidth1, 100)}%`, marginLeft: 'auto' }}
                            />
                        </div>
                    </div>

                    {/* Center Divider */}
                    <div className="w-0.5 h-full bg-gray-400 flex-shrink-0 z-10"></div>

                    {/* Right Side - Player 2 */}
                    <div className={`flex-1 p-3 ${winner === 2 ? 'bg-green-50' : winner === 0 ? 'bg-orange-50' : 'bg-gray-50'}`}>
                        <div className="flex items-center justify-end mb-2">
                            {winner === 2 && <span className="text-xs font-bold text-white bg-green-600 px-2 py-0.5 rounded">WIN</span>}
                            {winner === 0 && <span className="text-xs font-bold text-white bg-orange-500 px-2 py-0.5 rounded">TIE</span>}
                        </div>
                        <div className="flex items-center gap-2 mb-1.5 justify-end">
                            {winner === 2 && <TrendingUp className="w-4 h-4 text-green-600 flex-shrink-0" />}
                            <span className={`text-lg font-black ${winner === 2 ? 'text-green-700' : winner === 0 ? 'text-orange-700' : 'text-gray-700'}`}>
                                {displayVal2}{suffix}
                            </span>
                        </div>
                        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all ${winner === 2 ? 'bg-green-600' : winner === 0 ? 'bg-orange-500' : 'bg-gray-400'}`}
                                style={{ width: `${Math.min(barWidth2, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto"
                onClick={onClose}
            >
                <div className="min-h-screen p-4 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{
                            type: "spring",
                            stiffness: 200,
                            damping: 28,
                            mass: 0.6
                        }}
                        className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-1 shadow-2xl border-2 border-orange-500/40 w-full max-w-4xl my-8"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute -top-3 -right-3 w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center shadow-xl z-30 border-2 border-orange-500/50 hover:border-orange-500 transition-colors"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>

                        <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg overflow-hidden border-2 border-gray-300/70">
                            {/* Header - Two Players Side by Side */}
                            <div className="grid grid-cols-2 border-b-4 border-gray-300">
                                {/* Player 1 */}
                                <div className={`bg-gradient-to-br ${colors1.primary} ${colors1.text} p-6 relative`}>
                                    <div className="text-center">
                                        <div className="relative inline-block mb-3">
                                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-2xl bg-gradient-to-br from-white to-gray-100">
                                                {!photo1Failed ? (
                                                    <img
                                                        src={photo1Urls[photo1Index] || photo1Urls[0]}
                                                        alt={player1.web_name}
                                                        className="w-full h-full object-cover"
                                                        onError={() => {
                                                            if (photo1Index < photo1Urls.length - 1) {
                                                                setPhoto1Index(photo1Index + 1);
                                                            } else {
                                                                setPhoto1Failed(true);
                                                            }
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-orange-800 bg-white">
                                                        {getPlayerInitials(player1.web_name)}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Player 1 Injury Indicator - Top Left */}
                                            {player1IsInjured && (
                                                <div className={`absolute -top-1 -left-1 z-50 w-7 h-7 rounded-full flex items-center justify-center shadow-xl border-2 ${
                                                    player1InjurySeverity === 'severe'
                                                        ? 'bg-red-600 border-red-400'
                                                        : player1InjurySeverity === 'moderate'
                                                        ? 'bg-orange-500 border-orange-300'
                                                        : 'bg-yellow-500 border-yellow-300'
                                                }`}>
                                                    <Cross className="w-4 h-4 text-white" strokeWidth={3} />
                                                </div>
                                            )}
                                            
                                            {/* Player 1 Suspended Tag - Top Left (if not injured) */}
                                            {player1IsSuspended && !player1IsInjured && (
                                                <div className="absolute -top-1 -left-1 z-50 bg-gradient-to-br from-gray-800 to-gray-900 text-white px-2 py-0.5 rounded-br-lg rounded-tl-xl shadow-xl border-2 border-gray-600 flex items-center gap-1">
                                                    <Ban className="w-3 h-3" />
                                                    <span className="text-[8px] font-black uppercase">SUSP</span>
                                                </div>
                                            )}
                                            
                                            {team1 && (
                                                <div className={`absolute -bottom-2 -right-2 w-12 h-12 ${colors1.accent} rounded-full flex items-center justify-center shadow-xl border-4 border-white overflow-hidden bg-white z-40`}>
                                                    <img
                                                        src={getTeamBadgeUrl(team1.code)}
                                                        alt={team1.short_name}
                                                        className="w-10 h-10 object-contain"
                                                        onError={(e) => {
                                                            const img = e.currentTarget;
                                                            img.style.display = 'none';
                                                            const span = document.createElement('span');
                                                            span.className = 'font-black text-xs text-gray-800';
                                                            span.textContent = team1?.short_name?.substring(0, 3).toUpperCase() || '';
                                                            img.parentElement!.appendChild(span);
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <h2 className={`text-2xl font-black mb-1 drop-shadow-lg ${colors1.text}`}>{player1.web_name}</h2>
                                        <p className={`text-sm font-semibold ${colors1.text} drop-shadow-md`}>{team1?.name}</p>
                                        <p className={`text-xs mt-2 font-bold mb-3 uppercase tracking-wide drop-shadow-sm ${colors1.text === 'text-gray-900' ? 'text-gray-900' : 'text-white/95'}`}>{['', 'GKP', 'DEF', 'MID', 'FWD'][player1.element_type]}</p>
                                        
                                        {/* View Details CTA Button */}
                                        {onPlayerClick && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onPlayerClick(player1);
                                                    onClose();
                                                }}
                                                className={`mt-3 w-full ${colors1.buttonBg} hover:opacity-90 ${colors1.buttonText} font-bold py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 border-2 ${colors1.text === 'text-gray-900' ? 'border-gray-700/70 hover:border-gray-800' : 'border-white/50 hover:border-white/70'} shadow-lg backdrop-blur-sm`}
                                            >
                                                <Eye className="w-4 h-4" />
                                                <span>View Full Details</span>
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* VS Divider */}
                                <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-gray-300 to-gray-400 transform -translate-x-1/2 z-10">
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-xl border-4 border-white font-black text-xl">
                                        VS
                                    </div>
                                </div>

                                {/* Player 2 */}
                                <div className={`bg-gradient-to-br ${colors2.primary} ${colors2.text} p-6 relative`}>
                                    <div className="text-center">
                                        <div className="relative inline-block mb-3">
                                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-2xl bg-gradient-to-br from-white to-gray-100">
                                                {!photo2Failed ? (
                                                    <img
                                                        src={photo2Urls[photo2Index] || photo2Urls[0]}
                                                        alt={player2.web_name}
                                                        className="w-full h-full object-cover"
                                                        onError={() => {
                                                            if (photo2Index < photo2Urls.length - 1) {
                                                                setPhoto2Index(photo2Index + 1);
                                                            } else {
                                                                setPhoto2Failed(true);
                                                            }
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-orange-800 bg-white">
                                                        {getPlayerInitials(player2.web_name)}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Player 2 Injury Indicator - Top Left */}
                                            {player2IsInjured && (
                                                <div className={`absolute -top-1 -left-1 z-50 w-7 h-7 rounded-full flex items-center justify-center shadow-xl border-2 ${
                                                    player2InjurySeverity === 'severe'
                                                        ? 'bg-red-600 border-red-400'
                                                        : player2InjurySeverity === 'moderate'
                                                        ? 'bg-orange-500 border-orange-300'
                                                        : 'bg-yellow-500 border-yellow-300'
                                                }`}>
                                                    <Cross className="w-4 h-4 text-white" strokeWidth={3} />
                                                </div>
                                            )}
                                            
                                            {/* Player 2 Suspended Tag - Top Left (if not injured) */}
                                            {player2IsSuspended && !player2IsInjured && (
                                                <div className="absolute -top-1 -left-1 z-50 bg-gradient-to-br from-gray-800 to-gray-900 text-white px-2 py-0.5 rounded-br-lg rounded-tl-xl shadow-xl border-2 border-gray-600 flex items-center gap-1">
                                                    <Ban className="w-3 h-3" />
                                                    <span className="text-[8px] font-black uppercase">SUSP</span>
                                                </div>
                                            )}
                                            
                                            {team2 && (
                                                <div className={`absolute -bottom-2 -right-2 w-12 h-12 ${colors2.accent} rounded-full flex items-center justify-center shadow-xl border-4 border-white overflow-hidden bg-white z-40`}>
                                                    <img
                                                        src={getTeamBadgeUrl(team2.code)}
                                                        alt={team2.short_name}
                                                        className="w-10 h-10 object-contain"
                                                        onError={(e) => {
                                                            const img = e.currentTarget;
                                                            img.style.display = 'none';
                                                            const span = document.createElement('span');
                                                            span.className = 'font-black text-xs text-gray-800';
                                                            span.textContent = team2?.short_name?.substring(0, 3).toUpperCase() || '';
                                                            img.parentElement!.appendChild(span);
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <h2 className={`text-2xl font-black mb-1 drop-shadow-lg ${colors2.text}`}>{player2.web_name}</h2>
                                        <p className={`text-sm font-semibold ${colors2.text} drop-shadow-md`}>{team2?.name}</p>
                                        <p className={`text-xs mt-2 font-bold mb-3 uppercase tracking-wide drop-shadow-sm ${colors2.text === 'text-gray-900' ? 'text-gray-900' : 'text-white/95'}`}>{['', 'GKP', 'DEF', 'MID', 'FWD'][player2.element_type]}</p>
                                        
                                        {/* View Details CTA Button */}
                                        {onPlayerClick && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onPlayerClick(player2);
                                                    onClose();
                                                }}
                                                className={`mt-3 w-full ${colors2.buttonBg} hover:opacity-90 ${colors2.buttonText} font-bold py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 border-2 ${colors2.text === 'text-gray-900' ? 'border-gray-700/70 hover:border-gray-800' : 'border-white/50 hover:border-white/70'} shadow-lg backdrop-blur-sm`}
                                            >
                                                <Eye className="w-4 h-4" />
                                                <span>View Full Details</span>
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Metrics Comparison */}
                            <div className="p-6 space-y-6 bg-white">
                                <div className="text-center mb-4">
                                    <h3 className="text-xl font-black text-gray-900 mb-2">Key Metrics Comparison</h3>
                                    <div className="flex items-center justify-center gap-4 text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded bg-green-500"></div>
                                            <span className="text-gray-700 font-semibold">Better</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded bg-gray-400"></div>
                                            <span className="text-gray-700 font-semibold">Lower</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {metrics.map((metric, idx) => {
                                        // Extract key from metric if it exists, then spread the rest
                                        const { key, ...metricProps } = metric;
                                        return (
                                            <MetricBar 
                                                key={metric.key || idx} 
                                                {...metricProps} 
                                                player1Name={player1.web_name}
                                                player2Name={player2.web_name}
                                            />
                                        );
                                    })}
                                </div>
                                
                                {/* Overall Summary */}
                                {(() => {
                                    let player1Wins = 0;
                                    let player2Wins = 0;
                                    metrics.forEach(metric => {
                                        const numVal1 = typeof metric.value1 === 'string' ? parseFloat(metric.value1) : metric.value1;
                                        const numVal2 = typeof metric.value2 === 'string' ? parseFloat(metric.value2) : metric.value2;
                                        const winner = getWinner(numVal1, numVal2, metric.higherBetter);
                                        if (winner === 1) player1Wins++;
                                        else if (winner === 2) player2Wins++;
                                    });
                                    const overallWinner = player1Wins > player2Wins ? 1 : player2Wins > player1Wins ? 2 : 0;
                                    
                                    return (
                                        <div className="mt-6 pt-4 border-t-2 border-gray-300">
                                            <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4 border-2 border-orange-300">
                                                <h4 className="text-lg font-black text-gray-900 mb-3 text-center">Overall Comparison</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className={`text-center p-3 rounded-lg border-2 ${
                                                        overallWinner === 1 ? 'bg-green-100 border-green-500' : 'bg-gray-100 border-gray-300'
                                                    }`}>
                                                        <p className="text-xs font-semibold text-gray-600 mb-1">{player1.web_name}</p>
                                                        <p className={`text-2xl font-black ${overallWinner === 1 ? 'text-green-700' : 'text-gray-700'}`}>
                                                            {player1Wins}
                                                        </p>
                                                        <p className="text-xs text-gray-600">Wins</p>
                                                        {overallWinner === 1 && (
                                                            <div className="mt-2">
                                                                <Trophy className="w-5 h-5 mx-auto text-yellow-500" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className={`text-center p-3 rounded-lg border-2 ${
                                                        overallWinner === 2 ? 'bg-green-100 border-green-500' : 'bg-gray-100 border-gray-300'
                                                    }`}>
                                                        <p className="text-xs font-semibold text-gray-600 mb-1">{player2.web_name}</p>
                                                        <p className={`text-2xl font-black ${overallWinner === 2 ? 'text-green-700' : 'text-gray-700'}`}>
                                                            {player2Wins}
                                                        </p>
                                                        <p className="text-xs text-gray-600">Wins</p>
                                                        {overallWinner === 2 && (
                                                            <div className="mt-2">
                                                                <Trophy className="w-5 h-5 mx-auto text-yellow-500" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                {overallWinner === 0 && (
                                                    <p className="text-center text-sm font-semibold text-gray-600 mt-2">It's a tie!</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

