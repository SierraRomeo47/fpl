import { NextRequest, NextResponse } from 'next/server';
import { FPLClient } from '@/lib/fpl-client';
import { getSession } from '@/lib/session-store';
import { cookies } from 'next/headers';

// Internal type for the sweeper to calculate EO
type MLEOData = Record<number, { 
    owned: number, 
    captained: number, 
    starting: number,
    eo: number // total multiplier (starting + captained) / 50 
}>;

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const leagueId = parseInt(id);

        if (isNaN(leagueId)) {
            return NextResponse.json({ error: 'Invalid league ID' }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const gwParam = searchParams.get('gw');
        const gw = gwParam ? parseInt(gwParam) : null;

        if (!gw) {
            return NextResponse.json({ error: 'Gameweek parameter (?gw=) is required' }, { status: 400 });
        }

        const cookieStore = await cookies();
        const sessionId = cookieStore.get("fpl_session_id")?.value;
        const authData = sessionId ? await getSession(sessionId) : null;
        
        // We use full cookies if available, or just empty if Read-Only Mode
        const fpl = new FPLClient({ cookies: authData?.fpl_cookie || "" });

        // 1. Fetch the Mini League Standings
        const standingsRes = await fpl.getLeagueStandings(leagueId, 1);
        
        if (!standingsRes || !standingsRes.standings || !standingsRes.standings.results) {
            return NextResponse.json({ error: 'League not found or private' }, { status: 404 });
        }

        const leagueName = standingsRes.league.name;
        // Cap at top 50 for performance
        const top50 = standingsRes.standings.results.slice(0, 50);

        // 2. Map their specific gameweek picks (Batch requests in chunks of 5 to avoid 429 rate limit)
        const competitors = [];
        const mleo: MLEOData = {};
        
        const chunkSize = 5;
        for (let i = 0; i < top50.length; i += chunkSize) {
            const chunk = top50.slice(i, i + chunkSize);
            const promises = chunk.map(async (manager: any) => {
                try {
                    const picksData = await fpl.getEntryPicks(manager.entry, gw);
                    return { manager, picksData };
                } catch (e) {
                    // Manager might not have made picks yet or endpoint failed
                    return { manager, picksData: null };
                }
            });
            
            const results = await Promise.all(promises);
            for (const { manager, picksData } of results) {
                if (picksData && picksData.picks) {
                    competitors.push({
                        entry: manager.entry,
                        team_name: manager.entry_name,
                        player_name: manager.player_name,
                        gw_points: picksData.entry_history.points - picksData.entry_history.event_transfers_cost,
                        total_points: manager.total,
                        rank: manager.rank,
                        last_rank: manager.last_rank,
                        picks: picksData.picks
                    });

                    // Update MLEO math
                    picksData.picks.forEach((pick: any) => {
                        if (!mleo[pick.element]) {
                            mleo[pick.element] = { owned: 0, captained: 0, starting: 0, eo: 0 };
                        }
                        
                        mleo[pick.element].owned += 1;
                        
                        // Active on pitch
                        if (pick.multiplier > 0) {
                            mleo[pick.element].starting += 1;
                        }
                        
                        // Captained
                        if (pick.multiplier > 1) {
                            mleo[pick.element].captained += 1;
                            // Triple captain is multiplier 3
                            if (pick.multiplier === 3) mleo[pick.element].captained += 1; 
                        }
                    });
                } else {
                    // Fallback
                    competitors.push({
                        entry: manager.entry,
                        team_name: manager.entry_name,
                        player_name: manager.player_name,
                        gw_points: 0,
                        total_points: manager.total,
                        rank: manager.rank,
                        last_rank: manager.last_rank,
                        picks: []
                    });
                }
            }
            
            // Wait 100ms between chunks
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Finalize MLEO percentages based on Top 50 count
        const totalSample = competitors.length || 1;
        Object.keys(mleo).forEach((key) => {
            const id = Number(key);
            const rawEO = mleo[id].starting + mleo[id].captained; // Base multiplier
            mleo[id].eo = (rawEO / totalSample) * 100;
        });

        // 3. Return the Sweeper Payload
        return NextResponse.json({
            success: true,
            league: {
                id: leagueId,
                name: leagueName,
                sample_size: competitors.length
            },
            competitors: competitors.sort((a,b) => b.total_points - a.total_points),
            mleo: mleo
        });

    } catch (error: any) {
        console.error('[Live League Sweeper API Error]', error);
        return NextResponse.json(
            { error: 'Failed to process live league standings', details: error.message },
            { status: 500 }
        );
    }
}
