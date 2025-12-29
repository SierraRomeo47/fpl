import { NextResponse } from 'next/server';

// Simple in-memory session storage
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

        sessionStore = { entryId, teamName, playerName: playerName || 'Unknown' };

        return NextResponse.json({ 
            success: true,
            session: sessionStore 
        });
    } catch (error) {
        console.error('[Session Create] Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        return NextResponse.json(
            { 
                error: 'Failed to create session',
                message: process.env.NODE_ENV === 'development' ? errorMessage : undefined
            },
            { status: 500 }
        );
    }
}

export async function GET() {
    if (!sessionStore) {
        return NextResponse.json({ error: 'No session found' }, { status: 404 });
    }

    return NextResponse.json(sessionStore);
}
