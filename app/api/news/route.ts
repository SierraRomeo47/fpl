import { NextRequest, NextResponse } from 'next/server';

function getNewsApiKey(): string | null {
    const raw = process.env.NEWS_API_KEY || process.env.NEXT_PUBLIC_NEWS_API_KEY;
    const key = typeof raw === 'string' ? raw.trim() : '';
    if (!key || key === 'demo') return null;
    return key;
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q');

        if (!query) {
            return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
        }

        const apiKey = getNewsApiKey();

        if (!apiKey) {
            return NextResponse.json({
                error: 'News API key not configured',
                articles: [],
            });
        }

        const response = await fetch(
            `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=10&apiKey=${apiKey}`,
            {
                cache: 'no-store',
                headers: {
                    'User-Agent': 'FPL-DnD/1.0',
                },
            }
        );

        if (!response.ok) {
            console.error('[News API] Failed to fetch:', response.status, response.statusText);
            return NextResponse.json({
                error: 'Failed to fetch news',
                articles: [],
            });
        }

        const data = await response.json();

        if (data.status === 'error') {
            console.error('[News API] NewsAPI error:', data.code, data.message);
            return NextResponse.json({
                error: data.message || 'NewsAPI error',
                articles: [],
            });
        }

        return NextResponse.json(
            {
                articles: data.articles || [],
                totalResults: data.totalResults || 0,
            },
            {
                headers: {
                    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
                },
            }
        );
    } catch (error: unknown) {
        console.error('[News API] Error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Failed to fetch news',
            articles: [],
        });
    }
}
