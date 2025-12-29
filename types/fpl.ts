
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
