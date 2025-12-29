import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/session-store';
import { FPLClient } from '@/lib/fpl-client';

export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionId = cookieStore.get('fpl_session_id')?.value;

        if (!sessionId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const session = await getSession(sessionId);
        if (!session || !session.entryId) {
            return NextResponse.json({ error: 'Session not found' }, { status: 401 });
        }

        const client = new FPLClient({ cookies: session.fpl_cookie });
        const myTeam = await client.getMyTeam(session.entryId);

        return NextResponse.json(myTeam, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
            },
        });
    } catch (error: any) {
        console.error('[My Team API] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch my-team' },
            { status: 500 }
        );
    }
}
