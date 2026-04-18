"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, Shield } from "lucide-react";
import { motion, LayoutGroup } from "framer-motion";

interface Player {
    element: number;
    position: number;
    is_captain: boolean;
    is_vice_captain: boolean;
    multiplier: number;
}

interface FormationPitchProps {
    picks: Player[];
    players: any[];
    teams: any[];
    isChangingCaptain?: boolean;
    selectedCaptain?: number | null;
    selectedVice?: number | null;
    onPlayerSelect?: (playerId: number) => void;
    onPlayerSwap?: (playerAId: number, playerBId: number) => void;
}

export function FormationPitch({
    picks,
    players,
    teams,
    isChangingCaptain = false,
    selectedCaptain = null,
    selectedVice = null,
    onPlayerSelect,
    onPlayerSwap,
}: FormationPitchProps) {
    const getPlayer = (elementId: number) => {
        return players.find((p) => p.id === elementId);
    };

    const getTeam = (teamCode: number) => {
        return teams.find((t) => t.code === teamCode);
    };

    const getByPosition = (positionId: number) => {
        return picks
            .filter((p) => {
                const player = getPlayer(p.element);
                return player?.element_type === positionId && p.position <= 11;
            })
            .sort((a, b) => a.position - b.position);
    };

    const goalkeepers = getByPosition(1);
    const defenders = getByPosition(2);
    const midfielders = getByPosition(3);
    const forwards = getByPosition(4);
    const bench = picks.filter((p) => p.position > 11).sort((a, b) => a.position - b.position);

    const renderPlayer = (pick: Player, isBench = false) => {
        const player = getPlayer(pick.element);
        if (!player) return null;

        const team = getTeam(player.team_code);
        const isSelected = selectedCaptain === pick.element || selectedVice === pick.element;
        const willBeCaptain = selectedCaptain === pick.element;
        const willBeVice = selectedVice === pick.element;

        return (
            <motion.div
                key={pick.element}
                layoutId={`player-${pick.element}`}
                draggable={!isChangingCaptain}
                onDragStart={(e) => {
                    const el = e as unknown as React.DragEvent;
                    el.dataTransfer.setData('playerId', pick.element.toString());
                    el.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                    if (!isChangingCaptain) e.preventDefault();
                }}
                onDrop={(e) => {
                    if (isChangingCaptain) return;
                    e.preventDefault();
                    const el = e as unknown as React.DragEvent;
                    const draggedPlayerId = parseInt(el.dataTransfer.getData('playerId'), 10);
                    if (draggedPlayerId && draggedPlayerId !== pick.element && onPlayerSwap) {
                        onPlayerSwap(draggedPlayerId, pick.element);
                    }
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                    if (isChangingCaptain && onPlayerSelect && !isBench) {
                        onPlayerSelect(pick.element);
                    }
                }}
                className={`relative ${isChangingCaptain && !isBench ? "cursor-pointer" : isChangingCaptain ? "" : "cursor-grab active:cursor-grabbing"}`}
            >
                <Card
                    className={`text-center transition-all ${isSelected
                            ? "ring-2 ring-primary shadow-lg shadow-primary/50"
                            : pick.is_captain || pick.is_vice_captain
                                ? "border-primary"
                                : ""
                        } ${isBench ? "opacity-75" : ""}`}
                >
                    <CardContent className="p-2">
                        {/* Captain Badge */}
                        {(pick.is_captain || pick.is_vice_captain || willBeCaptain || willBeVice) && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute -top-2 -right-2"
                            >
                                <Badge
                                    variant={
                                        willBeCaptain || willBeVice ? "default" : "secondary"
                                    }
                                    className={`text-xs font-bold ${willBeCaptain || willBeVice
                                            ? "bg-gradient-to-r from-primary to-secondary"
                                            : ""
                                        }`}
                                >
                                    {pick.is_captain || willBeCaptain ? "C" : "VC"}
                                </Badge>
                            </motion.div>
                        )}

                        {/* Player Jersey/Icon */}
                        <div
                            className={`w-12 h-12 mx-auto mb-1 rounded-full flex items-center justify-center text-lg font-bold ${team?.short_name === "ARS"
                                    ? "bg-red-500"
                                    : team?.short_name === "MCI"
                                        ? "bg-sky-400"
                                        : team?.short_name === "LIV"
                                            ? "bg-red-600"
                                            : "bg-primary/20"
                                } text-white`}
                        >
                            {player.web_name.substring(0, 2).toUpperCase()}
                        </div>

                        {/* Player Name */}
                        <p className="font-semibold text-xs truncate">{player.web_name}</p>

                        {/* Team Badge */}
                        <p className="text-[10px] text-muted-foreground truncate">
                            {team?.short_name || ""}
                        </p>

                        {/* Points */}
                        <div className="flex items-center justify-center gap-1 mt-1">
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                                {player.event_points || 0} pts
                            </Badge>
                        </div>

                        {/* Form Indicator */}
                        {player.form && parseFloat(player.form) > 5 && (
                            <div className="absolute -bottom-1 -left-1">
                                <TrendingUp className="h-3 w-3 text-positive" />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        );
    };

    return (
        <LayoutGroup>
        <div className="space-y-4">
            {/* Pitch */}
            <Card className="bg-gradient-to-b from-green-600/20 via-green-500/10 to-green-600/20 border-green-600/30 overflow-hidden">
                <CardContent className="p-6 space-y-8">
                    {/* Forwards */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className={`grid grid-cols-${forwards.length} gap-3`}
                    >
                        {forwards.map((pick) => renderPlayer(pick))}
                    </motion.div>

                    {/* Midfielders */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className={`grid grid-cols-${midfielders.length} gap-3`}
                    >
                        {midfielders.map((pick) => renderPlayer(pick))}
                    </motion.div>

                    {/* Defenders */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className={`grid grid-cols-${defenders.length} gap-3`}
                    >
                        {defenders.map((pick) => renderPlayer(pick))}
                    </motion.div>

                    {/* Goalkeeper */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="grid grid-cols-1 place-items-center"
                    >
                        {goalkeepers.map((pick) => renderPlayer(pick))}
                    </motion.div>
                </CardContent>
            </Card>

            {/* Bench */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-semibold text-muted-foreground">Bench</p>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {bench.map((pick) => renderPlayer(pick, true))}
                    </div>
                </CardContent>
            </Card>
        </div>
        </LayoutGroup>
    );
}
