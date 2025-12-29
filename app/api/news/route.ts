import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q');
        
        if (!query) {
            return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
        }

        const apiKey = process.env.NEXT_PUBLIC_NEWS_API_KEY;
        
        if (!apiKey || apiKey === 'demo') {
            return NextResponse.json({ 
                error: 'News API key not configured',
                articles: [] 
            }, { status: 200 }); // Return empty array instead of error
        }

        const response = await fetch(
            `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=10&apiKey=${apiKey}`,
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                },
            }
        );

        if (!response.ok) {
            console.error('[News API] Failed to fetch:', response.status, response.statusText);
            return NextResponse.json({ 
                error: 'Failed to fetch news',
                articles: [] 
            }, { status: 200 }); // Return empty array instead of error
        }

        const data = await response.json();
        
        return NextResponse.json({
            articles: data.articles || [],
            totalResults: data.totalResults || 0
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
            },
        });
    } catch (error: any) {
        console.error('[News API] Error:', error);
        return NextResponse.json({ 
            error: error.message || 'Failed to fetch news',
            articles: [] 
        }, { status: 200 }); // Return empty array instead of error
    }
}

