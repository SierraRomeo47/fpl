/**
 * Robust Player Photo Utility
 * Handles missing player photos with multiple fallback strategies
 */

export interface PlayerPhotoOptions {
    code: number;
    photo?: string;
    web_name: string;
    team: number;
}

/**
 * Get multiple player photo URLs to try in order of preference
 * Returns array of URLs to attempt, from most to least reliable
 */
export function getPlayerPhotoUrls(player: PlayerPhotoOptions): string[] {
    const urls: string[] = [];

    // Primary source: Player code from FPL API (most reliable)
    if (player.code) {
        urls.push(`https://resources.premierleague.com/premierleague/photos/players/250x250/p${player.code}.png`);
    }

    // Secondary source: Photo field if available
    if (player.photo) {
        urls.push(`https://resources.premierleague.com/premierleague/photos/players/250x250/p${player.photo}.png`);
        // Also try with .jpg extension
        urls.push(`https://resources.premierleague.com/premierleague/photos/players/250x250/p${player.photo}.jpg`);
    }

    // Tertiary: Try alternate CDN paths
    if (player.code) {
        urls.push(`https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${player.team}-110.png`);
    }

    return urls;
}

/**
 * Get team badge URL as fallback when player photo is unavailable
 */
export function getTeamBadgeUrl(teamCode: number): string {
    return `https://resources.premierleague.com/premierleague/badges/t${teamCode}.png`;
}

/**
 * Get player initials for text fallback
 */
export function getPlayerInitials(webName: string): string {
    const parts = webName.split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * React component helper for player photo with robust fallback
 * Usage in component:
 * 
 * const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
 * const photoUrls = getPlayerPhotoUrls(player);
 * 
 * <img
 *   src={photoUrls[currentUrlIndex]}
 *   onError={() => {
 *     if (currentUrlIndex < photoUrls.length - 1) {
 *       setCurrentUrlIndex(currentUrlIndex + 1);
 *     } else {
 *       // Show fallback (team badge or initials)
 *     }
 *   }}
 * />
 */

/**
 * Pre-load and validate player photo URL
 * Returns the first working URL from the list, or null if none work
 */
export async function findWorkingPlayerPhotoUrl(player: PlayerPhotoOptions): Promise<string | null> {
    const urls = getPlayerPhotoUrls(player);

    for (const url of urls) {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            if (response.ok) {
                return url;
            }
        } catch {
            continue;
        }
    }

    return null;
}
