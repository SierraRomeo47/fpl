"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, ArrowLeftRight, Star, TrendingUp, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { FormationPitch } from "./formation-pitch";
import { TransferPanel } from "./transfer-panel";

interface SquadManagerProps {
    myTeam: any;
    bootstrap: any;
    fixtures: any[];
}

export function SquadManager({ myTeam, bootstrap, fixtures }: SquadManagerProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("lineup");
    const [isChangingCaptain, setIsChangingCaptain] = useState(false);
    const [selectedCaptain, setSelectedCaptain] = useState<number | null>(null);
    const [selectedVice, setSelectedVice] = useState<number | null>(null);
    const [localPicks, setLocalPicks] = useState(myTeam.picks);
    const [isSavingFormation, setIsSavingFormation] = useState(false);

    // Sync from server if myTeam changes
    useEffect(() => {
        setLocalPicks(myTeam.picks);
    }, [myTeam.picks]);

    // Get current captain and vice
    const currentCaptain = localPicks.find((p: any) => p.is_captain);
    const currentVice = localPicks.find((p: any) => p.is_vice_captain);

    const handleCaptainChange = async () => {
        if (!selectedCaptain || !selectedVice) {
            toast.error("Please select both captain and vice-captain");
            return;
        }

        try {
            const res = await fetch("/api/squad/captain", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    captainId: selectedCaptain,
                    viceCaptainId: selectedVice,
                }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                toast.success("Captain Updated!", {
                    description: "Your captain has been changed successfully.",
                });
                setIsChangingCaptain(false);
                router.refresh();
            } else {
                toast.error("Update Failed", {
                    description: data.error || "Failed to update captain",
                });
            }
        } catch (error) {
            toast.error("Network Error", {
                description: "Please try again later.",
            });
        }
    };

    const handlePlayerSelect = (playerId: number) => {
        if (!selectedCaptain) {
            setSelectedCaptain(playerId);
        } else if (!selectedVice) {
            setSelectedVice(playerId);
        } else {
            // Reset
            setSelectedCaptain(playerId);
            setSelectedVice(null);
        }
    };

    const handlePlayerSwap = (draggedId: number, targetId: number) => {
        setLocalPicks((prevPicks: any) => {
            const newPicks = [...prevPicks];
            const draggedIdx = newPicks.findIndex(p => p.element === draggedId);
            const targetIdx = newPicks.findIndex(p => p.element === targetId);
            
            if (draggedIdx === -1 || targetIdx === -1) return prevPicks;

            // Swap positions
            const draggedPos = newPicks[draggedIdx].position;
            const targetPos = newPicks[targetIdx].position;
            
            newPicks[draggedIdx] = { ...newPicks[draggedIdx], position: targetPos };
            newPicks[targetIdx] = { ...newPicks[targetIdx], position: draggedPos };
            
            return newPicks.sort((a, b) => a.position - b.position);
        });
    };

    const hasUnsavedChanges = JSON.stringify(localPicks) !== JSON.stringify(myTeam.picks);

    const saveFormation = async () => {
        setIsSavingFormation(true);
        try {
            const res = await fetch("/api/squad/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ picks: localPicks }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success("Formation Saved!");
                router.refresh();
            } else {
                toast.error("Save Failed", { description: data.error || "Failed to update formation" });
            }
        } catch (error) {
            toast.error("Network Error", { description: "Please try again later." });
        } finally {
            setIsSavingFormation(false);
        }
    };

    return (
        <div className="container max-w-6xl mx-auto p-4 pb-20">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
            >
                <div className="flex items-center justify-between mb-4">
                    <Button
                        variant="ghost"
                        onClick={() => router.push("/dashboard")}
                        className="gap-2"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Dashboard
                    </Button>

                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">Team Value</p>
                        <p className="text-2xl font-bold text-primary">
                            £{(myTeam.entry.value / 10).toFixed(1)}m
                        </p>
                    </div>
                </div>

                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    My Squad
                </h1>
                <p className="text-muted-foreground mt-1">
                    {myTeam.transfers.limit - myTeam.transfers.made} free transfer{myTeam.transfers.limit - myTeam.transfers.made !== 1 ? 's' : ''} remaining
                </p>
            </motion.div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-2 bg-muted/50">
                    <TabsTrigger value="lineup" className="gap-2">
                        <Users className="h-4 w-4" />
                        Lineup
                    </TabsTrigger>
                    <TabsTrigger value="transfers" className="gap-2">
                        <ArrowLeftRight className="h-4 w-4" />
                        Transfers
                    </TabsTrigger>
                </TabsList>

                {/* Lineup Tab */}
                <TabsContent value="lineup" className="space-y-4 mt-6">
                    {/* Captain Change Mode */}
                    {isChangingCaptain && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                        >
                            <Card className="border-primary bg-primary/5">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <p className="font-semibold">Select New Captain</p>
                                            <p className="text-sm text-muted-foreground">
                                                {!selectedCaptain
                                                    ? "Tap a player to set as captain"
                                                    : !selectedVice
                                                        ? "Now select vice-captain"
                                                        : "Ready to confirm"}
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                setIsChangingCaptain(false);
                                                setSelectedCaptain(null);
                                                setSelectedVice(null);
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    </div>

                                    {selectedCaptain && selectedVice && (
                                        <Button
                                            onClick={handleCaptainChange}
                                            className="w-full bg-gradient-to-r from-primary to-secondary"
                                        >
                                            <Star className="mr-2 h-4 w-4" />
                                            Confirm Captain Change
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* Formation Display */}
                    <FormationPitch
                        picks={localPicks}
                        players={bootstrap.elements}
                        teams={bootstrap.teams}
                        isChangingCaptain={isChangingCaptain}
                        selectedCaptain={selectedCaptain}
                        selectedVice={selectedVice}
                        onPlayerSelect={handlePlayerSelect}
                        onPlayerSwap={handlePlayerSwap}
                    />

                    {/* Action Buttons */}
                    {hasUnsavedChanges && !isChangingCaptain && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center justify-between"
                        >
                            <p className="text-sm font-medium">You have unsaved lineup changes.</p>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setLocalPicks(myTeam.picks)}>Discard</Button>
                                <Button size="sm" onClick={saveFormation} disabled={isSavingFormation}>
                                    {isSavingFormation ? "Saving..." : "Save Formation"}
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {!isChangingCaptain && !hasUnsavedChanges && (
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setIsChangingCaptain(true)}
                                className="gap-2"
                            >
                                <Star className="h-4 w-4" />
                                Change Captain
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setActiveTab("transfers")}
                                className="gap-2"
                            >
                                <ArrowLeftRight className="h-4 w-4" />
                                Make Transfers
                            </Button>
                        </div>
                    )}
                </TabsContent>

                {/* Transfers Tab */}
                <TabsContent value="transfers" className="space-y-4 mt-6">
                    <TransferPanel
                        myTeam={myTeam}
                        bootstrap={bootstrap}
                        fixtures={fixtures}
                        onTransferComplete={() => router.refresh()}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
