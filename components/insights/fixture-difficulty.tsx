import { getTeamShortName } from '@/lib/fixture-utils';

interface FixtureDifficultyProps {
    teamId: number;
    fixtures: any[];
    teams: any[];
    currentEvent: number;
}

function getTeamBadgeUrl(teamCode: number): string {
    return `https://resources.premierleague.com/premierleague/badges/70/t${teamCode}.png`;
}

const getFDRBorderColor = (difficulty: number) => {
    switch (difficulty) {
        case 1:
        case 2:
            return 'border-green-600 bg-green-600/20'; // Easy - Green
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
        case 2:
            return 'text-green-700'; // Easy
        case 3:
            return 'text-yellow-700'; // Moderate
        case 4:
            return 'text-orange-700'; // Difficult
        case 5:
            return 'text-red-700'; // Very Difficult
        default:
            return 'text-gray-700';
    }
};

export function FixtureDifficulty({ teamId, fixtures, teams, currentEvent }: FixtureDifficultyProps) {
    // Get next 3 fixtures for this team
    const nextFixtures = fixtures
        .filter((f: any) => {
            const isTeamInFixture = f.team_h === teamId || f.team_a === teamId;
            const isFutureOrCurrent = f.event >= currentEvent;
            return isTeamInFixture && isFutureOrCurrent;
        })
        .sort((a: any, b: any) => a.event - b.event)
        .slice(0, 3);

    if (nextFixtures.length === 0) {
        return <div className="text-[10px] text-muted-foreground">No fixtures</div>;
    }

    return (
        <div className="flex gap-1.5">
            {nextFixtures.map((fixture: any, idx: number) => {
                const isHome = fixture.team_h === teamId;
                const opponentId = isHome ? fixture.team_a : fixture.team_h;
                const difficulty = isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty;
                const opponent = teams.find((t: any) => t.id === opponentId);
                const homeAway = isHome ? 'H' : 'A';
                const badgeUrl = opponent ? getTeamBadgeUrl(opponent.code) : '';
                const borderColor = getFDRBorderColor(difficulty);
                const textColor = getFDRTextColor(difficulty);

                return (
                    <div
                        key={idx}
                        className={`relative w-8 h-8 rounded-full border-2 overflow-hidden ${borderColor} flex items-center justify-center`}
                        title={`GW${fixture.event}: ${opponent?.name || 'TBC'} (${homeAway})`}
                    >
                        {/* Team Badge as Background */}
                        {badgeUrl ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <img
                                    src={badgeUrl}
                                    alt={opponent?.short_name || '?'}
                                    className="w-full h-full object-cover opacity-60"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="absolute inset-0 bg-gray-200 opacity-30" />
                        )}
                        
                        {/* Colored Fill Overlay based on difficulty */}
                        <div className={`absolute inset-0 ${borderColor.split(' ')[1]} opacity-30`} />
                        
                        {/* H/A Indicator on Top */}
                        <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full ${borderColor.split(' ')[0]} flex items-center justify-center z-10 shadow-md border border-white/50`}>
                            <span className={`text-[7px] font-black leading-none ${textColor}`}>{homeAway}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
