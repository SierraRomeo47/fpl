'use client';

import { ArrowRight, TrendingUp, Plus } from 'lucide-react';
import { getPlayerPhotoUrls, getTeamBadgeUrl, getPlayerInitials } from '@/lib/player-photo-utils';
import { useState } from 'react';
import { FixtureDifficulty } from './fixture-difficulty';
import { PlayerComparisonModal } from './player-comparison-modal';

interface UpgradeSplitCardProps {
    currentPlayer: any;
    upgradePlayer: any;
    currentTeam: any;
    upgradeTeam: any;
    teams: any[];
    fixtures: any[];
    currentEvent: number;
    upgradeSource: string;
    onPlayerClick?: (player: any) => void;
}

export function UpgradeSplitCard({
    currentPlayer,
    upgradePlayer,
    currentTeam,
    upgradeTeam,
    teams,
    fixtures,
    currentEvent,
    upgradeSource,
    onPlayerClick
}: UpgradeSplitCardProps) {
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [upgradePhotoIndex, setUpgradePhotoIndex] = useState(0);
    const [currentPhotoFailed, setCurrentPhotoFailed] = useState(false);
    const [upgradePhotoFailed, setUpgradePhotoFailed] = useState(false);
    const [showComparison, setShowComparison] = useState(false);

    const currentPhotoUrls = getPlayerPhotoUrls({
        code: currentPlayer.code,
        photo: currentPlayer.photo,
        web_name: currentPlayer.web_name,
        team: currentPlayer.team
    });
    const upgradePhotoUrls = getPlayerPhotoUrls({
        code: upgradePlayer.code,
        photo: upgradePlayer.photo,
        web_name: upgradePlayer.web_name,
        team: upgradePlayer.team
    });

    const handleCurrentPhotoError = () => {
        if (currentPhotoIndex < currentPhotoUrls.length - 1) {
            setCurrentPhotoIndex(currentPhotoIndex + 1);
        } else {
            setCurrentPhotoFailed(true);
        }
    };

    const handleUpgradePhotoError = () => {
        if (upgradePhotoIndex < upgradePhotoUrls.length - 1) {
            setUpgradePhotoIndex(upgradePhotoIndex + 1);
        } else {
            setUpgradePhotoFailed(true);
        }
    };

    // Team colors
    const teamColors: Record<number, { primary: string, secondary: string, accent: string, text: string }> = {
        1: { primary: 'from-red-600 to-red-700', secondary: 'from-white to-gray-100', accent: 'bg-red-600', text: 'text-white' },
        2: { primary: 'from-orange-700 to-orange-900', secondary: 'from-sky-400 to-sky-500', accent: 'bg-orange-700', text: 'text-white' },
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

    const currentColors = currentTeam ? teamColors[currentTeam.id] || { primary: 'from-orange-500 to-orange-600', secondary: 'from-white to-gray-100', accent: 'bg-orange-500', text: 'text-white' } : { primary: 'from-orange-500 to-orange-600', secondary: 'from-white to-gray-100', accent: 'bg-orange-500', text: 'text-white' };
    const upgradeColors = upgradeTeam ? teamColors[upgradeTeam.id] || { primary: 'from-orange-500 to-orange-600', secondary: 'from-white to-gray-100', accent: 'bg-orange-500', text: 'text-white' } : { primary: 'from-orange-500 to-orange-600', secondary: 'from-white to-gray-100', accent: 'bg-orange-500', text: 'text-white' };

    const positionName = ['', 'GKP', 'DEF', 'MID', 'FWD'][currentPlayer.element_type];
    const currentForm = parseFloat(currentPlayer.form) || 0;
    const upgradeForm = parseFloat(upgradePlayer.form) || 0;
    const currentGWPoints = currentPlayer.event_points !== null && currentPlayer.event_points !== undefined ? currentPlayer.event_points : null;
    const upgradeGWPoints = upgradePlayer.event_points !== null && upgradePlayer.event_points !== undefined ? upgradePlayer.event_points : null;

    // Check if players are injured (for yellow plus icon)
    const currentIsInjured = currentPlayer.status === 'i' || (currentPlayer.news && (currentPlayer.news.toLowerCase().includes('injured') || currentPlayer.news.toLowerCase().includes('injury')));
    const upgradeIsInjured = upgradePlayer.status === 'i' || (upgradePlayer.news && (upgradePlayer.news.toLowerCase().includes('injured') || upgradePlayer.news.toLowerCase().includes('injury')));

    return (
        <>
        <div className="relative group w-full aspect-[5/7]">
            <button
                onClick={() => setShowComparison(true)}
                className="relative w-full h-full"
            >
                <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-0.5 shadow-xl hover:shadow-2xl hover:shadow-orange-500/30 transition-all duration-300 hover:scale-105 border-2 border-gray-700/60 h-full overflow-hidden">
                    {/* Current Player - Top Half */}
                    <div className="relative w-full h-1/2 border-b-2 border-gray-600">
                        <div className="bg-gradient-to-br from-gray-50 to-white rounded-t-lg overflow-hidden h-full flex flex-col border-2 border-gray-300/70">
                        {/* Header */}
                        <div className={`relative flex-shrink-0 bg-gradient-to-br ${currentColors.primary} ${currentColors.text} flex items-center justify-center overflow-hidden`} style={{ height: '30%' }}>
                            <div className="absolute inset-0 opacity-10">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_60%)]" />
                            </div>
                            <div className="relative z-10 w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-lg bg-gradient-to-br from-white to-gray-100">
                                {!currentPhotoFailed ? (
                                    <img
                                        key={currentPhotoIndex}
                                        src={currentPhotoUrls[currentPhotoIndex] || currentPhotoUrls[0]}
                                        alt={currentPlayer.web_name}
                                        className="w-full h-full object-cover"
                                        onError={handleCurrentPhotoError}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xl font-bold text-orange-800 bg-white">
                                        {getPlayerInitials(currentPlayer.web_name)}
                                    </div>
                                )}
                                {/* Yellow Plus Icon - Left Side (Only for Injured Players) */}
                                {currentIsInjured && (
                                    <div className="absolute -top-1 -left-2 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white z-20">
                                        <Plus className="w-3 h-3 text-white" strokeWidth={3} />
                                    </div>
                                )}
                            </div>
                            {currentTeam && (
                                <div className="absolute top-1 right-1 z-10">
                                    <div className={`w-6 h-6 ${currentColors.accent} rounded-full flex items-center justify-center shadow-lg border-2 border-white/70 overflow-hidden bg-white`}>
                                        <img
                                            src={getTeamBadgeUrl(currentTeam.code)}
                                            alt={currentTeam.short_name}
                                            className="w-4 h-4 object-contain"
                                            onError={(e) => {
                                                const img = e.currentTarget;
                                                img.style.display = 'none';
                                                const span = document.createElement('span');
                                                span.className = 'font-black text-[8px] text-gray-800';
                                                span.textContent = currentTeam?.short_name?.substring(0, 3).toUpperCase() || '';
                                                img.parentElement!.appendChild(span);
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Name Bar */}
                        <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 text-white px-1 py-0.5 text-center border-y border-white/10 flex-shrink-0">
                            <p className="text-[9px] font-black tracking-wide uppercase truncate drop-shadow-lg leading-tight">{currentPlayer.web_name}</p>
                            <p className="text-[7px] text-white font-semibold truncate drop-shadow-sm">{currentTeam?.short_name} • {positionName}</p>
                        </div>

                        {/* Stats */}
                        <div className="flex-1 flex flex-col justify-center p-1.5 min-h-0">
                            <div className="grid grid-cols-3 gap-1">
                                <div className="bg-gradient-to-br from-orange-100 to-orange-50 rounded p-0.5 text-center border border-orange-400">
                                    <p className="text-[6px] text-gray-800 font-bold uppercase leading-tight">Form</p>
                                    <p className="text-xs font-black text-orange-700 leading-tight">{currentForm.toFixed(1)}</p>
                                </div>
                                <div className={`rounded p-0.5 text-center border-2 ${
                                    currentGWPoints !== null
                                        ? 'bg-gradient-to-br from-green-500 to-green-600 border-green-700'
                                        : 'bg-gradient-to-br from-gray-400 to-gray-500 border-gray-600'
                                }`}>
                                    <p className="text-[6px] text-white font-bold uppercase leading-tight drop-shadow-sm">GW</p>
                                    <p className="text-sm font-black text-white leading-tight drop-shadow-sm">{currentGWPoints !== null ? currentGWPoints : '-'}</p>
                                </div>
                                <div className="bg-gradient-to-br from-cyan-100 to-cyan-50 rounded p-0.5 text-center border border-cyan-400">
                                    <p className="text-[6px] text-gray-800 font-bold uppercase leading-tight">xPts</p>
                                    <p className="text-xs font-black text-cyan-700 leading-tight">{(parseFloat(currentPlayer.ep_next) || 0).toFixed(1)}</p>
                                </div>
                            </div>
                        </div>
                        </div>
                    </div>

                    {/* Arrow on Left Side */}
                    <div className="absolute top-1/2 left-2 transform -translate-y-1/2 z-20">
                        <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-xl border-2 border-white">
                            <TrendingUp className="w-4 h-4 text-white" />
                        </div>
                    </div>

                    {/* Upgrade Player - Bottom Half */}
                    <div className="relative w-full h-1/2">
                        <div className="bg-gradient-to-br from-gray-50 to-white rounded-b-lg overflow-hidden h-full flex flex-col border-2 border-gray-300/70 border-t-0">
                        {/* Header */}
                        <div className={`relative flex-shrink-0 bg-gradient-to-br ${upgradeColors.primary} ${upgradeColors.text} flex items-center justify-center overflow-hidden`} style={{ height: '30%' }}>
                            <div className="absolute inset-0 opacity-10">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_60%)]" />
                            </div>
                            <div className="relative z-10 w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-lg bg-gradient-to-br from-white to-gray-100">
                                {!upgradePhotoFailed ? (
                                    <img
                                        key={upgradePhotoIndex}
                                        src={upgradePhotoUrls[upgradePhotoIndex] || upgradePhotoUrls[0]}
                                        alt={upgradePlayer.web_name}
                                        className="w-full h-full object-cover"
                                        onError={handleUpgradePhotoError}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xl font-bold text-orange-800 bg-white">
                                        {getPlayerInitials(upgradePlayer.web_name)}
                                    </div>
                                )}
                                {/* Yellow Plus Icon - Left Side (Only for Injured Players) */}
                                {upgradeIsInjured && (
                                    <div className="absolute -top-1 -left-2 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white z-20">
                                        <Plus className="w-3 h-3 text-white" strokeWidth={3} />
                                    </div>
                                )}
                            </div>
                            {upgradeTeam && (
                                <div className="absolute top-1 right-1 z-10">
                                    <div className={`w-6 h-6 ${upgradeColors.accent} rounded-full flex items-center justify-center shadow-lg border-2 border-white/70 overflow-hidden bg-white`}>
                                        <img
                                            src={getTeamBadgeUrl(upgradeTeam.code)}
                                            alt={upgradeTeam.short_name}
                                            className="w-4 h-4 object-contain"
                                            onError={(e) => {
                                                const img = e.currentTarget;
                                                img.style.display = 'none';
                                                const span = document.createElement('span');
                                                span.className = 'font-black text-[8px] text-gray-800';
                                                span.textContent = upgradeTeam?.short_name?.substring(0, 3).toUpperCase() || '';
                                                img.parentElement!.appendChild(span);
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Name Bar */}
                        <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 text-white px-1 py-0.5 text-center border-y border-white/10 flex-shrink-0">
                            <p className="text-[9px] font-black tracking-wide uppercase truncate drop-shadow-lg leading-tight">{upgradePlayer.web_name}</p>
                            <p className="text-[7px] text-white font-semibold truncate drop-shadow-sm">{upgradeTeam?.short_name} • {positionName}</p>
                        </div>

                        {/* Stats */}
                        <div className="flex-1 flex flex-col justify-center p-1.5 min-h-0">
                            <div className="grid grid-cols-3 gap-1">
                                <div className="bg-gradient-to-br from-orange-100 to-orange-50 rounded p-0.5 text-center border border-orange-400">
                                    <p className="text-[6px] text-gray-800 font-bold uppercase leading-tight">Form</p>
                                    <p className="text-xs font-black text-orange-700 leading-tight">{upgradeForm.toFixed(1)}</p>
                                </div>
                                <div className={`rounded p-0.5 text-center border-2 ${
                                    upgradeGWPoints !== null
                                        ? 'bg-gradient-to-br from-green-500 to-green-600 border-green-700'
                                        : 'bg-gradient-to-br from-gray-400 to-gray-500 border-gray-600'
                                }`}>
                                    <p className="text-[6px] text-white font-bold uppercase leading-tight drop-shadow-sm">GW</p>
                                    <p className="text-sm font-black text-white leading-tight drop-shadow-sm">{upgradeGWPoints !== null ? upgradeGWPoints : '-'}</p>
                                </div>
                                <div className="bg-gradient-to-br from-cyan-100 to-cyan-50 rounded p-0.5 text-center border border-cyan-400">
                                    <p className="text-[6px] text-gray-800 font-bold uppercase leading-tight">xPts</p>
                                    <p className="text-xs font-black text-cyan-700 leading-tight">{(parseFloat(upgradePlayer.ep_next) || 0).toFixed(1)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Bar */}
                        <div className={`bg-gradient-to-r ${upgradeColors.primary} px-1 py-0.5 flex items-center justify-between ${upgradeColors.text} rounded-b-xl flex-shrink-0`}>
                            <span className="text-[6px] font-semibold drop-shadow-sm">#{upgradePlayer.id}</span>
                            <span className="text-[6px] font-bold flex items-center gap-0.5 group-hover:gap-1 transition-all drop-shadow-sm">
                                Details <ArrowRight className="w-2 h-2" />
                            </span>
                        </div>
                        </div>
                    </div>
                </div>
            </button>
        </div>
        
        {/* Comparison Modal */}
        {showComparison && (
            <PlayerComparisonModal
                player1={currentPlayer}
                player2={upgradePlayer}
                team1={currentTeam}
                team2={upgradeTeam}
                upgradeSource={upgradeSource}
                onPlayerClick={onPlayerClick}
                onClose={() => setShowComparison(false)}
            />
        )}
        </>
    );
}

