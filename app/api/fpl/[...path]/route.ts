import { NextRequest, NextResponse } from 'next/server';

const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path } = await params;
        const endpoint = path.join('/');
        const url = `${FPL_BASE_URL}/${endpoint}`;

        console.log('[FPL Proxy] Fetching:', url);

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            console.error('[FPL Proxy] FPL API returned:', response.status);
            throw new Error(`FPL API returned ${response.status}`);
        }

        const data = await response.json();
        console.log('[FPL Proxy] Success!');

        return NextResponse.json(data, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
            },
        });
    } catch (error) {
        console.error('[FPL Proxy] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch from FPL API' },
            { status: 500 }
        );
    }
}
