
import { FPLBootstrapStatic, FPLElement, FPLMyTeam, FPLEvent } from "@/types/fpl";

export interface TransferSuggestion {
    playerIn: FPLElement;
    playerOut: FPLElement;
    scoreImprovement: number;
    reason: string;
}

export class AIEngine {
    private bootstrap: FPLBootstrapStatic;
    private myTeam: FPLMyTeam;

    constructor(bootstrap: FPLBootstrapStatic, myTeam: FPLMyTeam) {
        this.bootstrap = bootstrap;
        this.myTeam = myTeam;
    }

    /**
     * Simple "Form + Fixture" Algorithm
     */
    recommendTransfers(budget: number = 0): TransferSuggestion[] {
        const suggestions: TransferSuggestion[] = [];
        const teamIds = new Set(this.myTeam.picks.map(p => p.element));

        // 1. Identify weakest link in starting XI
        // Lowest form in starting XI (pos 1-11)
        const startingPicks = this.myTeam.picks.filter(p => p.position <= 11);

        let worstPlayer: FPLElement | null = null;
        let minForm = 1000;

        for (const pick of startingPicks) {
            const player = this.bootstrap.elements.find(e => e.id === pick.element);
            if (player) {
                const form = parseFloat(player.form);
                if (form < minForm) {
                    minForm = form;
                    worstPlayer = player;
                }
            }
        }

        if (!worstPlayer) return [];

        // 2. Find replacement
        // Same position, cost <= worstPlayer.cost + budget (bank), high form
        const maxCost = (worstPlayer.now_cost + this.myTeam.transfers.bank);

        const candidates = this.bootstrap.elements
            .filter(e => e.element_type === worstPlayer!.element_type) // Same pos
            .filter(e => e.now_cost <= maxCost)
            .filter(e => !teamIds.has(e.id)) // Not already in team
            .filter(e => e.status === 'a') // Available
            .sort((a, b) => parseFloat(b.form) - parseFloat(a.form)); // Sort by form

        const topCandidate = candidates[0];

        if (topCandidate && parseFloat(topCandidate.form) > minForm + 2.0) {
            suggestions.push({
                playerIn: topCandidate,
                playerOut: worstPlayer,
                scoreImprovement: parseFloat(topCandidate.form) - minForm,
                reason: `Upgrade form: ${worstPlayer.web_name} (${minForm}) -> ${topCandidate.web_name} (${topCandidate.form})`
            });
        }

        return suggestions;
    }

    /**
     * Optimize Captain Choice for next GW
     */
    recommendCaptain(): FPLElement | null {
        // Find highest form player in team
        let bestPlayer: FPLElement | null = null;
        let maxForm = -1;

        for (const pick of this.myTeam.picks) {
            const player = this.bootstrap.elements.find(e => e.id === pick.element);
            if (player) {
                const form = parseFloat(player.form);
                if (form > maxForm) {
                    maxForm = form;
                    bestPlayer = player;
                }
            }
        }
        return bestPlayer;
    }
}
