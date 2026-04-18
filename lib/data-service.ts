
import { FPLClient } from "./fpl-client";
import { getSession } from "./session-store";
import fs from 'fs/promises';
import path from 'path';
import { FPLBootstrapStatic, FPLHistory, FPLMyTeam } from "@/types/fpl";

const DATA_CACHE_DIR = path.join(process.cwd(), 'cache');

// Ensure cache dir exists
(async () => {
    try { await fs.mkdir(DATA_CACHE_DIR, { recursive: true }); } catch (e) { }
})();

interface CachedData {
    timestamp: number;
    bootstrap: FPLBootstrapStatic;
    myTeam: FPLMyTeam | null; // Can be null for public sessions
    history: FPLHistory;
    fixtures: any[]; // Fixtures data
}

export async function getFPLData(sessionId: string) {
    console.log('[Data Service] getFPLData called with sessionId:', sessionId);

    const session = await getSession(sessionId);
    if (!session) {
        console.error('[Data Service] Session not found for ID:', sessionId);
        throw new Error("Session not found");
    }

    console.log('[Data Service] Session found:', {
        id: session.id,
        hasEntryId: !!session.entryId,
        entryId: session.entryId,
        entryIdType: typeof session.entryId,
        hasCookies: !!session.fpl_cookie
    });

    // We need entryId for cache file naming and FPL API calls
    if (!session.entryId) {
        console.error('[Data Service] Session entryId missing! Full session:', JSON.stringify(session, null, 2));
        throw new Error(`Session entryId not found. Session ID: ${sessionId}, Entry ID value: ${session.entryId}`);
    }

    // session.fpl_cookie now contains the full Cookie header string
    const client = new FPLClient({ cookies: session.fpl_cookie });

    const cacheFile = path.join(DATA_CACHE_DIR, `${session.entryId}.json`);

    // Try to load from cache
    try {
        const cacheRaw = await fs.readFile(cacheFile, 'utf-8');
        const cache: CachedData = JSON.parse(cacheRaw);

        // Cache valid for 5 minutes
        if (Date.now() - cache.timestamp < 1000 * 60 * 5) {
            return { ...cache, source: 'cache' };
        }
    } catch (e) {
        // Cache miss or error
    }

    // Fetch Live (reuse the client we created above) - fetch individually to see which fails
    console.log('[Data Service] Fetching FPL data for entry:', session.entryId);

    let bootstrap, myTeam, history, fixtures;

    try {
        console.log('[Data Service] Fetching bootstrap-static...');
        bootstrap = await client.getBootstrapStatic();
        console.log('[Data Service] ✓ bootstrap-static fetched');
    } catch (e) {
        console.error('[Data Service] ✗ bootstrap-static failed:', e);
        throw new Error(`Failed to fetch game data: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Only fetch my-team if we have FPL cookies (requires authentication)
    if (session.fpl_cookie && session.fpl_cookie.trim() !== '') {
        try {
            console.log('[Data Service] Fetching my-team for entry', session.entryId);
            myTeam = await client.getMyTeam(session.entryId);
            console.log('[Data Service] ✓ my-team fetched');
        } catch (e) {
            console.error('[Data Service] ✗ my-team failed:', e);
            // Don't throw - myTeam is optional for public sessions
            console.warn('[Data Service] Continuing without my-team data (public session)');
            myTeam = null;
        }
    } else {
        console.log('[Data Service] Skipping my-team fetch (no FPL cookies - public session)');
        myTeam = null;
    }

    try {
        console.log('[Data Service] Fetching history for entry', session.entryId);
        history = await client.getHistory(session.entryId);
        console.log('[Data Service] ✓ history fetched');
    } catch (e) {
        console.error('[Data Service] ✗ history failed:', e);
        throw new Error(`Failed to fetch history: ${e instanceof Error ? e.message : String(e)}`);
    }

    try {
        console.log('[Data Service] Fetching fixtures...');
        fixtures = await client.getFixtures();
        console.log('[Data Service] ✓ fixtures fetched');
    } catch (e) {
        console.error('[Data Service] ✗ fixtures failed:', e);
        throw new Error(`Failed to fetch fixtures: ${e instanceof Error ? e.message : String(e)}`);
    }

    const data: CachedData = {
        timestamp: Date.now(),
        bootstrap,
        myTeam,
        history,
        fixtures,
    };

    // Save to cache
    await fs.writeFile(cacheFile, JSON.stringify(data, null, 2));

    return { ...data, source: 'live' };
}
