import { getTeamShortName } from '@/lib/fixture-utils';

interface FixtureDifficultyProps {
    teamId: number;
    fixtures: any[];
    teams: any[];
    currentEvent: number | { id: number };
    compact?: boolean; // For smaller cards
}

function getTeamBadgeUrl(teamCode: number): string {
    return `https://resources.premierleague.com/premierleague/badges/70/t${teamCode}.png`;
}

const getFDRBorderColor = (difficulty: number) => {
    switch (difficulty) {
        case 1:
            return 'border-positive bg-positive-muted'; // Very Easy
        case 2:
            return 'border-lime-500 bg-lime-500/20'; // Easy - Lime/Green-Yellow
        case 3:
            return 'border-yellow-500 bg-yellow-500/20'; // Moderate - Yellow
        case 4:
            return 'border-orange-500 bg-orange-500/20'; // Difficult - Orange
        case 5:
            return 'border-negative bg-negative-muted'; // Very Difficult
        default:
            return 'border-gray-500 bg-gray-500/20';
    }
};

const getFDRTextColor = (difficulty: number) => {
    switch (difficulty) {
        case 1:
            return 'text-positive'; // Very Easy
        case 2:
            return 'text-lime-700'; // Easy - Lime
        case 3:
            return 'text-yellow-700'; // Moderate - Yellow
        case 4:
            return 'text-orange-700'; // Difficult - Orange
        case 5:
            return 'text-negative'; // Very Difficult
        default:
            return 'text-gray-700';
    }
};

export function FixtureDifficulty({ teamId, fixtures, teams, currentEvent, compact = false }: FixtureDifficultyProps) {
    // Get FDR background color for shading (used in both compact and standard versions)
    // 5-step gradient: Green (1) -> Lime (2) -> Yellow (3) -> Orange (4) -> Red (5)
    const getFDRBgColor = (difficulty: number) => {
        switch (difficulty) {
            case 1:
                return 'bg-positive/45'; // Very Easy
            case 2:
                return 'bg-lime-500/50'; // Easy - Lime/Green-Yellow (stronger opacity for clarity)
            case 3:
                return 'bg-yellow-500/50'; // Moderate - Yellow (stronger opacity for clarity)
            case 4:
                return 'bg-orange-500/50'; // Difficult - Orange (stronger opacity for clarity)
            case 5:
                return 'bg-negative/45'; // Very Difficult
            default:
                return 'bg-gray-500/40';
        }
    };

    // Normalize currentEvent to a number
    const currentEventNum = typeof currentEvent === 'number' ? currentEvent : (typeof currentEvent === 'object' && currentEvent !== null && 'id' in currentEvent ? (currentEvent as any).id : 1);
    
    // Get next 3 fixtures for this team
    // IMPORTANT: Show fixtures starting from NEXT gameweek (currentEvent + 1), not current
    // Also exclude finished fixtures
    const nextFixtures = fixtures
        .filter((f: any) => {
            const isTeamInFixture = f.team_h === teamId || f.team_a === teamId;
            // Show fixtures from NEXT gameweek onwards (not current)
            const isFuture = f.event > currentEventNum;
            // Exclude finished fixtures
            const isNotFinished = !f.finished;
            return isTeamInFixture && isFuture && isNotFinished;
        })
        .sort((a: any, b: any) => a.event - b.event)
        .slice(0, 3);

    if (nextFixtures.length === 0) {
        return <div className={`${compact ? 'text-[8px]' : 'text-[10px]'} text-muted-foreground text-center`}>No fixtures</div>;
    }

    if (compact) {
        // Compact version for player cards - smaller badges with team name below

        return (
            <div className="flex flex-col gap-1 items-center w-full overflow-visible">
                <div className="flex gap-0.5 sm:gap-1 justify-center w-full px-0.5 overflow-visible">
                    {nextFixtures.map((fixture: any, idx: number) => {
                        const isHome = fixture.team_h === teamId;
                        const opponentId = isHome ? fixture.team_a : fixture.team_h;
                        const difficulty = isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty;
                        const opponent = teams.find((t: any) => t.id === opponentId);
                        const homeAway = isHome ? 'H' : 'A';
                        const badgeUrl = opponent ? getTeamBadgeUrl(opponent.code) : '';
                        const borderColor = getFDRBorderColor(difficulty);
                        const textColor = getFDRTextColor(difficulty);
                        const bgShade = getFDRBgColor(difficulty);

                        // Extract border color class (e.g., 'border-green-600' from 'border-green-600 bg-green-600/20')
                        const borderClass = borderColor.split(' ')[0];

                        return (
                            <div
                                key={idx}
                                className="flex flex-col items-center gap-0.5 flex-1 min-w-0 overflow-visible"
                                title={`GW${fixture.event}: ${opponent?.name || 'TBC'} (${homeAway})`}
                            >
                                {/* Team Badge - No H/A badge on top */}
                                <div className={`relative w-4 h-4 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full border-2 overflow-hidden ${borderClass} flex items-center justify-center flex-shrink-0 shadow-md z-10`}>
                                    {/* FDR Background Shade */}
                                    <div className={`absolute inset-0 rounded-full ${bgShade} z-0`} />
                                    
                                    {/* Team Badge as Background - More visible */}
                                    {badgeUrl ? (
                                        <div className="absolute inset-0 flex items-center justify-center z-[1] p-1 rounded-full overflow-hidden">
                                            <img
                                                src={badgeUrl}
                                                alt={opponent?.short_name || '?'}
                                                className="w-full h-full object-contain opacity-80"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <div className="absolute inset-0 bg-gray-200 opacity-40 z-[1] rounded-full" />
                                    )}
                                </div>
                                
                                {/* Team Name Below with H/A in brackets */}
                                <div className="text-center w-full min-w-0 mt-0.5">
                                    <p className={`text-[7px] sm:text-[9px] md:text-[10px] font-bold ${textColor} leading-tight truncate`}>
                                        {opponent?.short_name || 'TBC'} <span className="text-gray-600 font-normal">({homeAway})</span>
                                    </p>
                                    <p className="text-[6px] sm:text-[8px] md:text-[9px] text-gray-500 leading-tight mt-0.5">
                                        GW{fixture.event}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // Standard version for larger cards
    return (
        <div className="flex flex-col gap-1.5 items-center w-full">
            <div className="flex gap-1.5 justify-center w-full">
                {nextFixtures.map((fixture: any, idx: number) => {
                    const isHome = fixture.team_h === teamId;
                    const opponentId = isHome ? fixture.team_a : fixture.team_h;
                    const difficulty = isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty;
                    const opponent = teams.find((t: any) => t.id === opponentId);
                    const homeAway = isHome ? 'H' : 'A';
                    const badgeUrl = opponent ? getTeamBadgeUrl(opponent.code) : '';
                    const borderColor = getFDRBorderColor(difficulty);
                    const textColor = getFDRTextColor(difficulty);
                    const bgShade = getFDRBgColor(difficulty);
                    const borderClass = borderColor.split(' ')[0];

                    return (
                        <div
                            key={idx}
                            className="flex flex-col items-center gap-0.5 flex-1 min-w-0"
                            title={`GW${fixture.event}: ${opponent?.name || 'TBC'} (${homeAway})`}
                        >
                            {/* Team Badge - No H/A badge on top */}
                            <div className={`relative w-8 h-8 rounded-full border-2 overflow-hidden ${borderClass} flex items-center justify-center flex-shrink-0 shadow-md`}>
                                {/* FDR Background Shade */}
                                <div className={`absolute inset-0 rounded-full ${bgShade} z-0`} />
                                
                                {/* Team Badge as Background */}
                                {badgeUrl ? (
                                    <div className="absolute inset-0 flex items-center justify-center z-[1] p-1 rounded-full overflow-hidden">
                                        <img
                                            src={badgeUrl}
                                            alt={opponent?.short_name || '?'}
                                            className="w-full h-full object-contain opacity-80"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 bg-gray-200 opacity-40 z-[1] rounded-full" />
                                )}
                            </div>
                            
                            {/* Team Name Below with H/A in brackets */}
                            <div className="text-center w-full min-w-0">
                                <p className={`text-[10px] sm:text-xs font-bold ${textColor} leading-tight truncate`}>
                                    {opponent?.short_name || 'TBC'} <span className="text-gray-600 font-normal">({homeAway})</span>
                                </p>
                                <p className="text-[8px] sm:text-[9px] text-gray-500 leading-tight">
                                    GW{fixture.event}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
