import { NextResponse } from 'next/server';
import { createSession, getSession, encodeSessionCookie } from '@/lib/session-store';
import { cookies } from 'next/headers';
import { FPLClient } from '@/lib/fpl-client';

// Simple in-memory session storage for backward compatibility
let sessionStore: { entryId: number; teamName: string; playerName: string } | null = null;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { entryId, teamName, playerName } = body;

        // Validate required fields
        if (!entryId || typeof entryId !== 'number') {
            return NextResponse.json(
                { error: 'Invalid entryId. Must be a number.' },
                { status: 400 }
            );
        }

        if (!teamName || typeof teamName !== 'string') {
            return NextResponse.json(
                { error: 'Invalid teamName. Must be a string.' },
                { status: 400 }
            );
        }

        // Store in simple in-memory store for backward compatibility
        sessionStore = { entryId, teamName, playerName: playerName || 'Unknown' };

        // Also create proper session with cookie for /api/session route
        const sessionId = crypto.randomUUID();
        const session = await createSession(sessionId, '', entryId);

        const response = NextResponse.json({ 
            success: true,
            session: sessionStore 
        });
        
        const cookieOptions: {
            httpOnly: boolean;
            secure: boolean;
            sameSite: 'lax';
            path: string;
            maxAge: number;
        } = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
        };

        response.cookies.set("fpl_session_id", encodeSessionCookie(session), cookieOptions);

        return response;
    } catch (error) {
        console.error('[Session Create] Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const configHint =
            errorMessage.includes('SESSION_SECRET') ? errorMessage : undefined;

        return NextResponse.json(
            { 
                error: 'Failed to create session',
                message: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
                hint: configHint,
            },
            { status: 500 }
        );
    }
}

export async function GET() {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("fpl_session_id")?.value;

    if (sessionId) {
        const session = await getSession(sessionId);
        if (session && session.entryId) {
            const isPlaceholder =
                sessionStore &&
                sessionStore.entryId === session.entryId &&
                sessionStore.teamName === 'Team' &&
                sessionStore.playerName === 'Player';

            const storeMismatch = sessionStore && sessionStore.entryId !== session.entryId;

            const useMemory =
                sessionStore &&
                !storeMismatch &&
                !isPlaceholder &&
                sessionStore.teamName &&
                sessionStore.playerName;

            if (useMemory) {
                return NextResponse.json(sessionStore);
            }

            try {
                const client = new FPLClient();
                const entry = await client.getEntryDetails(session.entryId);
                const teamName = String(entry?.name ?? '').trim() || 'My Team';
                const playerName =
                    `${entry?.player_first_name ?? ''} ${entry?.player_last_name ?? ''}`.trim() || 'Manager';
                sessionStore = {
                    entryId: session.entryId,
                    teamName,
                    playerName,
                };
                return NextResponse.json(sessionStore);
            } catch (e) {
                console.error('[Session Create GET] Could not load entry from FPL', e);
                if (sessionStore && sessionStore.entryId === session.entryId) {
                    return NextResponse.json(sessionStore);
                }
                return NextResponse.json({
                    entryId: session.entryId,
                    teamName: 'My Team',
                    playerName: 'Manager',
                });
            }
        }
    }

    if (!sessionStore) {
        return NextResponse.json({ error: 'No session found' }, { status: 404 });
    }

    return NextResponse.json(sessionStore);
}
