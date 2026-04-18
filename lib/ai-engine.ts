
import { FPLBootstrapStatic, FPLElement, FPLMyTeam, FPLEvent, FPLFixture, TeamStructureAnalysis, ChipRecommendation, ChipStrategy, PlayerUpgradeRanking } from "@/types/fpl";

export interface TransferSuggestion {
    playerIn: FPLElement;
    playerOut: FPLElement;
    scoreImprovement: number;
    reason: string;
    fixtureContext?: string;
    strategy: 'push' | 'pull';
}

export interface CaptainRecommendation {
    player: FPLElement;
    score: number;
    fdr: number;
    isHome: boolean;
    reason: string;
}

export class AIEngine {
    private bootstrap: FPLBootstrapStatic;
    private myTeam: FPLMyTeam;
    private fixtures: FPLFixture[];
    private currentEvent: number;

    constructor(bootstrap: FPLBootstrapStatic, myTeam: FPLMyTeam, fixtures: FPLFixture[] = [], currentEvent: number = 1) {
        this.bootstrap = bootstrap;
        this.myTeam = myTeam;
        this.fixtures = fixtures;
        this.currentEvent = currentEvent;
    }

    /**
     * Get next fixture for a player's team
     */
    private getNextFixture(teamId: number): FPLFixture | null {
        const nextFixtures = this.fixtures
            .filter(f => {
                const isTeamInFixture = f.team_h === teamId || f.team_a === teamId;
                const isFuture = f.event > this.currentEvent;
                const isNotFinished = !f.finished;
                return isTeamInFixture && isFuture && isNotFinished;
            })
            .sort((a, b) => a.event - b.event);
        
        return nextFixtures[0] || null;
    }

    /**
     * Check if fixture is home for given team
     */
    private isHomeFixture(fixture: FPLFixture, teamId: number): boolean {
        return fixture.team_h === teamId;
    }

    /**
     * Calculate captain score based on Joshua Bull's research:
     * Primary: FDR (lower is better), Secondary: Home advantage, Tertiary: Form
     */
    private calculateCaptainScore(player: FPLElement, fixture: FPLFixture | null, isHome: boolean): number {
        if (!fixture) {
            // Fallback to form if no fixture data
            return parseFloat(player.form) || 0;
        }

        const difficulty = isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty;
        const form = parseFloat(player.form) || 0;
        
        // FDR scoring: lower FDR = higher score (6 - FDR gives us 5 for FDR=1, 1 for FDR=5)
        const fdrScore = (6 - difficulty) * 10; // Primary factor (weighted heavily)
        
        // Home advantage: +10% bonus
        const homeBonus = isHome ? fdrScore * 0.1 : 0;
        
        // Form as tie-breaker (small weight)
        const formScore = form * 0.5;
        
        return fdrScore + homeBonus + formScore;
    }

    /**
     * Enhanced Transfer Algorithm based on Joshua Bull's research:
     * - Uses ranked upgrades as source of truth for consistency
     * - Returns top transfer from ranked list
     */
    recommendTransfers(budget: number = 0, strategy: 'push' | 'pull' = 'push'): TransferSuggestion[] {
        // Use ranked upgrades as source of truth to ensure consistency
        const rankedUpgrades = this.rankPlayerUpgrades();
        
        if (rankedUpgrades.length === 0) return [];

        // Convert top ranked upgrade to TransferSuggestion format
        const topUpgrade = rankedUpgrades[0];
        
        // Get next fixture for context
        const nextFixture = this.getNextFixture(topUpgrade.playerIn.team);
        let fixtureContext = '';
        if (nextFixture) {
            const isHome = this.isHomeFixture(nextFixture, topUpgrade.playerIn.team);
            const difficulty = isHome ? nextFixture.team_h_difficulty : nextFixture.team_a_difficulty;
            fixtureContext = `FDR ${difficulty}${isHome ? ' (H)' : ' (A)'}`;
        }

        return [{
            playerIn: topUpgrade.playerIn,
            playerOut: topUpgrade.playerOut,
            scoreImprovement: topUpgrade.formImprovement,
            reason: topUpgrade.reason,
            fixtureContext: fixtureContext,
            strategy: 'push'
        }];
    }

    /**
     * Optimize Captain Choice for next GW based on Joshua Bull's research:
     * Primary: Fixture Difficulty (FDR) - lower is better
     * Secondary: Home advantage
     * Tertiary: Form (tie-breaker only)
     */
    recommendCaptain(): CaptainRecommendation | null {
        const candidates: Array<{
            player: FPLElement;
            score: number;
            fdr: number;
            isHome: boolean;
            fixture: FPLFixture | null;
        }> = [];

        // Evaluate all players in team
        for (const pick of this.myTeam.picks) {
            const player = this.bootstrap.elements.find(e => e.id === pick.element);
            if (!player) continue;

            const nextFixture = this.getNextFixture(player.team);
            if (!nextFixture) continue; // Skip if no fixture data

            const isHome = this.isHomeFixture(nextFixture, player.team);
            const difficulty = isHome ? nextFixture.team_h_difficulty : nextFixture.team_a_difficulty;
            const score = this.calculateCaptainScore(player, nextFixture, isHome);

            candidates.push({
                player,
                score,
                fdr: difficulty,
                isHome,
                fixture: nextFixture
            });
        }

        if (candidates.length === 0) {
            // Fallback to form-based if no fixture data
            let bestPlayer: FPLElement | null = null;
            let maxForm = -1;
            const formCandidates: Array<{ player: FPLElement; form: number }> = [];
            
            for (const pick of this.myTeam.picks) {
                const player = this.bootstrap.elements.find(e => e.id === pick.element);
                if (player) {
                    const form = parseFloat(player.form);
                    formCandidates.push({ player, form });
                }
            }
            
            // Sort by form with deterministic tiebreaker
            formCandidates.sort((a, b) => {
                if (Math.abs(b.form - a.form) < 0.01) {
                    return a.player.id - b.player.id; // Deterministic tiebreaker
                }
                return b.form - a.form;
            });
            
            bestPlayer = formCandidates[0]?.player || null;
            maxForm = formCandidates[0]?.form || -1;
            
            if (bestPlayer) {
                return {
                    player: bestPlayer,
                    score: maxForm,
                    fdr: 3, // Neutral
                    isHome: false,
                    reason: `No fixture data available. Selected based on form: ${maxForm.toFixed(1)}`
                };
            }
            return null;
        }

        // Sort by score (highest first), with deterministic tiebreaker
        candidates.sort((a, b) => {
            if (Math.abs(b.score - a.score) < 0.01) {
                // Tiebreaker: use player ID for deterministic sorting
                return a.player.id - b.player.id;
            }
            return b.score - a.score;
        });
        const best = candidates[0];

        // Build reason string
        const reasonParts = [
            `FDR ${best.fdr}${best.isHome ? ' (Home)' : ' (Away)'}`
        ];
        const form = parseFloat(best.player.form);
        if (form > 0) {
            reasonParts.push(`Form: ${form.toFixed(1)}`);
        }

        return {
            player: best.player,
            score: best.score,
            fdr: best.fdr,
            isHome: best.isHome,
            reason: `Best fixture opportunity. ${reasonParts.join(', ')}`
        };
    }

    /**
     * Analyze team structure - Stars & Scrubs vs Balanced
     * Based on Joshua Bull's research: Stars & Scrubs > Balanced
     */
    analyzeTeamStructure(): TeamStructureAnalysis {
        const players = this.myTeam.picks
            .map(pick => this.bootstrap.elements.find(e => e.id === pick.element))
            .filter((p): p is FPLElement => p !== undefined);

        let premiumCount = 0; // > £8m
        let midPriceCount = 0; // £6m-£8m
        let budgetCount = 0; // < £6m

        players.forEach(player => {
            const price = player.now_cost / 10;
            if (price > 8) {
                premiumCount++;
            } else if (price >= 6) {
                midPriceCount++;
            } else {
                budgetCount++;
            }
        });

        // Determine structure
        let structure: 'stars-scrubs' | 'balanced' | 'mid-heavy';
        let recommendation: string;
        let score: number;

        if (premiumCount >= 3 && budgetCount >= 4) {
            structure = 'stars-scrubs';
            recommendation = 'Optimal structure! You have premium assets with budget fillers. This aligns with research showing Stars & Scrubs outperforms balanced teams.';
            score = 90;
        } else if (midPriceCount >= 6) {
            structure = 'mid-heavy';
            recommendation = 'Your team is too balanced with many mid-priced players. Consider consolidating into fewer premium assets and more budget options to maximize points ceiling.';
            score = 50;
        } else {
            structure = 'balanced';
            recommendation = 'Your team has a balanced structure. Research suggests concentrating budget on premium players (Stars & Scrubs) may yield better results.';
            score = 65;
        }

        return {
            structure,
            premiumCount,
            midPriceCount,
            budgetCount,
            recommendation,
            score
        };
    }

    /**
     * Identify Blank Gameweeks (teams with no fixtures)
     */
    private identifyBlankGameweeks(): number[] {
        const blankGWs: number[] = [];
        const futureEvents = this.bootstrap.events
            .filter(e => e.id > this.currentEvent && !e.finished)
            .map(e => e.id);

        for (const eventId of futureEvents) {
            const fixturesInGW = this.fixtures.filter(f => f.event === eventId && !f.finished);
            const teamsPlaying = new Set<number>();
            
            fixturesInGW.forEach(f => {
                teamsPlaying.add(f.team_h);
                teamsPlaying.add(f.team_a);
            });

            // If less than 20 teams are playing, it's a blank GW
            if (teamsPlaying.size < 20) {
                blankGWs.push(eventId);
            }
        }

        return blankGWs;
    }

    /**
     * Identify Double Gameweeks (teams playing twice)
     */
    private identifyDoubleGameweeks(): number[] {
        const doubleGWs: number[] = [];
        const futureEvents = this.bootstrap.events
            .filter(e => e.id > this.currentEvent && !e.finished)
            .map(e => e.id);

        for (const eventId of futureEvents) {
            const fixturesInGW = this.fixtures.filter(f => f.event === eventId && !f.finished);
            const teamFixtureCount = new Map<number, number>();
            
            fixturesInGW.forEach(f => {
                teamFixtureCount.set(f.team_h, (teamFixtureCount.get(f.team_h) || 0) + 1);
                teamFixtureCount.set(f.team_a, (teamFixtureCount.get(f.team_a) || 0) + 1);
            });

            // If any team plays twice, it's a double GW
            const hasDouble = Array.from(teamFixtureCount.values()).some(count => count > 1);
            if (hasDouble) {
                doubleGWs.push(eventId);
            }
        }

        return doubleGWs;
    }

    /**
     * Recommend chip strategy based on Blank GWs and Double GWs
     */
    recommendChipStrategy(): ChipStrategy {
        const blankGWs = this.identifyBlankGameweeks();
        const doubleGWs = this.identifyDoubleGameweeks();
        
        // Get remaining chips (assuming chips array contains used chips)
        const usedChips = new Set(this.myTeam.chips.map((c: any) => c.name || c.event || c));
        const allChips = ['wildcard', 'freehit', 'bench_boost', 'triple_captain'];
        const remainingChips = allChips.filter(chip => !usedChips.has(chip));

        const recommendations: ChipRecommendation[] = [];

        // Wildcard: Use before big Blank GWs or to set up for Double GWs
        if (remainingChips.includes('wildcard')) {
            const nextBlankGW = blankGWs[0];
            const nextDoubleGW = doubleGWs[0];
            
            if (nextBlankGW && nextBlankGW <= this.currentEvent + 3) {
                recommendations.push({
                    chip: 'wildcard',
                    gameweek: nextBlankGW - 1,
                    reason: `Use Wildcard before Blank GW${nextBlankGW} to avoid having multiple blank players. Set up team for upcoming fixtures.`,
                    priority: 'high',
                    blankGWs: [nextBlankGW]
                });
            } else if (nextDoubleGW && nextDoubleGW <= this.currentEvent + 5) {
                recommendations.push({
                    chip: 'wildcard',
                    gameweek: nextDoubleGW - 2,
                    reason: `Use Wildcard to load up on Double GW${nextDoubleGW} players. Maximize points potential.`,
                    priority: 'high',
                    doubleGWs: [nextDoubleGW]
                });
            } else {
                recommendations.push({
                    chip: 'wildcard',
                    gameweek: this.currentEvent + 1,
                    reason: 'Use Wildcard to restructure team based on form and fixtures. Best used early in second half of season.',
                    priority: 'medium'
                });
            }
        }

        // Free Hit: Perfect for Blank GWs
        if (remainingChips.includes('freehit')) {
            const nextBlankGW = blankGWs[0];
            if (nextBlankGW) {
                recommendations.push({
                    chip: 'freehit',
                    gameweek: nextBlankGW,
                    reason: `Use Free Hit in Blank GW${nextBlankGW} to field full 11 without taking hits. Avoids wasting transfers.`,
                    priority: 'high',
                    blankGWs: [nextBlankGW]
                });
            } else {
                recommendations.push({
                    chip: 'freehit',
                    gameweek: this.currentEvent + 2,
                    reason: 'Save Free Hit for major Blank GW. Use when multiple key players are missing.',
                    priority: 'low'
                });
            }
        }

        // Bench Boost: Use in Double GWs with strong bench
        if (remainingChips.includes('bench_boost')) {
            const nextDoubleGW = doubleGWs[0];
            if (nextDoubleGW) {
                recommendations.push({
                    chip: 'bench_boost',
                    gameweek: nextDoubleGW,
                    reason: `Use Bench Boost in Double GW${nextDoubleGW} to maximize points from all 15 players. Ensure bench has DGW players.`,
                    priority: 'high',
                    doubleGWs: [nextDoubleGW]
                });
            } else {
                recommendations.push({
                    chip: 'bench_boost',
                    gameweek: this.currentEvent + 3,
                    reason: 'Use Bench Boost when you have strong bench players with good fixtures. Best in Double GWs.',
                    priority: 'medium'
                });
            }
        }

        // Triple Captain: Use in Double GWs or easy single fixtures
        if (remainingChips.includes('triple_captain')) {
            const nextDoubleGW = doubleGWs[0];
            if (nextDoubleGW) {
                recommendations.push({
                    chip: 'triple_captain',
                    gameweek: nextDoubleGW,
                    reason: `Use Triple Captain in Double GW${nextDoubleGW} on premium player with easy fixtures. 3x points from 2 games = massive upside.`,
                    priority: 'high',
                    doubleGWs: [nextDoubleGW]
                });
            } else {
                // Find best single fixture for TC
                const captainRec = this.recommendCaptain();
                if (captainRec && captainRec.fdr <= 2) {
                    recommendations.push({
                        chip: 'triple_captain',
                        gameweek: this.currentEvent + 1,
                        reason: `Use Triple Captain on ${captainRec.player.web_name} with FDR ${captainRec.fdr} fixture. High ceiling opportunity.`,
                        priority: 'medium'
                    });
                } else {
                    recommendations.push({
                        chip: 'triple_captain',
                        gameweek: this.currentEvent + 2,
                        reason: 'Save Triple Captain for Double GW or premium player with FDR 1-2 fixture. Maximize points ceiling.',
                        priority: 'low'
                    });
                }
            }
        }

        return {
            recommendations,
            remainingChips,
            blankGameweeks: blankGWs,
            doubleGameweeks: doubleGWs
        };
    }

    /**
     * Rank all 15 players with upgrade suggestions
     * Based on Joshua Bull's strategies: Form > Fixtures > Value
     */
    rankPlayerUpgrades(): PlayerUpgradeRanking[] {
        const rankings: PlayerUpgradeRanking[] = [];
        const teamIds = new Set(this.myTeam.picks.map(p => p.element));
        const availableFTs = this.myTeam.transfers.limit - this.myTeam.transfers.made;
        const usedPlayerInIds = new Set<number>(); // Track players already recommended as upgrades

        // Evaluate each player in the team
        for (const pick of this.myTeam.picks) {
            const player = this.bootstrap.elements.find(e => e.id === pick.element);
            if (!player) continue;

            const playerForm = parseFloat(player.form) || 0;
            const playerPrice = player.now_cost / 10;
            const maxCost = player.now_cost + this.myTeam.transfers.bank;

            // Find best replacement (excluding already recommended players)
            const candidates = this.bootstrap.elements
                .filter(e => e.element_type === player.element_type)
                .filter(e => e.now_cost <= maxCost)
                .filter(e => !teamIds.has(e.id))
                .filter(e => !usedPlayerInIds.has(e.id)) // Exclude already recommended players
                .filter(e => e.status === 'a')
                .map(candidate => {
                    const form = parseFloat(candidate.form) || 0;
                    const formDiff = form - playerForm;
                    
                    // Get next 3 fixtures for comparison
                    const nextFixtures = this.fixtures
                        .filter(f => (f.team_h === candidate.team || f.team_a === candidate.team) && 
                                f.event > this.currentEvent && !f.finished)
                        .sort((a, b) => a.event - b.event)
                        .slice(0, 3);
                    
                    const playerNextFixtures = this.fixtures
                        .filter(f => (f.team_h === player.team || f.team_a === player.team) && 
                                f.event > this.currentEvent && !f.finished)
                        .sort((a, b) => a.event - b.event)
                        .slice(0, 3);

                    // Calculate fixture improvement (average FDR difference)
                    let fixtureImprovement = 0;
                    if (nextFixtures.length > 0 && playerNextFixtures.length > 0) {
                        const candidateAvgFDR = nextFixtures.reduce((sum, f) => {
                            const isHome = f.team_h === candidate.team;
                            return sum + (isHome ? f.team_h_difficulty : f.team_a_difficulty);
                        }, 0) / nextFixtures.length;
                        
                        const playerAvgFDR = playerNextFixtures.reduce((sum, f) => {
                            const isHome = f.team_h === player.team;
                            return sum + (isHome ? f.team_h_difficulty : f.team_a_difficulty);
                        }, 0) / playerNextFixtures.length;
                        
                        fixtureImprovement = playerAvgFDR - candidateAvgFDR; // Lower FDR = better
                    }

                    // Value improvement (points per million)
                    const candidatePrice = candidate.now_cost / 10;
                    const candidateValue = (candidate.total_points / candidatePrice) || 0;
                    const playerValue = (player.total_points / playerPrice) || 0;
                    const valueImprovement = candidateValue - playerValue;

                    // Short-term upside (next 3 GWs): Form (60%) + Fixtures (40%)
                    const shortTermUpside = (formDiff * 0.6) + (fixtureImprovement * 2 * 0.4);
                    
                    // Long-term upside (season): Form (70%) + Value (30%)
                    const longTermUpside = (formDiff * 0.7) + (valueImprovement * 0.3);

                    return {
                        candidate,
                        formDiff,
                        fixtureImprovement,
                        valueImprovement,
                        shortTermUpside,
                        longTermUpside
                    };
                })
                .sort((a, b) => {
                    // Sort by combined upside (long-term weighted 60%, short-term 40%)
                    // Use stable sort with player ID as tiebreaker for deterministic results
                    const aTotal = (a.longTermUpside * 0.6) + (a.shortTermUpside * 0.4);
                    const bTotal = (b.longTermUpside * 0.6) + (b.shortTermUpside * 0.4);
                    if (Math.abs(aTotal - bTotal) < 0.01) {
                        // Tiebreaker: use player ID for deterministic sorting
                        return a.candidate.id - b.candidate.id;
                    }
                    return bTotal - aTotal;
                });

            const bestCandidate = candidates[0];
            if (bestCandidate && (bestCandidate.formDiff > 1.0 || bestCandidate.fixtureImprovement > 0.5)) {
                const totalUpside = (bestCandidate.longTermUpside * 0.6) + (bestCandidate.shortTermUpside * 0.4);

                const reasonParts = [
                    `Form: ${playerForm.toFixed(1)} → ${parseFloat(bestCandidate.candidate.form).toFixed(1)} (+${bestCandidate.formDiff.toFixed(1)})`
                ];
                if (bestCandidate.fixtureImprovement > 0) {
                    reasonParts.push(`Better fixtures: ${bestCandidate.fixtureImprovement.toFixed(1)} FDR improvement`);
                }
                if (bestCandidate.valueImprovement > 0) {
                    reasonParts.push(`Better value: +${bestCandidate.valueImprovement.toFixed(1)} pts/£m`);
                }

                rankings.push({
                    playerOut: player,
                    playerIn: bestCandidate.candidate,
                    rank: 0, // Will be set after sorting
                    shortTermUpside: bestCandidate.shortTermUpside,
                    longTermUpside: bestCandidate.longTermUpside,
                    formImprovement: bestCandidate.formDiff,
                    fixtureImprovement: bestCandidate.fixtureImprovement,
                    valueImprovement: bestCandidate.valueImprovement,
                    reason: reasonParts.join('. '),
                    executeThisGW: false, // Will be set after sorting based on available FTs
                    reasonToExecute: '' // Will be set after sorting
                });
                
                // Mark this player as used to avoid duplicate recommendations
                usedPlayerInIds.add(bestCandidate.candidate.id);
            }
        }

        // Sort by total upside and assign ranks
        // Use stable sort with player ID as tiebreaker for deterministic results
        rankings.sort((a, b) => {
            const aTotal = (a.longTermUpside * 0.6) + (a.shortTermUpside * 0.4);
            const bTotal = (b.longTermUpside * 0.6) + (b.shortTermUpside * 0.4);
            if (Math.abs(aTotal - bTotal) < 0.01) {
                // Tiebreaker: use player ID for deterministic sorting
                return a.playerOut.id - b.playerOut.id;
            }
            return bTotal - aTotal;
        });

        rankings.forEach((r, idx) => {
            r.rank = idx + 1;
        });

        // Now determine which transfers to execute this GW based on available FTs
        // Only mark top N transfers (where N = availableFTs) as "Execute This GW"
        // Consider hit costs: only recommend hits if upside > hit cost
        let executedCount = 0;
        for (let i = 0; i < rankings.length; i++) {
            const transfer = rankings[i];
            const transferIndex = i + 1; // 1-indexed
            const totalUpside = (transfer.longTermUpside * 0.6) + (transfer.shortTermUpside * 0.4);
            
            if (executedCount < availableFTs) {
                // Within free transfers - execute
                transfer.executeThisGW = true;
                executedCount++;
                transfer.reasonToExecute = `Execute with free transfer. High upside (${totalUpside.toFixed(1)}). Form + fixture combo.`;
            } else if (executedCount === availableFTs) {
                // First transfer requiring a hit - only if upside justifies -4 hit
                const netGain = totalUpside - 4; // Subtract hit cost
                if (netGain > 2) { // Only if net gain > 2 points
                    transfer.executeThisGW = true;
                    executedCount++;
                    transfer.reasonToExecute = `Consider taking -4 hit. Net gain: ${netGain.toFixed(1)} points (${totalUpside.toFixed(1)} upside - 4 hit). High upside justifies the cost.`;
                } else {
                    transfer.executeThisGW = false;
                    transfer.reasonToExecute = `Wait for next GW. Upside (${totalUpside.toFixed(1)}) doesn't justify -4 hit cost. Net gain would be ${netGain.toFixed(1)}.`;
                }
            } else {
                // Beyond first hit - only recommend if exceptional upside
                const hitCost = (executedCount - availableFTs + 1) * 4; // -4, -8, -12, etc.
                const netGain = totalUpside - hitCost;
                if (netGain > 4 && totalUpside > 8) { // Exceptional upside required
                    transfer.executeThisGW = true;
                    executedCount++;
                    transfer.reasonToExecute = `Exceptional upside (${totalUpside.toFixed(1)}) may justify -${hitCost} hit. Net gain: ${netGain.toFixed(1)}. Use with caution.`;
                } else {
                    transfer.executeThisGW = false;
                    transfer.reasonToExecute = `Wait for next GW. Upside (${totalUpside.toFixed(1)}) doesn't justify -${hitCost} hit. Net gain: ${netGain.toFixed(1)}.`;
                }
            }
        }

        return rankings;
    }

    /**
     * Get optimal lineup after applying recommended transfers
     * Returns best 11 with captain and vice-captain recommendations
     * @param transfersToApply - Transfers to apply before calculating lineup
     * @param captainRecommendation - Optional captain recommendation to use (for consistency)
     */
    getOptimalLineup(
        transfersToApply: PlayerUpgradeRanking[],
        captainRecommendation?: CaptainRecommendation | null
    ): {
        lineup: Array<{ player: FPLElement; position: number; isCaptain: boolean; isViceCaptain: boolean }>;
        captain: FPLElement;
        viceCaptain: FPLElement;
    } | null {
        // Create a map of transfers: playerOut.id -> playerIn
        const transferMap = new Map<number, FPLElement>();
        transfersToApply.forEach(t => {
            if (t.executeThisGW) {
                transferMap.set(t.playerOut.id, t.playerIn);
            }
        });

        // Apply transfers to team
        const updatedPicks = this.myTeam.picks.map(pick => {
            const transfer = transferMap.get(pick.element);
            if (transfer) {
                return { ...pick, element: transfer.id };
            }
            return pick;
        });

        // Get all players in updated team
        const teamPlayers = updatedPicks.map(pick => {
            const player = this.bootstrap.elements.find(e => e.id === pick.element);
            return player ? { player, position: pick.position } : null;
        }).filter((p): p is { player: FPLElement; position: number } => p !== null);

        // Separate by position
        const goalkeepers = teamPlayers.filter(p => p.player.element_type === 1);
        const defenders = teamPlayers.filter(p => p.player.element_type === 2);
        const midfielders = teamPlayers.filter(p => p.player.element_type === 3);
        const forwards = teamPlayers.filter(p => p.player.element_type === 4);

        // Select best 11: 1 GKP, 3-5 DEF, 3-5 MID, 1-3 FWD
        // Use form + expected points to rank players
        const scorePlayer = (player: FPLElement): number => {
            const form = parseFloat(player.form) || 0;
            const epNext = parseFloat(String(player.ep_next ?? '0')) || 0;
            const nextFixture = this.getNextFixture(player.team);
            let fixtureBonus = 0;
            if (nextFixture) {
                const isHome = this.isHomeFixture(nextFixture, player.team);
                const difficulty = isHome ? nextFixture.team_h_difficulty : nextFixture.team_a_difficulty;
                fixtureBonus = (6 - difficulty) * 0.5; // Lower FDR = better
            }
            return form * 2 + epNext + fixtureBonus;
        };

        // Sort by score with deterministic tiebreaker
        goalkeepers.sort((a, b) => {
            const scoreA = scorePlayer(a.player);
            const scoreB = scorePlayer(b.player);
            if (Math.abs(scoreB - scoreA) < 0.01) {
                return a.player.id - b.player.id; // Deterministic tiebreaker
            }
            return scoreB - scoreA;
        });
        defenders.sort((a, b) => {
            const scoreA = scorePlayer(a.player);
            const scoreB = scorePlayer(b.player);
            if (Math.abs(scoreB - scoreA) < 0.01) {
                return a.player.id - b.player.id; // Deterministic tiebreaker
            }
            return scoreB - scoreA;
        });
        midfielders.sort((a, b) => {
            const scoreA = scorePlayer(a.player);
            const scoreB = scorePlayer(b.player);
            if (Math.abs(scoreB - scoreA) < 0.01) {
                return a.player.id - b.player.id; // Deterministic tiebreaker
            }
            return scoreB - scoreA;
        });
        forwards.sort((a, b) => {
            const scoreA = scorePlayer(a.player);
            const scoreB = scorePlayer(b.player);
            if (Math.abs(scoreB - scoreA) < 0.01) {
                return a.player.id - b.player.id; // Deterministic tiebreaker
            }
            return scoreB - scoreA;
        });

        // Build lineup: Ensure we have at least 1 forward, then balance the rest
        // Standard formations: 1 GKP, 3-5 DEF, 3-5 MID, 1-3 FWD
        const lineup: Array<{ player: FPLElement; position: number; isCaptain: boolean; isViceCaptain: boolean }> = [];
        
        // Add goalkeeper
        if (goalkeepers.length > 0) {
            lineup.push({ player: goalkeepers[0].player, position: 1, isCaptain: false, isViceCaptain: false });
        }

        // Ensure we have at least 1 forward
        const minForwards = Math.max(1, Math.min(3, forwards.length));
        const remainingSlots = 11 - 1 - minForwards; // 11 total - 1 GKP - min forwards
        
        // Distribute remaining slots between DEF and MID (prefer balanced)
        // Try to maintain at least 3 of each
        const minDef = Math.max(3, Math.min(5, defenders.length));
        const minMid = Math.max(3, Math.min(5, midfielders.length));
        
        let defCount = minDef;
        let midCount = minMid;
        
        // If we don't have enough slots, reduce from the position with more players
        if (defCount + midCount > remainingSlots) {
            if (defenders.length >= midfielders.length) {
                defCount = Math.max(3, remainingSlots - midCount);
                midCount = remainingSlots - defCount;
            } else {
                midCount = Math.max(3, remainingSlots - defCount);
                defCount = remainingSlots - midCount;
            }
        } else {
            // We have extra slots, distribute them
            const extra = remainingSlots - defCount - midCount;
            if (extra > 0) {
                // Prefer adding to the position with more available players
                if (defenders.length > defCount && defenders.length >= midfielders.length) {
                    defCount = Math.min(5, defCount + extra);
                } else if (midfielders.length > midCount) {
                    midCount = Math.min(5, midCount + extra);
                } else {
                    defCount = Math.min(5, defCount + extra);
                }
            }
        }

        // Add defenders
        for (let i = 0; i < defCount && i < defenders.length; i++) {
            lineup.push({ player: defenders[i].player, position: 1 + i + 1, isCaptain: false, isViceCaptain: false });
        }

        // Add midfielders
        for (let i = 0; i < midCount && i < midfielders.length; i++) {
            lineup.push({ player: midfielders[i].player, position: 1 + defCount + i + 1, isCaptain: false, isViceCaptain: false });
        }

        // Add forwards (at least 1, up to 3)
        for (let i = 0; i < minForwards && i < forwards.length; i++) {
            lineup.push({ player: forwards[i].player, position: 1 + defCount + midCount + i + 1, isCaptain: false, isViceCaptain: false });
        }

        // Ensure we have exactly 11 players
        if (lineup.length < 11) {
            // Fill remaining spots from bench (any position)
            const bench = teamPlayers.filter(p => !lineup.find(l => l.player.id === p.player.id));
            bench.sort((a, b) => {
                const scoreA = scorePlayer(a.player);
                const scoreB = scorePlayer(b.player);
                if (Math.abs(scoreB - scoreA) < 0.01) {
                    return a.player.id - b.player.id; // Deterministic tiebreaker
                }
                return scoreB - scoreA;
            });
            for (let i = lineup.length; i < 11 && i < lineup.length + bench.length; i++) {
                lineup.push({ player: bench[i - lineup.length].player, position: i + 1, isCaptain: false, isViceCaptain: false });
            }
        }

        // Select captain and vice-captain from starting 11
        const starting11 = lineup.slice(0, 11);
        
        let captain: FPLElement | null = null;
        let viceCaptain: FPLElement | null = null;

        // Use provided captain recommendation if available, otherwise calculate
        if (captainRecommendation) {
            // Find captain in lineup
            captain = starting11.find(p => p.player.id === captainRecommendation.player.id)?.player || null;
            
            // If captain not in lineup, use best player from lineup
            if (!captain) {
                starting11.sort((a, b) => {
                    const scoreA = scorePlayer(a.player);
                    const scoreB = scorePlayer(b.player);
                    if (Math.abs(scoreB - scoreA) < 0.01) {
                        return a.player.id - b.player.id; // Deterministic tiebreaker
                    }
                    return scoreB - scoreA;
                });
                captain = starting11[0].player;
            }

            // Find vice-captain (second best option, excluding captain)
            if (captain) {
                const captainPlayer = captain;
                const viceCandidates = starting11
                    .filter(p => p.player.id !== captainPlayer.id)
                    .sort((a, b) => {
                        const scoreA = scorePlayer(a.player);
                        const scoreB = scorePlayer(b.player);
                        if (Math.abs(scoreB - scoreA) < 0.01) {
                            return a.player.id - b.player.id; // Deterministic tiebreaker
                        }
                        return scoreB - scoreA;
                    });
                viceCaptain = viceCandidates.length > 0 ? viceCandidates[0].player : starting11[1]?.player || null;
            }
        } else {
            // Fallback: use highest scoring players with deterministic sorting
            starting11.sort((a, b) => {
                const scoreA = scorePlayer(a.player);
                const scoreB = scorePlayer(b.player);
                if (Math.abs(scoreB - scoreA) < 0.01) {
                    return a.player.id - b.player.id; // Deterministic tiebreaker
                }
                return scoreB - scoreA;
            });
            captain = starting11[0].player;
            viceCaptain = starting11[1]?.player || null;
        }

        // Update lineup with captain/VC flags
        const finalLineup = starting11.map(p => ({
            ...p,
            isCaptain: captain !== null && p.player.id === captain.id,
            isViceCaptain: viceCaptain !== null && p.player.id === viceCaptain.id
        }));

        if (!captain || !viceCaptain) return null;

        return {
            lineup: finalLineup,
            captain,
            viceCaptain
        };
    }
}
