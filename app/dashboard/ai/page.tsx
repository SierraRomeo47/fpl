import { getSession } from "@/lib/session-store";
import { getFPLData } from "@/lib/data-service";
import { AIEngine } from "@/lib/ai-engine";
import { FPLClient } from "@/lib/fpl-client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, TrendingUp, AlertTriangle, ArrowRight, Home, Star, Users, Shield } from "lucide-react";
import { getFDRColorClass } from "@/lib/fixture-utils";

export default async function AIInsightsPage() {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("fpl_session_id")?.value;

    if (!sessionId) redirect("/login");

    let data;
    try {
        data = await getFPLData(sessionId);
    } catch (e) {
        redirect("/login");
    }

    const { bootstrap, myTeam, fixtures, history } = data;
    
    // Get current event
    const currentEvent = bootstrap.events.find(e => e.is_current)?.id || 
                         bootstrap.events.find(e => e.is_next)?.id || 
                         1;
    
    // If myTeam is not available, try to get last week's team picks from public endpoint
    let teamData = myTeam;
    if (!myTeam && history && history.current && history.current.length > 0) {
        try {
            // Get the last completed gameweek
            const completedEvents = bootstrap.events
                .filter((e: any) => e.finished)
                .sort((a: any, b: any) => b.id - a.id);
            
            if (completedEvents.length > 0) {
                const lastEventId = completedEvents[0].id;
                const session = await getSession(sessionId!);
                
                if (session && session.entryId) {
                    // Use our proxy API route (same as Squad page uses)
                    try {
                        // Use absolute URL for server-side fetch
                        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
                        const picksResponse = await fetch(
                            `${baseUrl}/api/fpl/entry/${session.entryId}/event/${lastEventId}/picks`,
                            { 
                                headers: { 'Accept': 'application/json' },
                                cache: 'no-store',
                                next: { revalidate: 0 }
                            }
                        );
                        
                        if (picksResponse.ok) {
                            const responseText = await picksResponse.text();
                            
                            // Check if response is not empty before parsing
                            if (responseText && responseText.trim() !== '') {
                                try {
                                    const picksData = JSON.parse(responseText);
                                    
                                    // Validate picks data structure
                                    if (picksData && picksData.picks && Array.isArray(picksData.picks) && picksData.picks.length > 0) {
                                        // Construct a myTeam-like object from picks
                                        const totalValue = picksData.picks.reduce((sum: number, p: any) => {
                                            const player = bootstrap.elements.find((e: any) => e.id === p.element);
                                            return sum + (player?.now_cost || 0);
                                        }, 0);

                                        const transfersFromApi = picksData.transfers || {};
                                        const teamValue =
                                            typeof transfersFromApi.value === 'number'
                                                ? transfersFromApi.value
                                                : totalValue; // now_cost sum (tenths) fallback
                                        const bankValue =
                                            typeof transfersFromApi.bank === 'number'
                                                ? transfersFromApi.bank
                                                : Math.max(0, 1000 - teamValue); // budget 100.0 (1000 tenths) fallback
                                        
                                        teamData = {
                                            picks: picksData.picks,
                                            chips: picksData.chips || [],
                                            transfers: {
                                                cost: transfersFromApi.cost || 0,
                                                limit: transfersFromApi.limit || 1,
                                                made: transfersFromApi.made || 0,
                                                bank: bankValue,
                                                value: teamValue
                                            }
                                        };
                                    }
                                } catch (parseError) {
                                    console.log('[AI Insights] JSON parse error:', parseError instanceof Error ? parseError.message : String(parseError));
                                }
                            }
                        }
                    } catch (fetchError) {
                        // If fetch fails, log and continue without team data
                        console.log('[AI Insights] Fetch error:', fetchError instanceof Error ? fetchError.message : String(fetchError));
                    }
                }
            }
        } catch (e) {
            console.log('[AI Insights] Could not fetch last week picks:', e instanceof Error ? e.message : String(e));
            // Continue with teamData = null, will show general insights
        }
    }
    
    // If still no team data, show general insights based on form and fixtures
    if (!teamData) {
        // Get top form players
        const topFormPlayers = bootstrap.elements
            .filter((p: any) => p.status === 'a' && parseFloat(p.form) > 0)
            .map((p: any) => ({
                ...p,
                form: parseFloat(p.form),
                ep_next: parseFloat(p.ep_next) || 0,
                score: parseFloat(p.form) * 2 + (parseFloat(p.ep_next) || 0)
            }))
            .sort((a: any, b: any) => b.score - a.score)
            .slice(0, 10);

        // Get best fixture opportunities (players with good form + easy fixtures)
        const bestOpportunities = bootstrap.elements
            .filter((p: any) => p.status === 'a' && parseFloat(p.form) > 5)
            .map((p: any) => {
                const nextFixture = fixtures.find((f: any) => 
                    (f.team_h === p.team || f.team_a === p.team) && 
                    f.event > currentEvent && 
                    !f.finished
                );
                if (!nextFixture) return null;
                const isHome = nextFixture.team_h === p.team;
                const fdr = isHome ? nextFixture.team_h_difficulty : nextFixture.team_a_difficulty;
                return {
                    ...p,
                    form: parseFloat(p.form),
                    fdr,
                    isHome,
                    opportunityScore: parseFloat(p.form) + (6 - fdr) * 0.5,
                    nextFixture
                };
            })
            .filter((p: any) => p !== null)
            .sort((a: any, b: any) => b.opportunityScore - a.opportunityScore)
            .slice(0, 5);

        // Get teams with best fixtures
        const teamFixtures = bootstrap.teams.map((team: any) => {
            const teamNextFixtures = fixtures
                .filter((f: any) => (f.team_h === team.id || f.team_a === team.id) && f.event > currentEvent && !f.finished)
                .slice(0, 3);
            const avgFDR = teamNextFixtures.length > 0
                ? teamNextFixtures.reduce((sum: number, f: any) => {
                    const isHome = f.team_h === team.id;
                    return sum + (isHome ? f.team_h_difficulty : f.team_a_difficulty);
                }, 0) / teamNextFixtures.length
                : 3;
            return { team, avgFDR, fixtures: teamNextFixtures };
        })
        .sort((a: any, b: any) => a.avgFDR - b.avgFDR)
        .slice(0, 5);

        return (
            <div className="min-h-screen bg-background p-4 md:p-8 pb-24 md:pb-12 pt-16">
                <div className="container-4k space-y-8">
                    <header>
                        <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tighter">
                            AI Insights
                        </h1>
                        <p className="text-muted-foreground text-lg">
                            Powered by DnD Engine
                        </p>
                    </header>

                    <Card className="glass-hd border-rank-gold/35 bg-draw-muted/50">
                        <CardContent className="p-6">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-rank-gold" />
                                    <h2 className="text-lg font-bold text-foreground">Public Data Mode</h2>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Showing general insights. Team-specific recommendations require FPL authentication.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Top Form Players */}
                        <Card className="glass-hd border-positive/30 bg-positive-muted/40">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xl flex items-center gap-2 text-positive">
                                    <TrendingUp className="w-6 h-6" />
                                    Top Form Players
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {topFormPlayers.slice(0, 5).map((player: any) => (
                                        <div key={player.id} className="flex items-center justify-between p-2 rounded bg-background/30">
                                            <div className="flex items-center gap-3">
                                                <div className="font-semibold">{player.web_name}</div>
                                                <Badge variant="outline" className="text-xs">
                                                    {bootstrap.teams.find((t: any) => t.id === player.team)?.short_name}
                                                </Badge>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-positive">{player.form.toFixed(1)}</div>
                                                <div className="text-xs text-muted-foreground">Form</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Best Fixture Opportunities */}
                        <Card className="glass-hd border-primary/20 bg-primary/5">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xl flex items-center gap-2 text-primary">
                                    <Star className="w-6 h-6" />
                                    Best Opportunities
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {bestOpportunities.map((player: any) => (
                                        <div key={player.id} className="p-2 rounded bg-background/30">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="font-semibold">{player.web_name}</div>
                                                <Badge 
                                                    variant="outline" 
                                                    className={`${getFDRColorClass(player.fdr)} border-current text-xs`}
                                                >
                                                    FDR {player.fdr}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span>Form: {player.form.toFixed(1)}</span>
                                                {player.isHome && (
                                                    <Badge variant="outline" className="text-xs border-positive text-positive">
                                                        <Home className="w-3 h-3 mr-1" />
                                                        Home
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Teams with Best Fixtures */}
                    <Card className="glass-hd border-blue-500/20 bg-blue-500/5">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xl flex items-center gap-2 text-blue-400">
                                <BrainCircuit className="w-6 h-6" />
                                Teams with Best Upcoming Fixtures
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {teamFixtures.map(({ team, avgFDR, fixtures: teamFixtures }: any) => (
                                    <div key={team.id} className="p-3 rounded bg-background/30 border border-white/5">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="font-semibold">{team.name}</div>
                                            <Badge 
                                                variant="outline" 
                                                className={`${getFDRColorClass(Math.round(avgFDR))} border-current`}
                                            >
                                                Avg FDR {avgFDR.toFixed(1)}
                                            </Badge>
                                        </div>
                                        <div className="flex gap-1">
                                            {teamFixtures.slice(0, 3).map((f: any, idx: number) => {
                                                const isHome = f.team_h === team.id;
                                                const fdr = isHome ? f.team_h_difficulty : f.team_a_difficulty;
                                                const opponentId = isHome ? f.team_a : f.team_h;
                                                const opponent = bootstrap.teams.find((t: any) => t.id === opponentId);
                                                return (
                                                    <div 
                                                        key={idx}
                                                        className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${getFDRColorClass(fdr)} bg-background/50`}
                                                        title={`GW${f.event} vs ${opponent?.short_name} (FDR ${fdr})`}
                                                    >
                                                        {fdr}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }
    
    const engine = new AIEngine(bootstrap, teamData, fixtures, currentEvent);

    const transfers = engine.recommendTransfers(teamData.transfers.bank, 'push');
    const topTransfer = transfers[0];
    const captainRec = engine.recommendCaptain();
    const teamStructure = engine.analyzeTeamStructure();
    const chipStrategy = engine.recommendChipStrategy();
    const playerUpgrades = engine.rankPlayerUpgrades();
    
    // Get optimal lineup after applying recommended transfers
    const transfersToExecute = playerUpgrades.filter(u => u.executeThisGW);
    const optimalLineup = engine.getOptimalLineup(transfersToExecute, captainRec);

    return (
        <div className="min-h-screen bg-background p-4 md:p-8 pb-24 md:pb-12 pt-16">
            <div className="container-4k space-y-8">
                <header>
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tighter">
                        AI Insights
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        Powered by DnD Engine
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Captain Recommendation */}
                    <Card className="glass-hd border-primary/20 bg-primary/5">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xl flex items-center gap-2 text-primary">
                                <Star className="w-6 h-6" />
                                Captain Recommendation
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {captainRec ? (
                                <div>
                                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                        <div className="flex-1">
                                            <div className="font-bold text-2xl text-primary mb-2">
                                                {captainRec.player.web_name}
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Badge 
                                                    variant="outline" 
                                                    className={`${getFDRColorClass(captainRec.fdr)} border-current`}
                                                >
                                                    FDR {captainRec.fdr}
                                                </Badge>
                                                {captainRec.isHome && (
                                                    <Badge variant="outline" className="text-positive border-positive">
                                                        <Home className="w-3 h-3 mr-1" />
                                                        Home
                                                    </Badge>
                                                )}
                                                {!captainRec.isHome && (
                                                    <Badge variant="outline" className="text-blue-400 border-blue-400">
                                                        Away
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right bg-background/50 p-3 rounded-lg">
                                            <div className="text-2xl font-bold text-primary">
                                                {captainRec.score.toFixed(1)}
                                            </div>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Score</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 text-sm text-foreground p-3 bg-background/30 rounded border border-white/5">
                                        <p className="font-semibold mb-1">Strategy (Short-term):</p>
                                        <p className="text-foreground">{captainRec.reason}</p>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            Strategy: Fixture difficulty is prioritized over form for single-week captaincy decisions.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    Unable to generate captain recommendation. Check fixture data.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Top Transfer Recommendation */}
                    <Card className="glass-hd border-positive/30 bg-positive-muted/40">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xl flex items-center gap-2 text-positive">
                                <TrendingUp className="w-6 h-6" />
                                Top Transfer Opportunity
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {topTransfer ? (
                                <div>
                                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                        <div className="flex items-center gap-4 w-full md:w-auto">
                                            <div className="text-center">
                                                <p className="text-xs text-muted-foreground uppercase">Out</p>
                                                <div className="font-bold text-lg text-red-400">{topTransfer.playerOut.web_name}</div>
                                            </div>
                                            <ArrowRight className="text-muted-foreground" />
                                            <div className="text-center">
                                                <p className="text-xs text-muted-foreground uppercase">In</p>
                                                <div className="font-bold text-lg text-positive">{topTransfer.playerIn.web_name}</div>
                                            </div>
                                        </div>

                                        <div className="text-right w-full md:w-auto bg-background/50 p-3 rounded-lg">
                                            <div className="text-3xl font-bold text-positive">+{topTransfer.scoreImprovement.toFixed(1)}</div>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Form Diff</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 text-sm text-foreground p-3 bg-background/30 rounded border border-white/5">
                                        <p className="font-semibold mb-1">Strategy (Long-term - Push):</p>
                                        <p className="text-foreground">{topTransfer.reason}</p>
                                        {topTransfer.fixtureContext && (
                                            <p className="mt-2 text-sm text-muted-foreground">
                                                Fixture context: {topTransfer.fixtureContext}
                                            </p>
                                        )}
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            Strategy: Form is prioritized over fixtures for transfer decisions (long-term investment).
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    No obvious transfer upgrades found based on form. Your team is solid!
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Team Structure Analysis */}
                <Card className="glass-hd border-blue-500/20 bg-blue-500/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xl flex items-center gap-2 text-blue-400">
                            <Users className="w-6 h-6" />
                            Team Structure Analysis
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-background/40 border border-white/5">
                                <span className="font-semibold">Structure Type</span>
                                <Badge 
                                    variant={teamStructure.structure === 'stars-scrubs' ? 'default' : 'outline'}
                                    className={
                                        teamStructure.structure === 'stars-scrubs' 
                                            ? 'bg-positive-muted text-positive border-positive'
                                            : teamStructure.structure === 'mid-heavy'
                                            ? 'bg-draw-muted text-rank-gold border-rank-gold'
                                            : ''
                                    }
                                >
                                    {teamStructure.structure === 'stars-scrubs' ? 'Stars & Scrubs' : 
                                     teamStructure.structure === 'mid-heavy' ? 'Mid-Heavy' : 'Balanced'}
                                </Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="text-center p-2 rounded bg-background/30">
                                    <div className="text-lg font-bold text-primary">{teamStructure.premiumCount}</div>
                                    <div className="text-xs text-muted-foreground">Premium (&gt;£8m)</div>
                                </div>
                                <div className="text-center p-2 rounded bg-background/30">
                                    <div className="text-lg font-bold text-rank-gold">{teamStructure.midPriceCount}</div>
                                    <div className="text-xs text-muted-foreground">Mid (£6m-£8m)</div>
                                </div>
                                <div className="text-center p-2 rounded bg-background/30">
                                    <div className="text-lg font-bold text-positive">{teamStructure.budgetCount}</div>
                                    <div className="text-xs text-muted-foreground">Budget (&lt;£6m)</div>
                                </div>
                            </div>
                            <div className="p-3 rounded-lg bg-background/30 border border-white/5">
                                <p className="text-sm text-foreground/80">{teamStructure.recommendation}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-background/30 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full ${
                                            teamStructure.score >= 80 ? 'bg-positive' :
                                            teamStructure.score >= 60 ? 'bg-rank-gold' : 'bg-caution'
                                        }`}
                                        style={{ width: `${teamStructure.score}%` }}
                                    />
                                </div>
                                <span className="text-xs text-muted-foreground">{teamStructure.score}/100</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Ranked Player Upgrades */}
                <Card className="glass-hd border-positive/30 bg-positive-muted/40">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xl flex items-center gap-2 text-positive">
                            <TrendingUp className="w-6 h-6" />
                            Ranked Upgrade Suggestions (All 15 Players)
                        </CardTitle>
                        <p className="text-base text-muted-foreground mt-1">
                            Based on Joshua Bull&apos;s strategies: Form (70%) &gt; Fixtures (20%) &gt; Value (10%)
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                            {playerUpgrades.length > 0 ? (
                                playerUpgrades.map((upgrade) => (
                                    <div 
                                        key={`upgrade-${upgrade.playerOut.id}-${upgrade.playerIn.id}`}
                                        className={`p-3 rounded-lg border ${
                                            upgrade.executeThisGW 
                                                ? 'bg-positive-muted border-positive/35' 
                                                : 'bg-background/30 border-white/5'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="w-8 h-8 flex items-center justify-center p-0">
                                                    #{upgrade.rank}
                                                </Badge>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-red-400">{upgrade.playerOut.web_name}</span>
                                                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                                    <span className="font-semibold text-positive">{upgrade.playerIn.web_name}</span>
                                                </div>
                                            </div>
                                            {upgrade.executeThisGW && (
                                                <Badge variant="outline" className="bg-positive-muted text-positive border-positive">
                                                    Execute This GW
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                                            <div className="text-sm">
                                                <span className="text-muted-foreground">Short-term:</span>
                                                <span className="ml-1 font-semibold text-positive">+{upgrade.shortTermUpside.toFixed(1)}</span>
                                            </div>
                                            <div className="text-sm">
                                                <span className="text-muted-foreground">Long-term:</span>
                                                <span className="ml-1 font-semibold text-blue-400">+{upgrade.longTermUpside.toFixed(1)}</span>
                                            </div>
                                            <div className="text-sm">
                                                <span className="text-muted-foreground">Form:</span>
                                                <span className="ml-1 font-semibold text-foreground">+{upgrade.formImprovement.toFixed(1)}</span>
                                            </div>
                                            <div className="text-sm">
                                                <span className="text-muted-foreground">Fixtures:</span>
                                                <span className="ml-1 font-semibold text-foreground">+{upgrade.fixtureImprovement.toFixed(1)}</span>
                                            </div>
                                        </div>
                                        <p className="text-sm text-foreground mb-1">{upgrade.reason}</p>
                                        <p className={`text-sm ${upgrade.executeThisGW ? 'text-positive font-medium' : 'text-muted-foreground'}`}>
                                            {upgrade.reasonToExecute}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    No upgrade opportunities found. Your team is optimal!
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Optimal Lineup After Transfers */}
                {optimalLineup && (
                    <Card className="glass-hd border-purple-500/20 bg-purple-500/5">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xl flex items-center gap-2 text-purple-400">
                                <Users className="w-6 h-6" />
                                Optimal Lineup (After Recommended Transfers)
                            </CardTitle>
                            <p className="text-base text-muted-foreground mt-1">
                                Best 11 with Captain & Vice-Captain based on form, fixtures, and expected points
                            </p>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {/* Captain & Vice-Captain */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div className="p-4 rounded-lg bg-draw-muted border border-rank-gold/35">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Shield className="w-5 h-5 text-rank-gold" />
                                            <span className="font-semibold text-rank-gold">Captain</span>
                                        </div>
                                        <div className="text-lg font-bold">{optimalLineup.captain.web_name}</div>
                                        <div className="text-sm text-muted-foreground mt-1">
                                            Form: {parseFloat(optimalLineup.captain.form).toFixed(1)} | 
                                            EP: {parseFloat(String(optimalLineup.captain.ep_next ?? '0')).toFixed(1)}
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-lg bg-muted border border-border">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Shield className="w-5 h-5 text-muted-foreground" />
                                            <span className="font-semibold text-muted-foreground">Vice-Captain</span>
                                        </div>
                                        <div className="text-lg font-bold">{optimalLineup.viceCaptain.web_name}</div>
                                        <div className="text-sm text-muted-foreground mt-1">
                                            Form: {parseFloat(optimalLineup.viceCaptain.form).toFixed(1)} | 
                                            EP: {parseFloat(String(optimalLineup.viceCaptain.ep_next ?? '0')).toFixed(1)}
                                        </div>
                                    </div>
                                </div>

                                {/* Lineup by Position */}
                                <div className="space-y-3">
                                    <div>
                                        <h4 className="text-base font-semibold text-foreground mb-2">Goalkeeper</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {optimalLineup.lineup
                                                .filter(p => p.player.element_type === 1)
                                                .map((p, idx) => (
                                                    <div 
                                                        key={idx}
                                                        className={`px-3 py-2 rounded-lg border ${
                                                            p.isCaptain ? 'bg-draw-muted border-rank-gold' :
                                                            p.isViceCaptain ? 'bg-muted border-border' :
                                                            'bg-background/30 border-white/5'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold">{p.player.web_name}</span>
                                                            {p.isCaptain && <Badge variant="outline" className="bg-draw-muted text-rank-gold border-rank-gold text-xs">C</Badge>}
                                                            {p.isViceCaptain && <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-xs">VC</Badge>}
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-base font-semibold text-foreground mb-2">Defenders</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {optimalLineup.lineup
                                                .filter(p => p.player.element_type === 2)
                                                .map((p, idx) => (
                                                    <div 
                                                        key={idx}
                                                        className={`px-3 py-2 rounded-lg border ${
                                                            p.isCaptain ? 'bg-draw-muted border-rank-gold' :
                                                            p.isViceCaptain ? 'bg-muted border-border' :
                                                            'bg-background/30 border-white/5'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold">{p.player.web_name}</span>
                                                            {p.isCaptain && <Badge variant="outline" className="bg-draw-muted text-rank-gold border-rank-gold text-xs">C</Badge>}
                                                            {p.isViceCaptain && <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-xs">VC</Badge>}
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-base font-semibold text-foreground mb-2">Midfielders</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {optimalLineup.lineup
                                                .filter(p => p.player.element_type === 3)
                                                .map((p, idx) => (
                                                    <div 
                                                        key={idx}
                                                        className={`px-3 py-2 rounded-lg border ${
                                                            p.isCaptain ? 'bg-draw-muted border-rank-gold' :
                                                            p.isViceCaptain ? 'bg-muted border-border' :
                                                            'bg-background/30 border-white/5'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold">{p.player.web_name}</span>
                                                            {p.isCaptain && <Badge variant="outline" className="bg-draw-muted text-rank-gold border-rank-gold text-xs">C</Badge>}
                                                            {p.isViceCaptain && <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-xs">VC</Badge>}
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-base font-semibold text-foreground mb-2">Forwards</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {optimalLineup.lineup
                                                .filter(p => p.player.element_type === 4)
                                                .length > 0 ? (
                                                optimalLineup.lineup
                                                    .filter(p => p.player.element_type === 4)
                                                    .map((p, idx) => (
                                                        <div 
                                                            key={`fwd-${p.player.id}-${idx}`}
                                                            className={`px-3 py-2 rounded-lg border ${
                                                                p.isCaptain ? 'bg-draw-muted border-rank-gold' :
                                                                p.isViceCaptain ? 'bg-muted border-border' :
                                                                'bg-background/30 border-white/5'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold text-foreground">{p.player.web_name}</span>
                                                                {p.isCaptain && <Badge variant="outline" className="bg-draw-muted text-rank-gold border-rank-gold text-xs">C</Badge>}
                                                                {p.isViceCaptain && <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-xs">VC</Badge>}
                                                            </div>
                                                        </div>
                                                    ))
                                            ) : (
                                                <div className="text-sm text-muted-foreground italic">
                                                    No forwards in optimal lineup (filled with other positions)
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Risk Analysis Placeholder */}
                    <Card className="glass-hd border-destructive/20 bg-destructive/5">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                                <AlertTriangle className="w-5 h-5" />
                                Risk Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-muted-foreground">
                                Advanced risk analysis (minutes played, rotation) coming in Phase 2.1.
                            </div>
                        </CardContent>
                    </Card>

                    {/* Chip Strategy */}
                    <Card className="glass-hd border-primary/20 bg-primary/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <BrainCircuit className="w-5 h-5 text-primary" />
                                Chip Strategy
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {chipStrategy.recommendations.length > 0 ? (
                                chipStrategy.recommendations.map((rec, idx) => (
                                    <div key={idx} className="p-3 rounded-lg bg-background/40 border border-white/5">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold capitalize">{rec.chip.replace('_', ' ')}</span>
                                                <Badge 
                                                    variant="outline" 
                                                    className={
                                                        rec.priority === 'high' ? 'border-positive text-positive' :
                                                        rec.priority === 'medium' ? 'border-rank-gold text-rank-gold' :
                                                        'border-muted-foreground'
                                                    }
                                                >
                                                    GW{rec.gameweek}
                                                </Badge>
                                            </div>
                                            <Badge 
                                                variant={rec.priority === 'high' ? 'default' : 'outline'}
                                                className={
                                                    rec.priority === 'high' ? 'bg-positive-muted text-positive border-positive' :
                                                    rec.priority === 'medium' ? 'bg-draw-muted text-rank-gold border-rank-gold' :
                                                    ''
                                                }
                                            >
                                                {rec.priority.toUpperCase()}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-foreground">{rec.reason}</p>
                                        {rec.blankGWs && rec.blankGWs.length > 0 && (
                                            <p className="text-xs text-rank-gold mt-1">Blank GWs: {rec.blankGWs.join(', ')}</p>
                                        )}
                                        {rec.doubleGWs && rec.doubleGWs.length > 0 && (
                                            <p className="text-xs text-positive mt-1">Double GWs: {rec.doubleGWs.join(', ')}</p>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-sm text-muted-foreground">All chips used or no recommendations available.</div>
                            )}
                            {chipStrategy.blankGameweeks.length > 0 && (
                                <div className="text-xs text-muted-foreground pt-2 border-t border-white/5">
                                    Upcoming Blank GWs: {chipStrategy.blankGameweeks.join(', ')}
                                </div>
                            )}
                            {chipStrategy.doubleGameweeks.length > 0 && (
                                <div className="text-xs text-muted-foreground">
                                    Upcoming Double GWs: {chipStrategy.doubleGameweeks.join(', ')}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
