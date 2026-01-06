'use client';

function getTeamBadgeUrl(teamCode: number): string {
    return `https://resources.premierleague.com/premierleague/badges/70/t${teamCode}.png`;
}

const getFDRBorderColor = (difficulty: number) => {
    switch (difficulty) {
        case 1:
            return 'border-green-600 bg-green-600/20'; // Very Easy - Green
        case 2:
            return 'border-lime-500 bg-lime-500/20'; // Easy - Lime/Green-Yellow
        case 3:
            return 'border-yellow-500 bg-yellow-500/20'; // Moderate - Yellow
        case 4:
            return 'border-orange-500 bg-orange-500/20'; // Difficult - Orange
        case 5:
            return 'border-red-600 bg-red-600/20'; // Very Difficult - Red
        default:
            return 'border-gray-500 bg-gray-500/20';
    }
};

const getFDRTextColor = (difficulty: number) => {
    switch (difficulty) {
        case 1:
            return 'text-green-700'; // Very Easy - Green
        case 2:
            return 'text-lime-700'; // Easy - Lime
        case 3:
            return 'text-yellow-700'; // Moderate - Yellow
        case 4:
            return 'text-orange-700'; // Difficult - Orange
        case 5:
            return 'text-red-700'; // Very Difficult - Red
        default:
            return 'text-gray-700';
    }
};

// Calculate expected points based on fixture difficulty and player stats
function calculateExpectedPoints(fixture: any, player: any, isHome: boolean): number {
    const difficulty = isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty;
    const basePoints = parseFloat(player.ep_next) || parseFloat(player.form) || 0;
    
    // Adjust based on fixture difficulty (FDR: 1=easy, 5=very hard)
    // Easy fixtures (1-2): +20% bonus
    // Moderate (3): base
    // Difficult (4): -15%
    // Very Difficult (5): -30%
    let multiplier = 1.0;
    if (difficulty <= 2) multiplier = 1.2;
    else if (difficulty === 3) multiplier = 1.0;
    else if (difficulty === 4) multiplier = 0.85;
    else if (difficulty === 5) multiplier = 0.7;
    
    // Home advantage: +10%
    if (isHome) multiplier *= 1.1;
    
    return Math.max(0, basePoints * multiplier);
}

interface FixtureDetailViewProps {
    teamId: number;
    fixtures: any[];
    teams: any[];
    currentEvent: number;
    player: any;
}

export function FixtureDetailView({ teamId, fixtures, teams, currentEvent, player }: FixtureDetailViewProps) {
    // Normalize currentEvent to a number
    const currentEventNum = typeof currentEvent === 'number' ? currentEvent : (currentEvent?.id || 1);
    
    // Get next 10 fixtures for this team (excluding finished fixtures and current gameweek)
    // Show fixtures starting from NEXT gameweek (currentEvent + 1)
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
        .slice(0, 10);

    if (nextFixtures.length === 0) {
        return <div className="text-sm text-gray-600 p-4 text-center">No fixtures available</div>;
    }

    const nextFixture = nextFixtures[0];
    const nextFixtureIsHome = nextFixture.team_h === teamId;
    const nextFixtureExpectedPoints = calculateExpectedPoints(nextFixture, player, nextFixtureIsHome);

    return (
        <div className="space-y-4">
            {/* Next Game Highlight */}
            {nextFixture && (
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-3 border-2 border-blue-400 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-800">Next Game (GW{nextFixture.event})</span>
                        <span className="text-lg font-black text-blue-700">{nextFixtureExpectedPoints.toFixed(1)} xPts</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {(() => {
                            const opponentId = nextFixtureIsHome ? nextFixture.team_a : nextFixture.team_h;
                            const opponent = teams.find((t: any) => t.id === opponentId);
                            const difficulty = nextFixtureIsHome ? nextFixture.team_h_difficulty : nextFixture.team_a_difficulty;
                            return opponent ? (
                                <>
                                    <img
                                        src={getTeamBadgeUrl(opponent.code)}
                                        alt={opponent.short_name}
                                        className="w-6 h-6 object-contain"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                        }}
                                    />
                                    <span className="text-sm font-bold text-gray-900">{opponent.name}</span>
                                    <span className="text-xs font-semibold text-gray-600">({nextFixtureIsHome ? 'H' : 'A'})</span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${getFDRTextColor(difficulty)} ${getFDRBorderColor(difficulty).split(' ')[1]}`}>
                                        FDR {difficulty}
                                    </span>
                                </>
                            ) : null;
                        })()}
                    </div>
                </div>
            )}

            {/* All 10 Fixtures */}
            <div className="grid grid-cols-5 gap-2">
                {nextFixtures.map((fixture: any, idx: number) => {
                    const isHome = fixture.team_h === teamId;
                    const opponentId = isHome ? fixture.team_a : fixture.team_h;
                    const difficulty = isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty;
                    const opponent = teams.find((t: any) => t.id === opponentId);
                    const homeAway = isHome ? 'H' : 'A';
                    const badgeUrl = opponent ? getTeamBadgeUrl(opponent.code) : '';
                    const borderColor = getFDRBorderColor(difficulty);
                    const textColor = getFDRTextColor(difficulty);
                    const expectedPoints = calculateExpectedPoints(fixture, player, isHome);

                    // Extract border color class (first part of the borderColor string)
                    const actualBorderColor = borderColor.split(' ')[0]; // e.g., 'border-green-600'
                    
                    return (
                        <div
                            key={idx}
                            className={`relative bg-white rounded-lg p-2 border-2 ${actualBorderColor} shadow-sm hover:shadow-md transition-shadow`}
                        >
                            {/* GW Number */}
                            <div className="text-center mb-1">
                                <span className="text-[9px] font-bold text-gray-600">GW{fixture.event}</span>
                            </div>

                            {/* Team Badge */}
                            {badgeUrl && (
                                <div className="flex justify-center mb-1">
                                    <img
                                        src={badgeUrl}
                                        alt={opponent?.short_name || '?'}
                                        className="w-10 h-10 object-contain"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                        }}
                                    />
                                </div>
                            )}

                            {/* H/A and Expected Points */}
                            <div className="text-center space-y-0.5">
                                <div className={`text-[8px] font-bold ${textColor}`}>
                                    {homeAway}
                                </div>
                                <div className="text-xs font-black text-gray-900">
                                    {expectedPoints.toFixed(1)}
                                </div>
                                <div className="text-[8px] text-gray-600 font-semibold">
                                    xPts
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

