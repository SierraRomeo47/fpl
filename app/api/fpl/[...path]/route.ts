import { NextRequest, NextResponse } from 'next/server';

const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    let endpoint = 'unknown';
    
    try {
        const { path } = await params;
        endpoint = path.join('/');
        const search = req.nextUrl.search;
        const url = `${FPL_BASE_URL}/${endpoint}${search}`;

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
        
        // Provide more detailed error information
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const statusCode = errorMessage.includes('404') ? 404 : 
                          errorMessage.includes('403') ? 403 : 
                          errorMessage.includes('429') ? 429 : 500;
        
        return NextResponse.json(
            { 
                error: 'Failed to fetch from FPL API',
                message: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
                endpoint: endpoint
            },
            { status: statusCode }
        );
    }
}
