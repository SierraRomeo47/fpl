import { NextRequest, NextResponse } from 'next/server';

const UNDERSTAT_BASE = 'https://understat.com';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const source = searchParams.get('source');
    const endpoint = searchParams.get('endpoint');
    const term = searchParams.get('term'); // fotmob search term
    const id = searchParams.get('id'); // fotmob player id
    const team = searchParams.get('team'); // understat/sportsdb team
    const season = searchParams.get('season'); // understat season start year

    try {
        let url = '';
        let headers: Record<string, string> = {
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'application/json',
        };

        switch (source) {
            case 'understat':
                // Safe, supported mode: team players page (HTML, embedded JSON)
                // /api/external?source=understat&team=Arsenal&season=2025
                if (team && season) {
                    url = `${UNDERSTAT_BASE}/team/${encodeURIComponent(team)}/${encodeURIComponent(season)}`;
                    headers['Accept'] = 'text/html';
                    break;
                }
                // Back-compat mode (restricted): allow only fixed prefixes (no traversal)
                if (!endpoint || endpoint.includes('..') || endpoint.startsWith('http')) {
                    return NextResponse.json({ error: 'Invalid understat endpoint' }, { status: 400 });
                }
                url = `${UNDERSTAT_BASE}/${endpoint.replace(/^\/+/, '')}`;
                break;

            case 'fotmob':
                // Supported modes:
                // - /api/external?source=fotmob&term=...
                // - /api/external?source=fotmob&id=...
                if (term) {
                    url = `https://www.fotmob.com/api/search?term=${encodeURIComponent(term)}`;
                    break;
                }
                if (id) {
                    url = `https://www.fotmob.com/api/playerData?id=${encodeURIComponent(id)}`;
                    break;
                }
                if (!endpoint || endpoint.includes('..') || endpoint.startsWith('http')) {
                    return NextResponse.json({ error: 'Invalid fotmob endpoint' }, { status: 400 });
                }
                url = `https://www.fotmob.com/api/${endpoint.replace(/^\/+/, '')}`;
                break;

            case 'sportsdb':
                // Supported mode:
                // - /api/external?source=sportsdb&team=Arsenal
                // Backed by env var SPORTSDB_API_KEY (defaults to 123 in server adapter)
                if (team) {
                    const apiKey = process.env.SPORTSDB_API_KEY || '123';
                    url = `https://www.thesportsdb.com/api/v1/json/${encodeURIComponent(apiKey)}/searchteams.php?t=${encodeURIComponent(team)}`;
                    break;
                }
                if (!endpoint || endpoint.includes('..') || endpoint.startsWith('http')) {
                    return NextResponse.json({ error: 'Invalid sportsdb endpoint' }, { status: 400 });
                }
                {
                    const apiKey = process.env.SPORTSDB_API_KEY || '123';
                    url = `https://www.thesportsdb.com/api/v1/json/${encodeURIComponent(apiKey)}/${endpoint.replace(/^\/+/, '')}`;
                }
                break;

            default:
                return NextResponse.json({ error: 'Invalid source' }, { status: 400 });
        }

        console.log('[Multi-API Proxy] Fetching:', url);

        const response = await fetch(url, { headers });

        if (!response.ok) {
            // FotMob is frequently blocked/changed; treat as best-effort and return 200 with an empty payload
            // instead of failing the whole request with a 500.
            if (source === 'fotmob') {
                return NextResponse.json(
                    { error: 'FotMob API unavailable', status: response.status, data: null },
                    {
                        status: 200,
                        headers: {
                            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
                        },
                    }
                );
            }
            throw new Error(`API returned ${response.status}`);
        }

        // Understat team pages are HTML; return raw text for callers that parse it.
        const contentType = response.headers.get('content-type') || '';
        const data = contentType.includes('text/html') ? await response.text() : await response.json();

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
