import { NextRequest, NextResponse } from 'next/server';

const UNDERSTAT_BASE = 'https://understat.com';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const source = searchParams.get('source');
    const endpoint = searchParams.get('endpoint');

    try {
        let url = '';
        let headers: Record<string, string> = {
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'application/json',
        };

        switch (source) {
            case 'understat':
                // Understat proxy for xG data
                url = `${UNDERSTAT_BASE}/${endpoint}`;
                break;

            case 'fotmob':
                // FotMob API proxy
                url = `https://www.fotmob.com/api/${endpoint}`;
                break;

            case 'sportsdb':
                // TheSportsDB free tier
                url = `https://www.thesportsdb.com/api/v1/json/3/${endpoint}`;
                break;

            default:
                return NextResponse.json({ error: 'Invalid source' }, { status: 400 });
        }

        console.log('[Multi-API Proxy] Fetching:', url);

        const response = await fetch(url, { headers });

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();

        return NextResponse.json(data, {
            headers: {
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
            },
        });
    } catch (error) {
        console.error('[Multi-API Proxy] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch from external API' },
            { status: 500 }
        );
    }
}
