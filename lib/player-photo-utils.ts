/**
 * Robust player headshots for FPL UI.
 *
 * - Primary sources are Premier League CDN URLs built from `elements[].photo`, `code`, and `id`.
 * - Those assets occasionally lag kit/transfer updates (wrong shirt until PL refreshes).
 * - Optional `fotmobId` adds FotMob CDN fallbacks when you have a mapping (see `cache/mappings/fotmob.json`, `GET /api/enriched/player/:id`).
 * - **Not related to RSS/news cards:** story thumbnails (e.g. BBC `media:thumbnail`) are chosen by the publisher, not FPL.
 */

export interface PlayerPhotoOptions {
    code: number;
    photo?: string;
    web_name: string;
    team: number;
    /** FPL element id — some assets use this as a fallback filename */
    elementId?: number;
    /** FotMob player id — when set, tries `images.fotmob.com/.../playerimages/{id}` after PL URLs */
    fotmobId?: number;
}

export type PlayerPhotoUrlSize = '40x40' | '250x250';

/**
 * Tailwind classes for PL player photos inside circular frames.
 * Uses CSS object-position slightly above center so faces sit in the upper half (CDN crops vary).
 */
export const PLAYER_HEADSHOT_IMG_CLASSNAME =
    'object-cover object-[center_20%]' as const;

/** FPL `elements[].photo` is often `"240051.jpg"` — strip extension before building `p{base}.png`. */
export function normalizePlayerPhotoBase(photo?: string | null): string | null {
    if (photo == null || typeof photo !== 'string') return null;
    const t = photo.trim();
    if (!t) return null;
    return t.replace(/\.(jpg|jpeg|png|webp)$/i, '');
}

const ALT_PHOTO_DIMS = ['250x250', '110x140', '150x150'] as const;

function pushPlayerPhotoCandidates(
    urls: string[],
    seen: Set<string>,
    dim: string,
    base: string | number,
    exts: readonly string[]
) {
    const id = String(base);
    for (const ext of exts) {
        const u = `https://resources.premierleague.com/premierleague/photos/players/${dim}/p${id}.${ext}`;
        if (!seen.has(u)) {
            seen.add(u);
            urls.push(u);
        }
    }
}

/**
 * Get multiple player photo URLs to try in order of preference
 * Returns array of URLs to attempt, from most to least reliable
 */
export function getPlayerPhotoUrls(
    player: PlayerPhotoOptions,
    opts?: { size?: PlayerPhotoUrlSize }
): string[] {
    const dim = opts?.size ?? '250x250';
    const urls: string[] = [];
    const seen = new Set<string>();
    const exts = ['png', 'jpg', 'webp'] as const;

    const photoBase = normalizePlayerPhotoBase(player.photo);

    // 1) Prefer API `photo` basename first — PL refreshes this when headshots update (fresher kit/club).
    if (photoBase) {
        pushPlayerPhotoCandidates(urls, seen, dim, photoBase, exts);
    }

    // 2) Stable cut-out id (`code`) — always try; may lag `photo` on kit changes.
    if (player.code) {
        pushPlayerPhotoCandidates(urls, seen, dim, player.code, exts);
    }

    // 3) Element id fallback (some historical assets)
    if (player.elementId) {
        pushPlayerPhotoCandidates(urls, seen, dim, player.elementId, exts);
    }

    // 4) Other common tile sizes (some players only ship 110×140 or 150×150)
    if (dim === '250x250' || dim === '40x40') {
        for (const altDim of ALT_PHOTO_DIMS) {
            if (altDim === dim) continue;
            if (photoBase) pushPlayerPhotoCandidates(urls, seen, altDim, photoBase, exts);
            if (player.code) pushPlayerPhotoCandidates(urls, seen, altDim, player.code, exts);
        }
    }

    // 4b) FotMob public CDN (free; needs FPL→FotMob id — often fresher kit than stale PL files)
    const fmId =
        typeof player.fotmobId === 'number' && Number.isFinite(player.fotmobId)
            ? Math.trunc(player.fotmobId)
            : null;
    if (fmId != null && fmId > 0) {
        for (const ext of exts) {
            const u = `https://images.fotmob.com/image_resources/playerimages/${fmId}.${ext}`;
            if (!seen.has(u)) {
                seen.add(u);
                urls.push(u);
            }
        }
    }

    // 5) Shirt placeholder by team (no face, but better than empty)
    if (player.team) {
        const shirt = `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${player.team}-110.png`;
        if (!seen.has(shirt)) {
            seen.add(shirt);
            urls.push(shirt);
        }
    }

    return urls;
}

/** Ordered badge URLs — PL serves different paths; try all before giving up. */
export function getTeamBadgeUrls(teamCode: number): string[] {
    return [
        `https://resources.premierleague.com/premierleague/badges/70/t${teamCode}.png`,
        `https://resources.premierleague.com/premierleague/badges/100/t${teamCode}.png`,
        `https://resources.premierleague.com/premierleague/badges/t${teamCode}.png`,
    ];
}

/**
 * First team badge URL (backward compatible). Prefer {@link getTeamBadgeUrls} for fallbacks.
 */
export function getTeamBadgeUrl(teamCode: number): string {
    return getTeamBadgeUrls(teamCode)[0];
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
