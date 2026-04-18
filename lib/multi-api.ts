// Multi-source API integration for enhanced FPL data
// NOTE: External sources are fetched server-side and cached on disk.

// FPL Official Images
export const getPlayerImage = (photoId: string) =>
    `https://resources.premierleague.com/premierleague/photos/players/250x250/p${photoId}.png`;

export const getTeamBadge = (teamCode: number) =>
    `https://resources.premierleague.com/premierleague/badges/t${teamCode}.png`;

export { getUnderstatPlayerStatsByTeam as getUnderstatPlayerStats } from "@/lib/external/understat";
export { getFotmobPlayerData as getFotMobPlayerNews, resolveFotmobPlayerId } from "@/lib/external/fotmob";
export { getSportsDbTeamInfo as getSportsDBTeamInfo } from "@/lib/external/sportsdb";

// Combined data fetcher
export async function getEnrichedPlayerData(player: any) {
    const season = Number(process.env.UNDERSTAT_SEASON) || new Date().getFullYear() - 1;
    const playerName = `${player.first_name} ${player.second_name}`.trim();
    const teamName = player.team_name || player.teamName || player.team?.name;

    const fotmobId = await (async () => {
        try {
            return await (await import("@/lib/external/fotmob")).resolveFotmobPlayerId(player.web_name || playerName, teamName);
        } catch {
            return null;
        }
    })();

    const [understatData, fotmobNews] = await Promise.all([
        teamName ? (await import("@/lib/external/understat")).getUnderstatPlayerStatsByTeam(playerName, teamName, season) : null,
        fotmobId ? (await import("@/lib/external/fotmob")).getFotmobPlayerData(fotmobId) : null,
    ]);

    return {
        ...player,
        image: getPlayerImage(player.photo),
        understat: understatData,
        news: fotmobNews,
    };
}
