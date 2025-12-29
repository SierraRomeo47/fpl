// Helper to get player images from multiple sources with fallbacks
export function getPlayerPhotoUrl(player: any): string[] {
    const attempts = [
        // Try FPL official photos
        `https://resources.premierleague.com/premierleague/photos/players/250x250/p${player.code}.png`,
        `https://resources.premierleague.com/premierleague/photos/players/250x250/p${player.photo}.png`,
        // Try with ID
        `https://resources.premierleague.com/premierleague/photos/players/250x250/p${player.id}.png`,
        // FPL CDN alternative
        `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${player.team_code}_${player.element_type}-66.png`,
    ];
    return attempts;
}

export function getTeamBadgeUrl(teamCode: number): string[] {
    return [
        `https://resources.premierleague.com/premierleague/badges/70/t${teamCode}.png`,
        `https://resources.premierleague.com/premierleague/badges/t${teamCode}.png`,
        `https://resources.premierleague.com/premierleague/badges/100/t${teamCode}.png`,
    ];
}

export function getJerseyNumber(player: any): string | number {
    // Try multiple fields for jersey number
    if (player.squad_number && player.squad_number > 0) {
        return player.squad_number;
    }

    // Fallback: use a placeholder based on position
    const positionDefaults: Record<number, number> = {
        1: 1,  // GKP
        2: 5,  // DEF
        3: 8,  // MID
        4: 9,  // FWD
    };

    return positionDefaults[player.element_type] || '?';
}
