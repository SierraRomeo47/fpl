import { getSession } from "@/lib/session-store";
import { getFPLData } from "@/lib/data-service";
import { AIEngine } from "@/lib/ai-engine";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, TrendingUp, AlertTriangle, ArrowRight } from "lucide-react";

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

    const { bootstrap, myTeam } = data;
    const engine = new AIEngine(bootstrap, myTeam);

    const transfers = engine.recommendTransfers(myTeam.transfers.bank);
    const topTransfer = transfers[0]; // Just take best one for now

    return (
        <div className="min-h-screen bg-background p-4 md:p-8 pb-24 md:pb-12">
            <div className="container-4k space-y-8">
                <header>
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tighter">
                        AI Insights
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        Powered by DnD Engine
                    </p>
                </header>

                {/* Top Transfer Recommendation */}
                <Card className="glass-hd border-green-500/20 bg-green-500/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xl flex items-center gap-2 text-green-400">
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
                                            <div className="font-bold text-lg text-green-400">{topTransfer.playerIn.web_name}</div>
                                        </div>
                                    </div>

                                    <div className="text-right w-full md:w-auto bg-background/50 p-3 rounded-lg">
                                        <div className="text-3xl font-bold text-green-400">+{topTransfer.scoreImprovement.toFixed(1)}</div>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Form Diff</p>
                                    </div>
                                </div>
                                <div className="mt-4 text-sm text-foreground/80 p-3 bg-background/30 rounded border border-white/5">
                                    {topTransfer.reason}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                No obvious transfer upgrades found based on form. Your team is solid!
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Warning Placeholder */}
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

                    {/* Chip Strategy Placeholder */}
                    <Card className="glass-hd border-primary/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <BrainCircuit className="w-5 h-5 text-secondary" />
                                Chip Optimization
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center p-3 rounded-lg bg-background/40 border border-white/5">
                                <span className="font-semibold">Wildcard</span>
                                <Badge variant="outline" className="text-muted-foreground border-white/10">Hold</Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
