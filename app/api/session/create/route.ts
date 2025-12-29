import { NextResponse } from 'next/server';

// Simple in-memory session storage
let sessionStore: { entryId: number; teamName: string; playerName: string } | null = null;

export async function POST(request: Request) {
    try {
        const { entryId, teamName, playerName } = await request.json();

        sessionStore = { entryId, teamName, playerName };

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Session create error:', error);
        return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }
}

export async function GET() {
    if (!sessionStore) {
        return NextResponse.json({ error: 'No session found' }, { status: 404 });
    }

    return NextResponse.json(sessionStore);
}
