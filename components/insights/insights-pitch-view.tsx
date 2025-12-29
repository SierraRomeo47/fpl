'use client';

import { ArrowRight, X, Cross, Ban, Eye } from 'lucide-react';
import { FixtureDifficulty } from './fixture-difficulty';
import { getPlayerPhotoUrls, getTeamBadgeUrl, getPlayerInitials } from '@/lib/player-photo-utils';
import { useState } from 'react';

interface InsightsPitchViewProps {
    players: any[];
    teams: any[];
    fixtures: any[];
    currentEvent: number;
    onPlayerClick: (player: any) => void;
    showRanks?: boolean;
    compactLayout?: boolean; // For bench/substitutes - no pitch background
    picksMap?: Map<number, any>; // Map of playerId -> pick info (for captain/vice-captain)
    getExpectedPoints?: (player: any) => number; // Function to calculate expected points for current GW
    isSquadView?: boolean; // Squad-specific card layout
    isHistoryView?: boolean; // History-specific card layout (show expected vs actual points)
    getHistoricalExpectedPoints?: (player: any) => number; // Function to get expected points for historical GW
    getHistoricalActualPoints?: (playerId: number) => number | null; // Function to get actual points for historical GW
}

function PitchPlayerCard({ player, team, teams, fixtures, currentEvent, rank, onClick, showRank = true, pick, expectedPoints, isSquadView = false, isHistoryView = false, getHistoricalExpectedPoints, getHistoricalActualPoints }: any) {
    const [photoUrlIndex, setPhotoUrlIndex] = useState(0);
    const [photoFailed, setPhotoFailed] = useState(false);
    const photoUrls = getPlayerPhotoUrls({ code: player.code, photo: player.photo, web_name: player.web_name, team: player.team });

    const form = parseFloat(player.form) || 0;
    const ownership = parseFloat(player.selected_by_percent) || 0;
    const price = player.now_cost / 10;
    const positionName = ['', 'GKP', 'DEF', 'MID', 'FWD'][player.element_type];
    const gwPoints = player.event_points !== null && player.event_points !== undefined ? player.event_points : null;
    const xPoints = expectedPoints !== null && expectedPoints !== undefined ? expectedPoints : (parseFloat(player.ep_next) || 0);

    // Get current or most recent fixture for squad view
    let currentFixture = null;
    let isHome = false;
    let opponentTeam = null;
    if (isSquadView && team && fixtures && fixtures.length > 0) {
        // First try to find current gameweek fixture (finished or not)
        const currentEventNum = typeof currentEvent === 'number' ? currentEvent : (currentEvent?.id || 1);
        currentFixture = fixtures.find((f: any) => {
            const isTeamInFixture = f.team_h === team.id || f.team_a === team.id;
            return isTeamInFixture && f.event === currentEventNum;
        });
        
        // If no current fixture, find most recent completed fixture
        if (!currentFixture) {
            const teamFixtures = fixtures
                .filter((f: any) => {
                    const isTeamInFixture = f.team_h === team.id || f.team_a === team.id;
                    return isTeamInFixture && f.event <= currentEventNum && f.finished === true;
                })
                .sort((a: any, b: any) => b.event - a.event);
            currentFixture = teamFixtures[0];
        }
        
        if (currentFixture && teams && teams.length > 0) {
            isHome = currentFixture.team_h === team.id;
            const opponentId = isHome ? currentFixture.team_a : currentFixture.team_h;
            opponentTeam = teams.find((t: any) => t.id === opponentId);
        }
    }

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

    const colors = team ? teamColors[team.id] || { primary: 'from-orange-500 to-orange-600', secondary: 'from-white to-gray-100', accent: 'bg-orange-500', text: 'text-white' } : { primary: 'from-orange-500 to-orange-600', secondary: 'from-white to-gray-100', accent: 'bg-orange-500', text: 'text-white' };

    const handlePhotoError = () => {
        if (photoUrlIndex < photoUrls.length - 1) {
            setPhotoUrlIndex(photoUrlIndex + 1);
        } else {
            setPhotoFailed(true);
        }
    };
    
    const currentPhotoUrl = photoUrls[photoUrlIndex] || photoUrls[0];

    // Check player status for injuries and suspensions
    const isSuspended = player.status === 's' || (player.news && player.news.toLowerCase().includes('suspended'));
    const isInjured = player.status === 'i' || (player.news && (player.news.toLowerCase().includes('injured') || player.news.toLowerCase().includes('injury')));
    
    // Determine injury severity based on chance_of_playing_next_round
    const healthPercent = player.chance_of_playing_next_round || 100;
    let injurySeverity: 'mild' | 'moderate' | 'severe' = 'mild';
    if (isInjured) {
        if (healthPercent < 25) injurySeverity = 'severe';
        else if (healthPercent < 50) injurySeverity = 'moderate';
        else injurySeverity = 'mild';
    }

    return (
        <button
            onClick={onClick}
            className="relative group w-full aspect-[5/7]"
        >
            <div className={`relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-0.5 shadow-xl hover:shadow-2xl hover:shadow-orange-500/30 transition-all duration-300 hover:scale-105 border-2 border-gray-700/60 h-full overflow-hidden ${
                isInjured 
                    ? injurySeverity === 'severe' 
                        ? 'ring-2 ring-red-600 ring-opacity-75' 
                        : injurySeverity === 'moderate'
                        ? 'ring-2 ring-orange-500 ring-opacity-75'
                        : 'ring-2 ring-yellow-500 ring-opacity-50'
                    : ''
            }`}>
                {/* Injury Overlay with Medical Cross - Top Left */}
                {isInjured && (
                    <>
                        {/* Severity-based overlay */}
                        <div className={`absolute inset-0 rounded-xl z-40 pointer-events-none ${
                            injurySeverity === 'severe' 
                                ? 'bg-red-900/40' 
                                : injurySeverity === 'moderate'
                                ? 'bg-orange-900/30'
                                : 'bg-yellow-900/20'
                        }`} />
                        
                        {/* Medical Cross Icon - Top Left */}
                        <div className={`absolute -top-1 -left-1 z-50 w-6 h-6 rounded-full flex items-center justify-center shadow-xl border-2 ${
                            injurySeverity === 'severe'
                                ? 'bg-red-600 border-red-400'
                                : injurySeverity === 'moderate'
                                ? 'bg-orange-500 border-orange-300'
                                : 'bg-yellow-500 border-yellow-300'
                        }`}>
                            <Cross className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                        </div>
                    </>
                )}

                {/* Suspended Tag - Top Left (if not C/VC and not injured) */}
                {isSuspended && !pick?.is_captain && !pick?.is_vice_captain && !isInjured && (
                    <div className="absolute -top-1 -left-1 z-50 bg-gradient-to-br from-gray-800 to-gray-900 text-white px-2 py-0.5 rounded-br-lg rounded-tl-xl shadow-xl border-2 border-gray-600 flex items-center gap-1">
                        <Ban className="w-3 h-3" />
                        <span className="text-[8px] font-black uppercase">SUSP</span>
                    </div>
                )}

                {/* Suspended Tag - Top Right (if C/VC badge exists or if injured) */}
                {isSuspended && (pick?.is_captain || pick?.is_vice_captain || isInjured) && (
                    <div className="absolute top-1 right-1 z-50 bg-gradient-to-br from-gray-800 to-gray-900 text-white px-2 py-0.5 rounded-lg shadow-xl border-2 border-gray-600 flex items-center gap-1">
                        <Ban className="w-3 h-3" />
                        <span className="text-[8px] font-black uppercase">SUSP</span>
                    </div>
                )}

                {/* Captain Badge - Top Left (if not injured) */}
                {pick?.is_captain && !isInjured && (
                    <div className="absolute -top-2 -left-2 w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-xl z-30 border-3 border-yellow-300">
                        <span className="text-[9px] font-black text-yellow-900">C</span>
                    </div>
                )}
                {/* Vice Captain Badge - Top Left (if not captain and not injured) */}
                {pick?.is_vice_captain && !pick?.is_captain && !isInjured && (
                    <div className="absolute -top-2 -left-2 w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center shadow-xl z-30 border-3 border-gray-300">
                        <span className="text-[9px] font-black text-gray-900">VC</span>
                    </div>
                )}
                {/* Captain Badge - Top Right (if injured) */}
                {pick?.is_captain && isInjured && (
                    <div className="absolute -top-2 -right-2 w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-xl z-30 border-3 border-yellow-300">
                        <span className="text-[9px] font-black text-yellow-900">C</span>
                    </div>
                )}
                {/* Vice Captain Badge - Top Right (if captain exists and injured, or if injured) */}
                {pick?.is_vice_captain && !pick?.is_captain && isInjured && (
                    <div className="absolute -top-2 -right-2 w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center shadow-xl z-30 border-3 border-gray-300">
                        <span className="text-[9px] font-black text-gray-900">VC</span>
                    </div>
                )}
                {/* Rank Badge - Top Right (only if no C/VC badge and not suspended/injured) */}
                {rank && showRank && !pick?.is_captain && !pick?.is_vice_captain && !isSuspended && !isInjured && (
                    <div className="absolute -top-2 -right-2 w-9 h-9 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg z-20 border-3 border-yellow-300">
                        <span className="text-[10px] font-black text-yellow-900">#{rank}</span>
                    </div>
                )}

                <div className={`bg-gradient-to-br from-gray-50 to-white overflow-hidden h-full flex flex-col border-2 border-gray-300/70 ${isSquadView ? 'rounded-xl' : 'rounded-lg'}`}>
                    {isSquadView ? (
                        <>
                            {/* Squad View Format: Top Section (Solid Team Color) with Team Badge */}
                            <div className={`relative flex-shrink-0 ${colors.accent} flex items-center justify-center overflow-hidden`} style={{ height: '38%' }}>
                                {/* Player Photo */}
                                <div className="relative z-10 w-14 h-14 rounded-full overflow-hidden border-3 border-white shadow-xl bg-gradient-to-br from-white to-gray-100">
                                    {!photoFailed ? (
                                        <img
                                            key={photoUrlIndex}
                                            src={currentPhotoUrl}
                                            alt={player.web_name}
                                            className="w-full h-full object-cover"
                                            onError={handlePhotoError}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-orange-800 bg-white">
                                            {getPlayerInitials(player.web_name)}
                                        </div>
                                    )}
                                </div>

                                {/* Team Badge - Top Right Corner */}
                                {team && (
                                    <div className="absolute top-1 right-1 z-10">
                                        <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-white/70 overflow-hidden">
                                            <img
                                                src={getTeamBadgeUrl(team.code)}
                                                alt={team.short_name}
                                                className="w-5 h-5 object-contain"
                                                onError={(e) => {
                                                    const img = e.currentTarget;
                                                    img.style.display = 'none';
                                                    const span = document.createElement('span');
                                                    span.className = 'font-black text-xs text-gray-800';
                                                    span.textContent = team?.short_name?.substring(0, 3).toUpperCase() || '';
                                                    img.parentElement!.appendChild(span);
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Middle Section (Dark Blue/Black) with Name, Team, Position Badge - Slim and Consistent */}
                            <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 text-white px-1.5 py-0.5 text-center flex-shrink-0" style={{ height: '40px' }}>
                                <p className="text-[10px] font-black tracking-wide uppercase truncate drop-shadow-lg leading-tight">{player.web_name}</p>
                                <p className="text-[8px] text-white font-semibold truncate leading-tight mt-0.5">{team?.short_name}</p>
                                <div className="flex justify-center mt-0.5">
                                    <div className={`${colors.accent} text-white px-1.5 py-0.5 text-[7px] font-bold shadow-md rounded`}>
                                        {positionName}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Default View: Top Section: Player Photo + Team Badge */}
                            <div className={`relative flex-shrink-0 bg-gradient-to-br ${colors.primary} ${colors.text} flex items-center justify-center overflow-hidden`} style={{ height: '35%' }}>
                                <div className="absolute inset-0 opacity-10">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_60%)]" />
                                </div>

                                {/* Player Photo */}
                                <div className="relative z-10 w-14 h-14 rounded-full overflow-hidden border-3 border-white shadow-xl bg-gradient-to-br from-white to-gray-100">
                                    {!photoFailed ? (
                                        <img
                                            key={photoUrlIndex}
                                            src={currentPhotoUrl}
                                            alt={player.web_name}
                                            className="w-full h-full object-cover"
                                            onError={handlePhotoError}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-orange-800 bg-white">
                                            {getPlayerInitials(player.web_name)}
                                        </div>
                                    )}
                                </div>

                                {/* Team Badge - Top Right Corner */}
                                {team && (
                                    <div className="absolute top-1 right-1 z-10">
                                        <div className={`w-7 h-7 ${colors.accent} rounded-full flex items-center justify-center shadow-lg border-2 border-white/70 overflow-hidden bg-white`}>
                                            <img
                                                src={getTeamBadgeUrl(team.code)}
                                                alt={team.short_name}
                                                className="w-5 h-5 object-contain"
                                                onError={(e) => {
                                                    const img = e.currentTarget;
                                                    img.style.display = 'none';
                                                    const span = document.createElement('span');
                                                    span.className = 'font-black text-xs text-gray-800';
                                                    span.textContent = team?.short_name?.substring(0, 3).toUpperCase() || '';
                                                    img.parentElement!.appendChild(span);
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Center Bar: Player Name */}
                            <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 text-white px-1.5 py-1 text-center border-y border-white/10 flex-shrink-0">
                                <p className="text-[10px] font-black tracking-wide uppercase truncate drop-shadow-lg leading-tight">{player.web_name}</p>
                                <p className="text-[8px] text-gray-300 font-semibold truncate">{team?.short_name}</p>
                            </div>

                            {/* Position Badge */}
                            <div className="flex justify-center -mt-1 relative z-10 flex-shrink-0">
                                <div className={`bg-gradient-to-r ${colors.primary} text-white px-2 py-0.5 text-[8px] font-bold shadow-md rounded`}>
                                    {positionName}
                                </div>
                            </div>
                        </>
                    )}

                    <div className={`flex-1 flex flex-col justify-center p-2 min-h-0`}>
                        {isHistoryView ? (
                            <>
                                {/* History View: Expected Points (Left) vs Actual Points (Right) */}
                                {(() => {
                                    const historicalXPoints = getHistoricalExpectedPoints ? getHistoricalExpectedPoints(player) : 0;
                                    const historicalActualPoints = getHistoricalActualPoints ? getHistoricalActualPoints(player.id) : null;
                                    const difference = historicalActualPoints !== null ? (historicalActualPoints - historicalXPoints) : null;
                                    
                                    return (
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {/* Expected Points - Left */}
                                            <div className="bg-gradient-to-br from-cyan-100 to-cyan-50 rounded-lg p-1 text-center border-2 border-cyan-500 shadow-sm flex flex-col justify-center items-center" style={{ height: '52px' }}>
                                                <p className="text-[7px] text-gray-800 font-bold uppercase leading-tight mb-1">EXPECTED</p>
                                                <p className="text-sm font-black text-cyan-700 leading-none">{historicalXPoints.toFixed(1)}</p>
                                            </div>
                                            
                                            {/* Actual Points - Right */}
                                            <div className={`rounded-lg p-1 text-center border-2 shadow-lg flex flex-col justify-center items-center ${
                                                historicalActualPoints !== null 
                                                    ? difference !== null && difference > 0
                                                        ? 'bg-gradient-to-br from-green-500 to-green-600 border-green-700'
                                                        : difference !== null && difference < 0
                                                        ? 'bg-gradient-to-br from-red-500 to-red-600 border-red-700'
                                                        : 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-700'
                                                    : 'bg-gradient-to-br from-gray-400 to-gray-500 border-gray-600'
                                            }`} style={{ height: '52px' }}>
                                                <p className="text-[7px] text-white font-bold uppercase leading-tight opacity-90 mb-1">ACTUAL</p>
                                                <p className="text-lg font-black leading-none text-white">
                                                    {historicalActualPoints !== null ? historicalActualPoints : '-'}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </>
                        ) : isSquadView ? (
                            <>
                                {/* Squad View: Form (Left), GW Points (Center), Expected Points (Right) - All Same Height */}
                                <div className="grid grid-cols-3 gap-1.5">
                                    {/* Form - Left */}
                                    <div className="bg-gradient-to-br from-orange-100 to-orange-50 rounded-lg p-1 text-center border-2 border-orange-500 shadow-sm flex flex-col justify-center items-center" style={{ height: '52px' }}>
                                        <p className="text-[7px] text-gray-800 font-bold uppercase leading-tight mb-1">FORM</p>
                                        <p className="text-sm font-black text-orange-700 leading-none">{form.toFixed(1)}</p>
                                    </div>
                                    
                                    {/* GW Points - Center (Most Prominent) */}
                                    <div className={`rounded-lg p-1 text-center border-2 shadow-lg flex flex-col justify-center items-center ${
                                        gwPoints !== null 
                                            ? 'bg-gradient-to-br from-green-500 to-green-600 border-green-700' 
                                            : 'bg-gradient-to-br from-gray-400 to-gray-500 border-gray-600'
                                    }`} style={{ height: '52px' }}>
                                        <p className="text-[7px] text-white font-bold uppercase leading-tight opacity-90 mb-1">GW</p>
                                        <p className="text-lg font-black leading-none text-white">
                                            {gwPoints !== null ? gwPoints : '-'}
                                        </p>
                                    </div>
                                    
                                    {/* Expected Points This GW - Right */}
                                    <div className="bg-gradient-to-br from-cyan-100 to-cyan-50 rounded-lg p-1 text-center border-2 border-cyan-500 shadow-sm flex flex-col justify-center items-center" style={{ height: '52px' }}>
                                        <p className="text-[7px] text-gray-800 font-bold uppercase leading-tight mb-1">XPTS</p>
                                        <p className="text-sm font-black text-cyan-700 leading-none">{xPoints.toFixed(1)}</p>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Default View: Form (Left), GW Points (Center), Expected Points (Right) */}
                                <div className="grid grid-cols-3 gap-1 mb-1.5">
                                    {/* Form - Left */}
                                    <div className="bg-gradient-to-br from-orange-100 to-orange-50 rounded-lg p-1 text-center border-2 border-orange-500 shadow-sm">
                                        <p className="text-[7px] text-gray-800 font-bold uppercase leading-tight">Form</p>
                                        <p className="text-sm font-black text-orange-700 leading-tight">{form.toFixed(1)}</p>
                                    </div>
                                    
                                    {/* GW Points - Center (Most Prominent) */}
                                    <div className={`rounded-lg p-1 text-center border-2 shadow-lg ${
                                        gwPoints !== null 
                                            ? 'bg-gradient-to-br from-green-500 to-green-600 border-green-700' 
                                            : 'bg-gradient-to-br from-gray-400 to-gray-500 border-gray-600'
                                    }`}>
                                        <p className="text-[7px] text-white font-bold uppercase leading-tight opacity-90">GW PTS</p>
                                        <p className="text-lg font-black leading-tight text-white">
                                            {gwPoints !== null ? gwPoints : '-'}
                                        </p>
                                    </div>
                                    
                                    {/* Expected Points This GW - Right */}
                                    <div className="bg-gradient-to-br from-cyan-100 to-cyan-50 rounded-lg p-1 text-center border-2 border-cyan-500 shadow-sm">
                                        <p className="text-[7px] text-gray-800 font-bold uppercase leading-tight">xPts</p>
                                        <p className="text-sm font-black text-cyan-700 leading-tight">{xPoints.toFixed(1)}</p>
                                    </div>
                                </div>

                                {/* Next Fixtures */}
                                <div className="flex-shrink-0">
                                    <p className="text-[7px] text-gray-700 font-bold mb-1">Next 3:</p>
                                    <FixtureDifficulty
                                        teamId={team?.id || player.team}
                                        fixtures={fixtures}
                                        teams={teams}
                                        currentEvent={currentEvent}
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Bottom Bar - Only show if not squad view or history view */}
                    {!isSquadView && !isHistoryView && (
                        <div className={`bg-gradient-to-r ${colors.primary} px-1.5 py-0.5 flex items-center justify-between ${colors.text} rounded-b-xl flex-shrink-0`}>
                            <span className="text-[7px] opacity-90 font-semibold">#{player.id}</span>
                            <span className="text-[7px] font-bold flex items-center gap-0.5 group-hover:gap-1 transition-all">
                                Details <ArrowRight className="w-2 h-2" />
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </button>
    );
}

export function InsightsPitchView({
    players,
    teams,
    fixtures,
    currentEvent,
    onPlayerClick,
    showRanks = true,
    compactLayout = false,
    picksMap,
    getExpectedPoints,
    isSquadView = false,
    isHistoryView = false,
    getHistoricalExpectedPoints,
    getHistoricalActualPoints
}: InsightsPitchViewProps) {
    // Group players by position
    const goalkeepers = players.filter((p: any) => p.element_type === 1);
    const defenders = players.filter((p: any) => p.element_type === 2);
    const midfielders = players.filter((p: any) => p.element_type === 3);
    const forwards = players.filter((p: any) => p.element_type === 4);

    const getTeam = (teamId: number) => teams.find((t: any) => t.id === teamId);

    // Compact layout for bench/substitutes (no pitch background)
    if (compactLayout) {
        return (
            <div className="flex justify-center gap-4 flex-wrap">
                {players.map((player: any, idx: number) => {
                    const team = getTeam(player.team);
                    return (
                        <div key={player.id} className="w-32">
                            <PitchPlayerCard
                                player={player}
                                team={team}
                                teams={teams}
                                fixtures={fixtures}
                                currentEvent={currentEvent}
                                rank={showRanks ? idx + 1 : undefined}
                                onClick={() => onPlayerClick(player)}
                                showRank={showRanks}
                                pick={picksMap?.get(player.id)}
                                expectedPoints={getExpectedPoints ? getExpectedPoints(player) : undefined}
                                isSquadView={isSquadView}
                                isHistoryView={isHistoryView}
                                getHistoricalExpectedPoints={getHistoricalExpectedPoints}
                                getHistoricalActualPoints={getHistoricalActualPoints}
                            />
                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden rounded-3xl border-2 border-orange-500/30 shadow-2xl">
            {/* Realistic Pitch Background */}
            <div className="relative min-h-[800px] bg-gradient-to-b from-green-600 via-green-700 to-green-800">
                {/* Detailed Grass Stripes Pattern */}
                <div className="absolute inset-0" style={{
                    backgroundImage: `
                        repeating-linear-gradient(
                            0deg,
                            rgba(34, 139, 34, 0.4) 0px,
                            rgba(34, 139, 34, 0.4) 50px,
                            rgba(46, 125, 50, 0.6) 50px,
                            rgba(46, 125, 50, 0.6) 100px
                        )
                    `,
                    backgroundSize: '100% 100px'
                }} />

                {/* Grass Texture Overlay */}
                <div className="absolute inset-0 opacity-30" style={{
                    backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)`,
                    backgroundSize: '4px 4px'
                }} />

                {/* Pitch Markings */}
                <div className="absolute inset-0">
                    {/* Outer Boundary */}
                    <div className="absolute inset-8 border-4 border-white/40 rounded-lg" />

                    {/* Halfway Line */}
                    <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-white/40" />

                    {/* Center Circle */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-4 border-white/40 rounded-full" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white/50 rounded-full shadow-lg" />

                    {/* Top Penalty Area */}
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 w-96 h-36 border-4 border-white/40 border-t-0 rounded-b-sm" />
                    {/* Top Goal Area */}
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 w-48 h-20 border-4 border-white/40 border-t-0 rounded-b-sm" />
                    {/* Top Penalty Spot */}
                    <div className="absolute top-32 left-1/2 -translate-x-1/2 w-2 h-2 bg-white/50 rounded-full" />
                    {/* Top Penalty Arc */}
                    <div className="absolute top-36 left-1/2 -translate-x-1/2 w-56 h-28 border-4 border-white/40 border-b-0 border-l-0 border-r-0 rounded-t-full" />

                    {/* Bottom Penalty Area */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-96 h-36 border-4 border-white/40 border-b-0 rounded-t-sm" />
                    {/* Bottom Goal Area */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-48 h-20 border-4 border-white/40 border-b-0 rounded-t-sm" />
                    {/* Bottom Penalty Spot */}
                    <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-2 h-2 bg-white/50 rounded-full" />
                    {/* Bottom Penalty Arc */}
                    <div className="absolute bottom-36 left-1/2 -translate-x-1/2 w-56 h-28 border-4 border-white/40 border-t-0 border-l-0 border-r-0 rounded-b-full" />

                    {/* Corner Arcs */}
                    <div className="absolute top-8 left-8 w-8 h-8 border-4 border-white/40 border-t-0 border-l-0 rounded-br-full" />
                    <div className="absolute top-8 right-8 w-8 h-8 border-4 border-white/40 border-t-0 border-r-0 rounded-bl-full" />
                    <div className="absolute bottom-8 left-8 w-8 h-8 border-4 border-white/40 border-b-0 border-l-0 rounded-tr-full" />
                    <div className="absolute bottom-8 right-8 w-8 h-8 border-4 border-white/40 border-b-0 border-r-0 rounded-tl-full" />
                </div>

                {/* 3D Depth Shadow Effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30 pointer-events-none" />

                {/* Players in Formation */}
                <div className="relative z-10 py-12 px-4 space-y-8">
                    {/* Line 1: Goalkeeper */}
                    {goalkeepers.length > 0 && (
                        <div className="flex justify-center">
                            <div className="w-32">
                                {goalkeepers.slice(0, 1).map((player: any, idx: number) => {
                                    const team = getTeam(player.team);
                                    return (
                                        <PitchPlayerCard
                                            key={player.id}
                                            player={player}
                                            team={team}
                                            teams={teams}
                                            fixtures={fixtures}
                                            currentEvent={currentEvent}
                                            rank={showRanks ? idx + 1 : undefined}
                                            onClick={() => onPlayerClick(player)}
                                            showRank={showRanks}
                                            pick={picksMap?.get(player.id)}
                                            expectedPoints={getExpectedPoints ? getExpectedPoints(player) : undefined}
                                            isSquadView={isSquadView}
                                            isHistoryView={isHistoryView}
                                            getHistoricalExpectedPoints={getHistoricalExpectedPoints}
                                            getHistoricalActualPoints={getHistoricalActualPoints}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Line 2: Defenders */}
                    {defenders.length > 0 && (
                        <div className="flex justify-center gap-2 flex-wrap max-w-5xl mx-auto">
                            {defenders.slice(0, 5).map((player: any, idx: number) => {
                                const team = getTeam(player.team);
                                return (
                                    <div key={player.id} className="w-32">
                                        <PitchPlayerCard
                                            player={player}
                                            team={team}
                                            teams={teams}
                                            fixtures={fixtures}
                                            currentEvent={currentEvent}
                                            rank={showRanks ? idx + 1 : undefined}
                                            onClick={() => onPlayerClick(player)}
                                            showRank={showRanks}
                                            pick={picksMap?.get(player.id)}
                                            expectedPoints={getExpectedPoints ? getExpectedPoints(player) : undefined}
                                            isSquadView={isSquadView}
                                            isHistoryView={isHistoryView}
                                            getHistoricalExpectedPoints={getHistoricalExpectedPoints}
                                            getHistoricalActualPoints={getHistoricalActualPoints}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Line 3: Midfielders */}
                    {midfielders.length > 0 && (
                        <div className="flex justify-center gap-2 flex-wrap max-w-5xl mx-auto">
                            {midfielders.slice(0, 5).map((player: any, idx: number) => {
                                const team = getTeam(player.team);
                                return (
                                    <div key={player.id} className="w-32">
                                        <PitchPlayerCard
                                            player={player}
                                            team={team}
                                            teams={teams}
                                            fixtures={fixtures}
                                            currentEvent={currentEvent}
                                            rank={showRanks ? idx + 1 : undefined}
                                            onClick={() => onPlayerClick(player)}
                                            showRank={showRanks}
                                            pick={picksMap?.get(player.id)}
                                            expectedPoints={getExpectedPoints ? getExpectedPoints(player) : undefined}
                                            isSquadView={isSquadView}
                                            isHistoryView={isHistoryView}
                                            getHistoricalExpectedPoints={getHistoricalExpectedPoints}
                                            getHistoricalActualPoints={getHistoricalActualPoints}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Line 4: Forwards */}
                    {forwards.length > 0 && (
                        <div className="flex justify-center gap-2 flex-wrap max-w-4xl mx-auto">
                            {forwards.slice(0, 3).map((player: any, idx: number) => {
                                const team = getTeam(player.team);
                                return (
                                    <div key={player.id} className="w-32">
                                        <PitchPlayerCard
                                            player={player}
                                            team={team}
                                            teams={teams}
                                            fixtures={fixtures}
                                            currentEvent={currentEvent}
                                            rank={showRanks ? idx + 1 : undefined}
                                            onClick={() => onPlayerClick(player)}
                                            showRank={showRanks}
                                            pick={picksMap?.get(player.id)}
                                            expectedPoints={getExpectedPoints ? getExpectedPoints(player) : undefined}
                                            isSquadView={isSquadView}
                                            isHistoryView={isHistoryView}
                                            getHistoricalExpectedPoints={getHistoricalExpectedPoints}
                                            getHistoricalActualPoints={getHistoricalActualPoints}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Stadium Atmosphere - Vignette */}
                <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.4)] pointer-events-none" />
            </div>
        </div>
    );
}

