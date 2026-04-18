"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Search,
    ArrowRightLeft,
    TrendingUp,
    Activity,
    X,
    Check,
    AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface TransferPanelProps {
    myTeam: any;
    bootstrap: any;
    fixtures: any[];
    onTransferComplete?: () => void;
}

export function TransferPanel({
    myTeam,
    bootstrap,
    fixtures,
    onTransferComplete,
}: TransferPanelProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
    const [playerOut, setPlayerOut] = useState<any>(null);
    const [playerIn, setPlayerIn] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [forecastData, setForecastData] = useState<{ outPoints: number, inPoints: number, diff: number } | null>(null);

    const positions = [
        { id: 1, name: "GK", label: "Goalkeepers" },
        { id: 2, name: "DEF", label: "Defenders" },
        { id: 3, name: "MID", label: "Midfielders" },
        { id: 4, name: "FWD", label: "Forwards" },
    ];

    // Get current squad player IDs
    const squadPlayerIds = myTeam.picks.map((p: any) => p.element);

    // Filter available players
    const availablePlayers = bootstrap.elements.filter((player: any) => {
        const matchesSearch =
            searchQuery === "" ||
            player.web_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            player.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            player.second_name.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesPosition =
            selectedPosition === null || player.element_type === selectedPosition;

        const notInSquad = !squadPlayerIds.includes(player.id);

        return matchesSearch && matchesPosition && notInSquad;
    });

    // Sort by points
    const sortedPlayers = availablePlayers.sort(
        (a: any, b: any) => b.total_points - a.total_points
    );

    // Current squad filtered by position
    const squadPlayers = myTeam.picks
        .map((pick: any) => {
            const player = bootstrap.elements.find((p: any) => p.id === pick.element);
            return { ...player, selling_price: pick.selling_price };
        })
        .filter((player: any) =>
            selectedPosition === null ? true : player.element_type === selectedPosition
        );

    const handleTransferSubmit = async () => {
        if (!playerOut || !playerIn) {
            toast.error("Please select both players");
            return;
        }

        const outPoints = parseFloat(playerOut.ep_this || "0") + parseFloat(playerOut.ep_next || "0");
        const inPoints = parseFloat(playerIn.ep_this || "0") + parseFloat(playerIn.ep_next || "0");
        const diff = inPoints - outPoints;

        setForecastData({ outPoints, inPoints, diff });
        setIsSubmitting(true);
        setTimeout(() => setIsSubmitting(false), 800); // Simulate processing time for UX
    };

    const clearForecast = () => {
        setForecastData(null);
        setPlayerOut(null);
        setPlayerIn(null);
    };

    const getTeamName = (teamCode: number) => {
        const team = bootstrap.teams.find((t: any) => t.code === teamCode);
        return team?.short_name || "";
    };

    const renderPlayerCard = (player: any, isSquad = false) => (
        <motion.div
            key={player.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => {
                if (isSquad) {
                    setPlayerOut(player);
                } else {
                    setPlayerIn(player);
                }
            }}
            className={`cursor-pointer ${(isSquad && playerOut?.id === player.id) ||
                    (!isSquad && playerIn?.id === player.id)
                    ? "ring-2 ring-primary"
                    : ""
                }`}
        >
            <Card>
                <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{player.web_name}</p>
                            <p className="text-xs text-muted-foreground">
                                {getTeamName(player.team_code)}
                            </p>
                        </div>
                        <div className="text-right">
                            <Badge variant="outline" className="text-xs">
                                £{(player.now_cost / 10).toFixed(1)}m
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                                {player.total_points} pts
                            </p>
                        </div>
                    </div>

                    {/* Form & Fixtures */}
                    <div className="flex items-center gap-2 mt-2">
                        {parseFloat(player.form) > 5 && (
                            <Badge variant="secondary" className="text-[10px]">
                                <TrendingUp className="h-2 w-2 mr-1" />
                                Hot
                            </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px]">
                            Form: {parseFloat(player.form).toFixed(1)}
                        </Badge>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );

    const costDiff =
        playerOut && playerIn
            ? (playerIn.now_cost - (playerOut.selling_price || playerOut.now_cost)) / 10
            : 0;
    const remainingBudget = myTeam.transfers.bank / 10;

    return (
        <div className="space-y-4">
            {/* Transfer Summary */}
            <AnimatePresence>
                {(playerOut || playerIn) && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <Card className="border-primary bg-primary/5">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="font-semibold">Transfer Summary</p>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                            setPlayerOut(null);
                                            setPlayerIn(null);
                                        }}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    {/* Out */}
                                    <div className="flex items-center gap-2">
                                        <Badge variant="destructive" className="text-xs">
                                            OUT
                                        </Badge>
                                        <span className="text-sm">
                                            {playerOut?.web_name || "Select player to transfer out"}
                                        </span>
                                    </div>

                                    {/* In */}
                                    <div className="flex items-center gap-2">
                                        <Badge className="text-xs bg-green-600">IN</Badge>
                                        <span className="text-sm">
                                            {playerIn?.web_name || "Select player to transfer in"}
                                        </span>
                                    </div>

                                    {/* Cost */}
                                    {playerOut && playerIn && (
                                        <>
                                            <div className="flex items-center justify-between pt-2 border-t">
                                                <span className="text-sm">Cost Difference:</span>
                                                <span
                                                    className={`text-sm font-semibold ${costDiff > 0
                                                            ? "text-negative"
                                                            : costDiff < 0
                                                                ? "text-positive"
                                                                : ""
                                                        }`}
                                                >
                                                    {costDiff > 0 && "+"}£{costDiff.toFixed(1)}m
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm">Remaining Budget:</span>
                                                <span className="text-sm font-semibold">
                                                    £{(remainingBudget - costDiff).toFixed(1)}m
                                                </span>
                                            </div>

                                            {costDiff > remainingBudget && (
                                                <div className="flex items-center gap-2 text-destructive text-xs bg-destructive/10 p-2 rounded">
                                                    <AlertCircle className="h-4 w-4" />
                                                    <span>Insufficient funds for this transfer</span>
                                                </div>
                                            )}

                                                {forecastData && (
                                                    <div className="pt-4 border-t border-border mt-4">
                                                        <h4 className="font-bold font-headline mb-2 flex items-center gap-2 text-primary">
                                                            <Activity className="w-5 h-5" /> Expected Points (Next 2 GWs)
                                                        </h4>
                                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                                            <div className="p-3 bg-destructive/10 rounded-lg text-center border border-destructive/20">
                                                                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Lost xP</p>
                                                                <p className="text-xl font-bold text-destructive">{forecastData.outPoints.toFixed(1)}</p>
                                                            </div>
                                                            <div className="p-3 bg-positive-muted rounded-lg text-center border border-positive/25">
                                                                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Gained xP</p>
                                                                <p className="text-xl font-bold text-positive">{forecastData.inPoints.toFixed(1)}</p>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className={`p-4 rounded-lg border ${forecastData.diff > 4 ? 'bg-positive-muted border-positive/35' : forecastData.diff > 0 ? 'bg-primary/10 border-primary/20' : 'bg-muted border-border'}`}>
                                                            <p className="text-sm font-semibold mb-1">
                                                                Expected Differential: <span className={forecastData.diff > 0 ? "text-positive" : "text-negative"}>{forecastData.diff > 0 && '+'}{forecastData.diff.toFixed(1)} pts</span>
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {forecastData.diff > 4 ? 
                                                                    `Excellent move. Brings immediate value even if you take a -4 transfer hit.` : 
                                                                 forecastData.diff > 0 ? 
                                                                    `Positive upgrade. It pays off if using a Free Transfer, but fails to break even over 2 weeks if taking a -4 hit.` : 
                                                                    `Warning: This move actively damages your expected points output according to current FPL projection math.`}
                                                            </p>
                                                        </div>
                                                        <Button variant="outline" className="w-full mt-4" onClick={clearForecast}>
                                                            Reset Sandbox
                                                        </Button>
                                                    </div>
                                                )}

                                                {!forecastData && (
                                                    <Button
                                                        onClick={handleTransferSubmit}
                                                        disabled={isSubmitting || costDiff > remainingBudget}
                                                        className="w-full bg-gradient-to-r from-primary to-secondary mt-2"
                                                    >
                                                        {isSubmitting ? "Evaluating..." : (
                                                            <>
                                                                <Check className="mr-2 h-4 w-4" /> Evaluate Scenario
                                                            </>
                                                        )}
                                                    </Button>
                                                )}
                                            </>
                                        )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Position Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                <Button
                    size="sm"
                    variant={selectedPosition === null ? "default" : "outline"}
                    onClick={() => setSelectedPosition(null)}
                >
                    All
                </Button>
                {positions.map((pos) => (
                    <Button
                        key={pos.id}
                        size="sm"
                        variant={selectedPosition === pos.id ? "default" : "outline"}
                        onClick={() => setSelectedPosition(pos.id)}
                    >
                        {pos.name}
                    </Button>
                ))}
            </div>

            {/* Transfer Tabs */}
            <Tabs defaultValue="out" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="out">Transfer Out</TabsTrigger>
                    <TabsTrigger value="in">Transfer In</TabsTrigger>
                </TabsList>

                {/* Transfer Out */}
                <TabsContent value="out" className="space-y-3 mt-4">
                    <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-2">
                            {squadPlayers.map((player: any) => renderPlayerCard(player, true))}
                        </div>
                    </ScrollArea>
                </TabsContent>

                {/* Transfer In */}
                <TabsContent value="in" className="space-y-3 mt-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search players..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-2">
                            {sortedPlayers.slice(0, 50).map((player: any) =>
                                renderPlayerCard(player, false)
                            )}
                        </div>
                    </ScrollArea>
                </TabsContent>
            </Tabs>
        </div>
    );
}
