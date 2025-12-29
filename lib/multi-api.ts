// Multi-source API integration for enhanced FPL data

const UNDERSTAT_BASE = 'https://understat.com';
const FOTMOB_BASE = 'https://www.fotmob.com/api';
const SPORTSDB_BASE = 'https://www.thesportsdb.com/api/v1/json/3'; // Free tier key

// FPL Official Images
export const getPlayerImage = (photoId: string) =>
    `https://resources.premierleague.com/premierleague/photos/players/250x250/p${photoId}.png`;

export const getTeamBadge = (teamCode: number) =>
    `https://resources.premierleague.com/premierleague/badges/t${teamCode}.png`;

// Understat - xG/xA data (No key needed)
export async function getUnderstatPlayerStats(playerName: string) {
    try {
        // Understat doesn't have a direct API, would need scraping
        // For now, return mock structure - in production would use a scraper
        return {
            xG: 0,
            xA: 0,
            xG90: 0,
            xA90: 0,
        };
    } catch (error) {
        console.error('[Understat] Error:', error);
        return null;
    }
}

// FotMob - News & Lineups (No key needed - unofficial)
export async function getFotMobPlayerNews(playerId: number) {
    try {
        const response = await fetch(`${FOTMOB_BASE}/playerdata?id=${playerId}`);
        if (!response.ok) return null;
        return response.json();
    } catch (error) {
        console.error('[FotMob] Error:', error);
        return null;
    }
}

// SportsDB - Team badges & player info (Free with basic key)
export async function getSportsDBTeamInfo(teamName: string) {
    try {
        const response = await fetch(`${SPORTSDB_BASE}/searchteams.php?t=${encodeURIComponent(teamName)}`);
        if (!response.ok) return null;
        const data = await response.json();
        return data.teams?.[0];
    } catch (error) {
        console.error('[SportsDB] Error:', error);
        return null;
    }
}

// Combined data fetcher
export async function getEnrichedPlayerData(player: any) {
    const [understatData, fotmobNews] = await Promise.all([
        getUnderstatPlayerStats(`${player.first_name} ${player.second_name}`),
        getFotMobPlayerNews(player.id),
    ]);

    return {
        ...player,
        image: getPlayerImage(player.photo),
        understat: understatData,
        news: fotmobNews,
    };
}
