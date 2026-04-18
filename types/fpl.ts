
export interface FPLElement {
    id: number;
    web_name: string;
    element_type: number; // 1=GKP, 2=DEF, 3=MID, 4=FWD
    team: number;
    now_cost: number;
    total_points: number;
    form: string;
    points_per_game: string;
    selected_by_percent: string;
    news: string;
    status: string;
    /** Expected points next GW (bootstrap field name varies; API uses ep_next) */
    ep_next?: string | number;
}

export interface FPLTeam {
    id: number;
    name: string;
    short_name: string;
    strength: number;
}

export interface FPLEvent {
    id: number;
    name: string;
    deadline_time: string;
    is_current: boolean;
    is_next: boolean;
    is_previous: boolean;
    finished: boolean;
}

export interface FPLBootstrapStatic {
    events: FPLEvent[];
    elements: FPLElement[];
    teams: FPLTeam[];
}

export interface FPLPick {
    element: number;
    position: number;
    multiplier: number;
    is_captain: boolean;
    is_vice_captain: boolean;
}

export interface FPLMyTeam {
    picks: FPLPick[];
    chips: any[];
    transfers: { cost: number; limit: number; made: number; bank: number; value: number };
}

export interface FPLHistoryCurrent {
    event: number;
    points: number;
    total_points: number;
    rank: number;
    rank_sort: number;
    overall_rank: number;
    bank: number;
    value: number;
    event_transfers: number;
    event_transfers_cost: number;
    points_on_bench: number;
}

export interface FPLHistory {
    current: FPLHistoryCurrent[];
    past: any[];
    chips: any[];
}

export interface FPLFixture {
    id: number;
    event: number;
    team_h: number;
    team_a: number;
    team_h_difficulty: number;
    team_a_difficulty: number;
    finished: boolean;
    team_h_score?: number | null;
    team_a_score?: number | null;
}

export interface ChipRecommendation {
    chip: 'wildcard' | 'freehit' | 'bench_boost' | 'triple_captain';
    gameweek: number;
    reason: string;
    priority: 'high' | 'medium' | 'low';
    blankGWs?: number[];
    doubleGWs?: number[];
}

export interface PlayerUpgradeRanking {
    playerOut: FPLElement;
    playerIn: FPLElement;
    rank: number;
    shortTermUpside: number;
    longTermUpside: number;
    formImprovement: number;
    fixtureImprovement: number;
    valueImprovement: number;
    reason: string;
    executeThisGW: boolean;
    reasonToExecute: string;
}

export interface ChipStrategy {
    recommendations: ChipRecommendation[];
    remainingChips: string[];
    blankGameweeks: number[];
    doubleGameweeks: number[];
}

export interface TeamStructureAnalysis {
    structure: 'stars-scrubs' | 'balanced' | 'mid-heavy';
    premiumCount: number;
    midPriceCount: number;
    budgetCount: number;
    recommendation: string;
    score: number;
}