import fs from 'fs/promises';
import path from 'path';

const SESSION_FILE = path.join(process.cwd(), 'sessions.json');

export interface Session {
    id: string; // Session ID (random uuid)
    fpl_cookie: string;
    entryId?: number; // FPL Team ID
    createdAt: number;
    updatedAt: number;
}

// In-memory cache for speed
let sessionCache: Record<string, Session> = {};

async function loadSessions() {
    try {
        const data = await fs.readFile(SESSION_FILE, 'utf-8');
        sessionCache = JSON.parse(data);
    } catch {
        sessionCache = {};
    }
}

async function saveSessions() {
    await fs.writeFile(SESSION_FILE, JSON.stringify(sessionCache, null, 2));
}

export async function getSession(id: string): Promise<Session | null> {
    await loadSessions();
    const session = sessionCache[id] || null;
    return session;
}

export async function createSession(id: string, fpl_cookie: string, entryId?: number) {
    if (Object.keys(sessionCache).length === 0) await loadSessions();

    sessionCache[id] = {
        id,
        fpl_cookie,
        entryId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    await saveSessions();
    return sessionCache[id];
}
