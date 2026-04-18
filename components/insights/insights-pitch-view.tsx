'use client';

import { X, Cross, Ban, Eye } from 'lucide-react';
import { FixtureDifficulty } from './fixture-difficulty';
import { getPlayerPhotoUrls, getPlayerInitials, PLAYER_HEADSHOT_IMG_CLASSNAME } from '@/lib/player-photo-utils';
import { cn } from '@/lib/utils';
import { TeamBadgeImage } from '@/components/team-badge-image';
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
    getHistoricalGWStats?: (playerId: number) => any | null; // Function to get historical gameweek stats
}

function PitchPlayerCard({ player, team, teams, fixtures, currentEvent, rank, onClick, showRank = true, pick, expectedPoints, isSquadView = false, isHistoryView = false, getHistoricalExpectedPoints, getHistoricalActualPoints, getHistoricalGWStats }: any) {
    const [photoUrlIndex, setPhotoUrlIndex] = useState(0);
    const [photoFailed, setPhotoFailed] = useState(false);
    const photoUrls = getPlayerPhotoUrls({
        code: player.code,
        photo: player.photo,
        web_name: player.web_name,
        team: player.team,
        elementId: player.id,
    });

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
            className="relative group w-full aspect-[9/16] max-w-[48px] sm:max-w-[140px] md:max-w-[150px] lg:max-w-[160px]"
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
                        <div className={`absolute top-0 left-0 z-50 w-5 h-5 rounded-full flex items-center justify-center shadow-xl border-2 ${
                            injurySeverity === 'severe'
                                ? 'bg-red-600 border-red-400'
                                : injurySeverity === 'moderate'
                                ? 'bg-orange-500 border-orange-300'
                                : 'bg-yellow-500 border-yellow-300'
                        }`}>
                            <Cross className="w-3 h-3 text-white" strokeWidth={3} />
                        </div>
                    </>
                )}

                {/* Suspended Tag - Top Left (if not C/VC and not injured) */}
                {isSuspended && !pick?.is_captain && !pick?.is_vice_captain && !isInjured && (
                    <div className="absolute top-0 left-0 z-50 bg-gradient-to-br from-gray-800 to-gray-900 text-white px-1.5 py-0.5 rounded-br-lg rounded-tl-xl shadow-xl border-2 border-gray-600 flex items-center gap-1">
                        <Ban className="w-2.5 h-2.5" />
                        <span className="text-[7px] font-black uppercase">SUSP</span>
                    </div>
                )}

                {/* Suspended Tag - Top Right (if C/VC badge exists or if injured) */}
                {isSuspended && (pick?.is_captain || pick?.is_vice_captain || isInjured) && (
                    <div className="absolute top-0.5 right-0.5 z-50 bg-gradient-to-br from-gray-800 to-gray-900 text-white px-1.5 py-0.5 rounded-lg shadow-xl border-2 border-gray-600 flex items-center gap-1">
                        <Ban className="w-2.5 h-2.5" />
                        <span className="text-[7px] font-black uppercase">SUSP</span>
                    </div>
                )}

                {/* Captain Badge - Top Left (if not injured) */}
                {pick?.is_captain && !isInjured && (
                    <div className="absolute top-0 left-0 w-7 h-7 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-xl z-30 border-2 border-yellow-300">
                        <span className="text-[8px] font-black text-yellow-900">C</span>
                    </div>
                )}
                {/* Vice Captain Badge - Top Left (if not captain and not injured) */}
                {pick?.is_vice_captain && !pick?.is_captain && !isInjured && (
                    <div className="absolute top-0 left-0 w-7 h-7 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center shadow-xl z-30 border-2 border-gray-300">
                        <span className="text-[8px] font-black text-gray-900">VC</span>
                    </div>
                )}
                {/* Captain Badge - Top Right (if injured) */}
                {pick?.is_captain && isInjured && (
                    <div className="absolute top-0 right-0 w-5 h-5 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-xl z-30 border-2 border-yellow-300">
                        <span className="text-[6px] font-black text-yellow-900">C</span>
                    </div>
                )}
                {/* Vice Captain Badge - Top Right (if captain exists and injured, or if injured) */}
                {pick?.is_vice_captain && !pick?.is_captain && isInjured && (
                    <div className="absolute top-0 right-0 w-5 h-5 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center shadow-xl z-30 border-2 border-gray-300">
                        <span className="text-[6px] font-black text-gray-900">VC</span>
                    </div>
                )}
                {/* Rank Badge - Top Left (only if no C/VC badge and not suspended/injured) */}
                {rank && showRank && !pick?.is_captain && !pick?.is_vice_captain && !isSuspended && !isInjured && (
                    <div className="absolute top-0 left-0 w-4 h-4 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg z-20 border-2 border-yellow-300">
                        <span className="text-[6px] font-black text-yellow-900">#{rank}</span>
                    </div>
                )}

                <div className={`bg-gradient-to-br from-gray-50 to-white overflow-hidden h-full flex flex-col border-2 border-gray-300/70 ${isSquadView ? 'rounded-xl' : 'rounded-lg'}`} style={{ maxHeight: '100%' }}>
                    {isSquadView ? (
                        <>
                            {/* Squad View Format: Top Section (Solid Team Color) with Team Badge */}
                            <div className={`relative flex-shrink-0 ${colors.accent} flex items-center justify-center overflow-hidden`} style={{ height: '22%' }}>
                                {/* Player Photo */}
                                <div className="relative z-10 w-6 h-6 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full overflow-hidden border-2 border-white shadow-xl bg-gradient-to-br from-white to-gray-100">
                                    {!photoFailed ? (
                                        <img
                                            key={photoUrlIndex}
                                            src={currentPhotoUrl}
                                            alt={player.web_name}
                                            className={cn('w-full h-full', PLAYER_HEADSHOT_IMG_CLASSNAME)}
                                            onError={handlePhotoError}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-lg md:text-2xl font-bold text-orange-800 bg-white">
                                            {getPlayerInitials(player.web_name)}
                                        </div>
                                    )}
                                </div>

                                {/* Team Badge - Top Right Corner */}
                                {team && (
                                    <div className="absolute top-1 right-1 z-10">
                                        <div className="w-3 h-3 sm:w-6 sm:h-6 md:w-7 md:h-7 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-white/70 overflow-hidden">
                                            <TeamBadgeImage
                                                teamCode={team.code}
                                                alt={team.short_name}
                                                className="w-2.5 h-2.5 sm:w-5 sm:h-5 md:w-6 md:h-6 object-contain"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Middle Section (Dark Blue/Black) with Name, Team, Position Badge - Slim and Consistent */}
                            <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 text-white px-0.5 sm:px-3 md:px-4 py-0.5 text-center flex-shrink-0" style={{ minHeight: '22px', height: 'auto' }}>
                                <p className="text-[8px] sm:text-xs md:text-sm font-black tracking-wide uppercase truncate drop-shadow-lg leading-tight">{player.web_name}</p>
                                <p className="text-[7px] sm:text-[10px] md:text-xs text-gray-200 font-semibold truncate leading-tight mt-0.5">{team?.short_name}</p>
                                <div className="flex justify-center mt-0.5">
                                    <div className={`${colors.accent} text-white px-0.5 sm:px-2 md:px-2.5 py-0.5 text-[7px] sm:text-[9px] md:text-[10px] font-bold shadow-md rounded`}>
                                        {positionName}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Default View: Top Section: Player Photo + Team Badge */}
                            <div className={`relative flex-shrink-0 bg-gradient-to-br ${colors.primary} ${colors.text} flex items-center justify-center overflow-hidden`} style={{ height: '22%' }}>
                                <div className="absolute inset-0 opacity-10">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_60%)]" />
                                </div>

                                {/* Player Photo */}
                                <div className="relative z-10 w-6 h-6 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full overflow-hidden border-2 border-white shadow-xl bg-gradient-to-br from-white to-gray-100">
                                    {!photoFailed ? (
                                        <img
                                            key={photoUrlIndex}
                                            src={currentPhotoUrl}
                                            alt={player.web_name}
                                            className={cn('w-full h-full', PLAYER_HEADSHOT_IMG_CLASSNAME)}
                                            onError={handlePhotoError}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-lg md:text-2xl font-bold text-orange-800 bg-white">
                                            {getPlayerInitials(player.web_name)}
                                        </div>
                                    )}
                                </div>

                                {/* Team Badge - Top Right Corner */}
                                {team && (
                                    <div className="absolute top-1 right-1 z-10">
                                        <div className={`w-3 h-3 sm:w-7 sm:h-7 md:w-8 md:h-8 ${colors.accent} rounded-full flex items-center justify-center shadow-lg border-2 border-white/70 overflow-hidden bg-white`}>
                                            <TeamBadgeImage
                                                teamCode={team.code}
                                                alt={team.short_name}
                                                className="w-2.5 h-2.5 sm:w-5 sm:h-5 md:w-6 md:h-6 object-contain"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Center Bar: Player Name */}
                            <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 text-white px-0.5 sm:px-3 md:px-4 py-0.5 text-center border-y border-white/10 flex-shrink-0">
                                <p className="text-[8px] sm:text-xs md:text-sm font-black tracking-wide uppercase truncate drop-shadow-lg leading-tight">{player.web_name}</p>
                                <p className="text-[7px] sm:text-[10px] md:text-xs text-gray-300 font-semibold truncate">{team?.short_name}</p>
                            </div>

                            {/* Position Badge */}
                            <div className="flex justify-center -mt-1 relative z-10 flex-shrink-0">
                                <div className={`bg-gradient-to-r ${colors.primary} text-white px-0.5 sm:px-2 md:px-2.5 py-0.5 text-[7px] sm:text-[9px] md:text-[10px] font-bold shadow-md rounded`}>
                                    {positionName}
                                </div>
                            </div>
                        </>
                    )}

                    <div className={`flex-1 flex flex-col justify-start p-1 sm:p-2 md:p-2.5 min-h-0 overflow-visible`} style={{ minHeight: '0' }}>
                        {isHistoryView ? (
                            <>
                                {/* History View: Expected vs Actual Points + Gameweek Stats */}
                                {(() => {
                                    const historicalXPoints = getHistoricalExpectedPoints ? getHistoricalExpectedPoints(player) : 0;
                                    const historicalActualPoints = getHistoricalActualPoints ? getHistoricalActualPoints(player.id) : null;
                                    const difference = historicalActualPoints !== null ? (historicalActualPoints - historicalXPoints) : null;
                                    const gwStats = getHistoricalGWStats ? getHistoricalGWStats(player.id) : null;
                                    const positionType = player.element_type; // 1=GKP, 2=DEF, 3=MID, 4=FWD
                                    
                                    return (
                                        <div className="space-y-1.5">
                                            {/* Expected vs Actual Points Row */}
                                            <div className="grid grid-cols-2 gap-1.5">
                                                {/* Expected Points - Left */}
                                                <div className="bg-gradient-to-br from-cyan-100 to-cyan-50 rounded-lg p-1 sm:p-1.5 md:p-2 text-center border-2 border-cyan-500 shadow-sm flex flex-col justify-center items-center" style={{ minHeight: '36px', height: 'auto' }}>
                                                    <p className="text-[7px] sm:text-[8px] md:text-[9px] text-gray-800 font-bold uppercase leading-tight mb-0.5">EXPECTED</p>
                                                    <p className="text-xs sm:text-sm md:text-base font-black text-cyan-700 leading-none">{historicalXPoints.toFixed(1)}</p>
                                                </div>
                                                
                                                {/* Actual Points - Right */}
                                                <div className={`rounded-lg p-1 sm:p-1.5 md:p-2 text-center border-2 shadow-lg flex flex-col justify-center items-center ${
                                                    historicalActualPoints !== null 
                                                        ? difference !== null && difference > 0
                                                            ? 'bg-gradient-to-br from-green-500 to-green-600 border-green-700'
                                                            : difference !== null && difference < 0
                                                            ? 'bg-gradient-to-br from-red-500 to-red-600 border-red-700'
                                                            : 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-700'
                                                        : 'bg-gradient-to-br from-gray-400 to-gray-500 border-gray-600'
                                                }`} style={{ minHeight: '36px', height: 'auto' }}>
                                                    <p className="text-[7px] sm:text-[8px] md:text-[9px] text-white font-bold uppercase leading-tight opacity-90 mb-0.5">ACTUAL</p>
                                                    <p className="text-sm sm:text-base md:text-lg font-black leading-none text-white">
                                                        {historicalActualPoints !== null ? historicalActualPoints : '-'}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            {/* Gameweek Stats Grid - Position-specific stats */}
                                            {gwStats && (
                                                <div className="grid grid-cols-3 gap-0 sm:gap-1">
                                                    {/* Goals (for MID/FWD) or Saves (for GKP) or Clean Sheets (for DEF) */}
                                                    {positionType === 1 ? (
                                                        <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-md p-0.5 sm:p-1 text-center border border-blue-400">
                                                            <p className="text-[6px] sm:text-[7px] md:text-[8px] text-gray-700 font-bold uppercase leading-tight">SAVES</p>
                                                            <p className="text-[9px] sm:text-[10px] md:text-xs font-black text-blue-700 leading-none">{gwStats.saves || 0}</p>
                                                        </div>
                                                    ) : positionType === 2 ? (
                                                        <div className="bg-gradient-to-br from-green-100 to-green-50 rounded-md p-0.5 sm:p-1 text-center border border-green-400">
                                                            <p className="text-[6px] sm:text-[7px] md:text-[8px] text-gray-700 font-bold uppercase leading-tight">CS</p>
                                                            <p className="text-[9px] sm:text-[10px] md:text-xs font-black text-green-700 leading-none">{gwStats.cleanSheets || 0}</p>
                                                        </div>
                                                    ) : (
                                                        <div className="bg-gradient-to-br from-purple-100 to-purple-50 rounded-md p-0.5 sm:p-1 text-center border border-purple-400">
                                                            <p className="text-[6px] sm:text-[7px] md:text-[8px] text-gray-700 font-bold uppercase leading-tight">GOALS</p>
                                                            <p className="text-[9px] sm:text-[10px] md:text-xs font-black text-purple-700 leading-none">{gwStats.goals || 0}</p>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Assists */}
                                                    <div className="bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-md p-0.5 sm:p-1 text-center border border-yellow-400">
                                                        <p className="text-[6px] sm:text-[7px] md:text-[8px] text-gray-700 font-bold uppercase leading-tight">ASSISTS</p>
                                                        <p className="text-[9px] sm:text-[10px] md:text-xs font-black text-yellow-700 leading-none">{gwStats.assists || 0}</p>
                                                    </div>
                                                    
                                                    {/* Bonus Points */}
                                                    <div className="bg-gradient-to-br from-orange-100 to-orange-50 rounded-md p-0.5 sm:p-1 text-center border border-orange-400">
                                                        <p className="text-[6px] sm:text-[7px] md:text-[8px] text-gray-700 font-bold uppercase leading-tight">BONUS</p>
                                                        <p className="text-[9px] sm:text-[10px] md:text-xs font-black text-orange-700 leading-none">{gwStats.bonus || 0}</p>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {/* Minutes & Cards Row (if stats available) */}
                                            {gwStats && (
                                                <div className="grid grid-cols-2 gap-1">
                                                    {/* Minutes */}
                                                    <div className="bg-gradient-to-br from-gray-100 to-gray-50 rounded-md p-0.5 sm:p-1 text-center border border-gray-300">
                                                        <p className="text-[6px] sm:text-[7px] md:text-[8px] text-gray-700 font-bold uppercase leading-tight">MINS</p>
                                                        <p className="text-[9px] sm:text-[10px] md:text-xs font-black text-gray-700 leading-none">{gwStats.minutes || 0}'</p>
                                                    </div>
                                                    
                                                    {/* Cards (Yellow/Red) */}
                                                    {(gwStats.yellowCards > 0 || gwStats.redCards > 0) ? (
                                                        <div className={`rounded-md p-0.5 sm:p-1 text-center border ${
                                                            gwStats.redCards > 0 
                                                                ? 'bg-gradient-to-br from-red-100 to-red-50 border-red-400'
                                                                : 'bg-gradient-to-br from-yellow-100 to-yellow-50 border-yellow-400'
                                                        }`}>
                                                            <p className="text-[6px] sm:text-[7px] md:text-[8px] text-gray-700 font-bold uppercase leading-tight">CARDS</p>
                                                            <p className={`text-[9px] sm:text-[10px] md:text-xs font-black leading-none ${
                                                                gwStats.redCards > 0 ? 'text-red-700' : 'text-yellow-700'
                                                            }`}>
                                                                {gwStats.yellowCards > 0 && `${gwStats.yellowCards}Y`}
                                                                {gwStats.yellowCards > 0 && gwStats.redCards > 0 && ' '}
                                                                {gwStats.redCards > 0 && `${gwStats.redCards}R`}
                                                                {gwStats.yellowCards === 0 && gwStats.redCards === 0 && '-'}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className="bg-gradient-to-br from-gray-100 to-gray-50 rounded-md p-0.5 sm:p-1 text-center border border-gray-300">
                                                            <p className="text-[6px] sm:text-[7px] md:text-[8px] text-gray-700 font-bold uppercase leading-tight">CARDS</p>
                                                            <p className="text-[9px] sm:text-[10px] md:text-xs font-black text-gray-500 leading-none">-</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </>
                        ) : isSquadView ? (
                            <>
                                {/* Squad View: Form (Left), GW Points (Center), Expected Points (Right) - All Same Height */}
                                <div className="grid grid-cols-3 gap-0 sm:gap-1.5 mb-0.5">
                                    {/* Form - Left */}
                                    <div className="bg-gradient-to-br from-orange-100 to-orange-50 rounded-md p-0.5 sm:p-1 md:p-1.5 text-center border-2 border-orange-500 shadow-sm flex flex-col justify-center items-center" style={{ minHeight: '22px', height: 'auto' }}>
                                        <p className="text-[6px] sm:text-[9px] md:text-[10px] text-gray-700 font-bold uppercase leading-tight mb-0.5">FORM</p>
                                        <p className="text-[8px] sm:text-sm md:text-base font-black text-orange-700 leading-none">{form.toFixed(1)}</p>
                                    </div>
                                    
                                    {/* GW Points - Center (Most Prominent) - Red if lower than expected, Green if equal/higher */}
                                    <div className={`rounded-md p-0.5 sm:p-1 md:p-1.5 text-center border-2 shadow-lg flex flex-col justify-center items-center ${
                                        gwPoints !== null 
                                            ? (gwPoints < xPoints 
                                                ? 'bg-gradient-to-br from-red-500 to-red-600 border-red-700' 
                                                : 'bg-gradient-to-br from-green-500 to-green-600 border-green-700')
                                            : 'bg-gradient-to-br from-gray-400 to-gray-500 border-gray-600'
                                    }`} style={{ minHeight: '22px', height: 'auto' }}>
                                        <p className="text-[6px] sm:text-[9px] md:text-[10px] text-white font-bold uppercase leading-tight opacity-95 mb-0.5">GW</p>
                                        <p className="text-[8px] sm:text-base md:text-lg font-black leading-none text-white">
                                            {gwPoints !== null ? gwPoints : '-'}
                                        </p>
                                    </div>
                                    
                                    {/* Expected Points This GW - Right */}
                                    <div className="bg-gradient-to-br from-cyan-100 to-cyan-50 rounded-md p-0.5 sm:p-1 md:p-1.5 text-center border-2 border-cyan-500 shadow-sm flex flex-col justify-center items-center" style={{ minHeight: '22px', height: 'auto' }}>
                                        <p className="text-[6px] sm:text-[9px] md:text-[10px] text-gray-700 font-bold uppercase leading-tight mb-0.5">XPTS</p>
                                        <p className="text-[8px] sm:text-sm md:text-base font-black text-cyan-700 leading-none">{xPoints.toFixed(1)}</p>
                                    </div>
                                </div>

                                {/* Next Fixtures - More space allocated */}
                                <div className="flex-shrink-0 mt-0.5 pb-0.5">
                                    <p className="text-[7px] sm:text-[10px] md:text-xs text-gray-700 font-bold mb-0.5 text-center">Next 3:</p>
                                    <div className="w-full overflow-visible min-h-[36px]">
                                        <FixtureDifficulty
                                            teamId={team?.id || player.team}
                                            fixtures={fixtures}
                                            teams={teams}
                                            currentEvent={currentEvent}
                                            compact={true}
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Default View: Form (Left), GW Points (Center), Expected Points (Right) */}
                                <div className="grid grid-cols-3 gap-0 sm:gap-1 mb-0.5">
                                    {/* Form - Left */}
                                    <div className="bg-gradient-to-br from-orange-100 to-orange-50 rounded-lg p-0.5 md:p-1 text-center border-2 border-orange-500 shadow-sm">
                                        <p className="text-[6px] md:text-[9px] text-gray-800 font-bold uppercase leading-tight">Form</p>
                                        <p className="text-[8px] md:text-sm font-black text-orange-700 leading-tight">{form.toFixed(1)}</p>
                                    </div>
                                    
                                    {/* GW Points - Center (Most Prominent) - Red if lower than expected, Green if equal/higher */}
                                    <div className={`rounded-lg p-0.5 md:p-1 text-center border-2 shadow-lg ${
                                        gwPoints !== null 
                                            ? (gwPoints < xPoints 
                                                ? 'bg-gradient-to-br from-red-500 to-red-600 border-red-700' 
                                                : 'bg-gradient-to-br from-green-500 to-green-600 border-green-700')
                                            : 'bg-gradient-to-br from-gray-400 to-gray-500 border-gray-600'
                                    }`}>
                                        <p className="text-[6px] md:text-[9px] text-white font-bold uppercase leading-tight opacity-90">GW PTS</p>
                                        <p className="text-[8px] md:text-base font-black leading-tight text-white">
                                            {gwPoints !== null ? gwPoints : '-'}
                                        </p>
                                    </div>
                                    
                                    {/* Expected Points This GW - Right */}
                                    <div className="bg-gradient-to-br from-cyan-100 to-cyan-50 rounded-lg p-0.5 md:p-1 text-center border-2 border-cyan-500 shadow-sm">
                                        <p className="text-[6px] md:text-[9px] text-gray-800 font-bold uppercase leading-tight">xPts</p>
                                        <p className="text-[8px] md:text-sm font-black text-cyan-700 leading-tight">{xPoints.toFixed(1)}</p>
                                    </div>
                                </div>

                                {/* Next Fixtures - More space allocated */}
                                <div className="flex-shrink-0 mt-0.5 pb-0.5">
                                    <p className="text-[7px] sm:text-[10px] md:text-xs text-gray-700 font-bold mb-0.5 text-center">Next 3:</p>
                                    <div className="w-full overflow-visible min-h-[36px]">
                                        <FixtureDifficulty
                                            teamId={team?.id || player.team}
                                            fixtures={fixtures}
                                            teams={teams}
                                            currentEvent={currentEvent}
                                            compact={true}
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
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
    getHistoricalActualPoints,
    getHistoricalGWStats
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
            <div className="flex justify-center gap-1 sm:gap-3 md:gap-4 flex-wrap items-start">
                {players.map((player: any, idx: number) => {
                    const team = getTeam(player.team);
                    return (
                        <div key={player.id} className="flex-shrink-0 w-[70px] sm:w-[140px] md:w-[150px] lg:w-[160px]">
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
                                getHistoricalGWStats={getHistoricalGWStats}
                            />
                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="relative overflow-x-auto overflow-y-hidden rounded-t-2xl md:rounded-t-3xl border-2 border-green-800 shadow-2xl w-full">
            {/* Realistic Pitch Background */}
            <div className="relative min-h-[380px] sm:min-h-[480px] md:min-h-[550px] lg:min-h-[600px] bg-gradient-to-b from-[#1a5a2a] via-[#1e6e33] to-[#154721]">
                {/* Detailed Grass Stripes Pattern */}
                <div className="absolute inset-0" style={{
                    backgroundImage: `
                        repeating-linear-gradient(
                            0deg,
                            rgba(255, 255, 255, 0.03) 0px,
                            rgba(255, 255, 255, 0.03) 40px,
                            transparent 40px,
                            transparent 80px
                        )
                    `,
                    backgroundSize: '100% 80px'
                }} />

                {/* Grass Texture Overlay */}
                <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)`,
                    backgroundSize: '4px 4px'
                }} />

                {/* Pitch Markings */}
                <div className="absolute inset-0">
                    {/* Outer Boundary */}
                    <div className="absolute inset-2 md:inset-4 border md:border-2 border-white/30 rounded-lg" />

                    {/* Halfway Line */}
                    <div className="absolute top-0 bottom-0 left-1/2 w-px md:w-0.5 bg-white/30" />

                    {/* Center Circle */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 md:w-40 md:h-40 border md:border-2 border-white/30 rounded-full" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 md:w-2 md:h-2 bg-white/40 rounded-full shadow-lg" />

                    {/* Top Penalty Area */}
                    <div className="absolute top-2 md:top-4 left-1/2 -translate-x-1/2 w-40 md:w-64 h-12 md:h-20 border md:border-2 border-white/30 border-t-0 rounded-b-sm" />
                    {/* Top Goal Area */}
                    <div className="absolute top-2 md:top-4 left-1/2 -translate-x-1/2 w-16 md:w-28 h-5 md:h-8 border md:border-2 border-white/30 border-t-0 rounded-b-sm" />
                    {/* Top Penalty Spot */}
                    <div className="absolute top-10 md:top-16 left-1/2 -translate-x-1/2 w-1 h-1 md:w-1.5 md:h-1.5 bg-white/40 rounded-full" />
                    {/* Top Penalty Arc */}
                    <div className="absolute top-14 md:top-24 left-1/2 -translate-x-1/2 w-16 md:w-28 h-8 md:h-12 border md:border-2 border-white/30 border-b-0 border-l-0 border-r-0 rounded-t-full" />

                    {/* Bottom Penalty Area */}
                    <div className="absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 w-40 md:w-64 h-12 md:h-20 border md:border-2 border-white/30 border-b-0 rounded-t-sm" />
                    {/* Bottom Goal Area */}
                    <div className="absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 w-16 md:w-28 h-5 md:h-8 border md:border-2 border-white/30 border-b-0 rounded-t-sm" />
                    {/* Bottom Penalty Spot */}
                    <div className="absolute bottom-10 md:bottom-16 left-1/2 -translate-x-1/2 w-1 h-1 md:w-1.5 md:h-1.5 bg-white/40 rounded-full" />
                    {/* Bottom Penalty Arc */}
                    <div className="absolute bottom-14 md:bottom-24 left-1/2 -translate-x-1/2 w-16 md:w-28 h-8 md:h-12 border md:border-2 border-white/30 border-t-0 border-l-0 border-r-0 rounded-b-full" />

                    {/* Corner Arcs */}
                    <div className="absolute top-2 md:top-4 left-2 md:left-4 w-3 h-3 md:w-4 md:h-4 border md:border-2 border-white/30 border-t-0 border-l-0 rounded-br-full" />
                    <div className="absolute top-2 md:top-4 right-2 md:right-4 w-3 h-3 md:w-4 md:h-4 border md:border-2 border-white/30 border-t-0 border-r-0 rounded-bl-full" />
                    <div className="absolute bottom-2 md:bottom-4 left-2 md:left-4 w-3 h-3 md:w-4 md:h-4 border md:border-2 border-white/30 border-b-0 border-l-0 rounded-tr-full" />
                    <div className="absolute bottom-2 md:bottom-4 right-2 md:right-4 w-3 h-3 md:w-4 md:h-4 border md:border-2 border-white/30 border-b-0 border-r-0 rounded-tl-full" />
                </div>

                {/* 3D Depth Shadow Effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20 pointer-events-none" />

                {/* Players in Formation */}
                <div className="relative z-10 py-1 sm:py-4 md:py-6 lg:py-8 px-0 sm:px-2 md:px-4 space-y-2 sm:space-y-4 md:space-y-6 lg:space-y-8 flex flex-col justify-between h-full min-h-[380px] sm:min-h-[480px] md:min-h-[550px] lg:min-h-[600px]">
                    {/* Line 1: Goalkeeper */}
                    {goalkeepers.length > 0 && (
                        <div className="flex justify-center">
                            <div className="w-[48px] sm:w-[140px] md:w-[150px] lg:w-[160px] mx-auto">
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
                                            getHistoricalGWStats={getHistoricalGWStats}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Line 2: Defenders */}
                    {defenders.length > 0 && (
                        <div className="flex justify-center items-start gap-0 sm:gap-2 md:gap-3 max-w-5xl mx-auto w-full px-0.5 sm:px-0">
                            {defenders.slice(0, 5).map((player: any, idx: number) => {
                                const team = getTeam(player.team);
                                return (
                                    <div key={player.id} className="flex-shrink-0 w-[48px] sm:w-[140px] md:w-[150px] lg:w-[160px]">
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
                                            getHistoricalGWStats={getHistoricalGWStats}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Line 3: Midfielders */}
                    {midfielders.length > 0 && (
                        <div className="flex justify-center items-start gap-0 sm:gap-2 md:gap-3 max-w-5xl mx-auto w-full px-0.5 sm:px-0">
                            {midfielders.slice(0, 5).map((player: any, idx: number) => {
                                const team = getTeam(player.team);
                                return (
                                    <div key={player.id} className="flex-shrink-0 w-[48px] sm:w-[140px] md:w-[150px] lg:w-[160px]">
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
                                            getHistoricalGWStats={getHistoricalGWStats}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Line 4: Forwards */}
                    {forwards.length > 0 && (
                        <div className="flex justify-center items-start gap-1 sm:gap-2 md:gap-3 max-w-4xl mx-auto w-full px-0.5 sm:px-0">
                            {forwards.slice(0, 3).map((player: any, idx: number) => {
                                const team = getTeam(player.team);
                                return (
                                    <div key={player.id} className="flex-shrink-0 w-[48px] sm:w-[140px] md:w-[150px] lg:w-[160px]">
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
                                            getHistoricalGWStats={getHistoricalGWStats}
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

