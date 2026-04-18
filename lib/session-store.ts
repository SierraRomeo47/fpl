import fs from 'fs/promises';
import path from 'path';
import { createHmac, timingSafeEqual } from 'crypto';

const SESSION_FILE = path.join(process.cwd(), 'sessions.json');

export interface Session {
    id: string; // Session ID (random uuid)
    fpl_cookie: string;
    entryId?: number; // FPL Team ID
    createdAt: number;
    updatedAt: number;
}

// In-memory cache for speed (single-node / dev; not shared across serverless instances)
let sessionCache: Record<string, Session> = {};

function signingKey(): Buffer {
    const s = process.env.SESSION_SECRET;
    const mustHaveSecret =
        process.env.VERCEL === '1' ||
        process.env.NODE_ENV === 'production';
    if (mustHaveSecret) {
        if (!s || s.length < 16) {
            throw new Error(
                'SESSION_SECRET must be set to at least 16 characters (add it in Vercel → Settings → Environment Variables)'
            );
        }
        return Buffer.from(s, 'utf8');
    }
    return Buffer.from(s || 'dev-insecure-session-secret-not-for-production', 'utf8');
}

function signSession(session: Session): string {
    const key = signingKey();
    const payload = Buffer.from(JSON.stringify(session), 'utf8').toString('base64url');
    const sig = createHmac('sha256', key).update(payload).digest('base64url');
    const token = `s1.${payload}.${sig}`;
    if (token.length > 4090) {
        throw new Error('Session payload too large for cookie');
    }
    return token;
}

function parseSignedSession(token: string): Session | null {
    if (!token.startsWith('s1.')) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [, payloadB64, sig] = parts;
    let key: Buffer;
    try {
        key = signingKey();
    } catch {
        return null;
    }
    const expectedSig = createHmac('sha256', key).update(payloadB64).digest('base64url');
    if (sig.length !== expectedSig.length) return null;
    if (!timingSafeEqual(Buffer.from(sig, 'utf8'), Buffer.from(expectedSig, 'utf8'))) {
        return null;
    }
    try {
        const json = Buffer.from(payloadB64, 'base64url').toString('utf8');
        return JSON.parse(json) as Session;
    } catch {
        return null;
    }
}

async function loadSessions() {
    try {
        const data = await fs.readFile(SESSION_FILE, 'utf-8');
        sessionCache = JSON.parse(data);
    } catch {
        sessionCache = {};
    }
}

async function saveSessions() {
    try {
        await fs.writeFile(SESSION_FILE, JSON.stringify(sessionCache, null, 2));
    } catch {
        // Vercel serverless: filesystem is read-only — sessions must use encodeSessionCookie()
        // (signed cookie) so lookups work on any instance.
    }
}

export async function getSession(idOrToken: string): Promise<Session | null> {
    const fromCookie = parseSignedSession(idOrToken);
    if (fromCookie) return fromCookie;

    await loadSessions();
    return sessionCache[idOrToken] || null;
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

/** Value for Set-Cookie `fpl_session_id` on serverless (Vercel): self-contained, HMAC-signed. */
export function encodeSessionCookie(session: Session): string {
    return signSession(session);
}
