"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, UserCheck, TrendingUp, TrendingDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Player {
    element: number;
    position: number;
    is_captain: boolean;
    is_vice_captain: boolean;
    multiplier: number;
}

interface SquadDisplayProps {
    picks: Player[];
    players: any[]; // Bootstrap static players data
    onCaptainChange?: (captainId: number, viceCaptainId: number) => void;
}

export function SquadDisplay({ picks, players, onCaptainChange }: SquadDisplayProps) {
    const [selectedCaptain, setSelectedCaptain] = useState<number | null>(null);
    const [selectedVice, setSelectedVice] = useState<number | null>(null);

    // Get player details by element ID
    const getPlayer = (elementId: number) => {
        return players.find((p) => p.id === elementId);
    };

    // Group players by position
    const getByPosition = (positionId: number) => {
        return picks.filter((p) => {
            const player = getPlayer(p.element);
            return player?.element_type === positionId && p.position <= 11;
        });
    };

    const goalkeepers = getByPosition(1);
    const defenders = getByPosition(2);
    const midfielders = getByPosition(3);
    const forwards = getByPosition(4);

    const bench = picks.filter((p) => p.position > 11);

    const handlePlayerClick = (playerId: number) => {
        if (!selectedCaptain) {
            setSelectedCaptain(playerId);
        } else if (!selectedVice) {
            setSelectedVice(playerId);
            // Auto-submit once both selected
            if (onCaptainChange) {
                onCaptainChange(selectedCaptain, playerId);
            }
        } else {
            // Reset
            setSelectedCaptain(playerId);
            setSelectedVice(null);
        }
    };

    const resetSelection = () => {
        setSelectedCaptain(null);
        setSelectedVice(null);
    };

    const renderPlayer = (pick: Player) => {
        const player = getPlayer(pick.element);
        if (!player) return null;

        const isSelected = selectedCaptain === pick.element || selectedVice === pick.element;
        const isCaptain = pick.is_captain;
        const isVice = pick.is_vice_captain;

        return (
            <div
                key={pick.element}
                onClick={() => handlePlayerClick(pick.element)}
                className={`relative cursor-pointer transition-all hover:scale-105 ${isSelected ? "ring-2 ring-primary scale-105" : ""
                    }`}
            >
                <Card className={`text-center p-2 ${isCaptain || isVice ? "border-primary" : ""}`}>
                    <CardContent className="p-2">
                        {/* Captain/Vice badge */}
                        {(isCaptain || isVice) && (
                            <Badge
                                variant="default"
                                className="absolute -top-2 -right-2 text-xs"
                            >
                                {isCaptain ? "C" : "VC"}
                            </Badge>
                        )}

                        {/* Player name */}
                        <p className="font-semibold text-xs truncate">{player.web_name}</p>

                        {/* Team */}
                        <p className="text-[10px] text-muted-foreground">{player.team_code}</p>

                        {/* Points */}
                        <div className="flex items-center justify-center gap-1 mt-1">
                            <Badge variant="outline" className="text-[10px] px-1">
                                {player.total_points} pts
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {/* Captain Selection Info */}
            {(selectedCaptain || selectedVice) && (
                <Card className="border-primary bg-primary/5">
                    <CardContent className="p-3 flex items-center justify-between">
                        <div className="text-sm">
                            <p>
                                {selectedCaptain && !selectedVice
                                    ? "Now select Vice-Captain"
                                    : "Captain selected! Tap to change or reset."}
                            </p>
                        </div>
                        <Button size="sm" variant="outline" onClick={resetSelection}>
                            Reset
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Pitch */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Starting XI</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {/* Forwards */}
                    <div className="grid grid-cols-3 gap-2">
                        {forwards.map((pick) => renderPlayer(pick))}
                    </div>

                    {/* Midfielders */}
                    <div className={`grid grid-cols-${midfielders.length} gap-2`}>
                        {midfielders.map((pick) => renderPlayer(pick))}
                    </div>

                    {/* Defenders */}
                    <div className={`grid grid-cols-${defenders.length} gap-2`}>
                        {defenders.map((pick) => renderPlayer(pick))}
                    </div>

                    {/* Goalkeeper */}
                    <div className="grid grid-cols-1 gap-2 place-items-center max-w-[120px] mx-auto">
                        {goalkeepers.map((pick) => renderPlayer(pick))}
                    </div>
                </CardContent>
            </Card>

            {/* Bench */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">Bench</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-4 gap-2">
                        {bench.map((pick) => renderPlayer(pick))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
