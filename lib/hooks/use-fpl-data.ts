'use client';

import { useQuery } from '@tanstack/react-query';

// Use our proxy API instead of direct FPL calls
const PROXY_BASE_URL = '/api/fpl';

async function fetchViaProxy(endpoint: string) {
    const res = await fetch(`${PROXY_BASE_URL}${endpoint}`);

    if (!res.ok) {
        throw new Error(`API Error: ${res.status}`);
    }

    return res.json();
}

// Hook: Get bootstrap-static (game data, players, teams)
export function useBootstrapStatic() {
    return useQuery({
        queryKey: ['bootstrap-static'],
        queryFn: () => fetchViaProxy('/bootstrap-static'),
    });
}

// Hook: Get entry general info
export function useEntry(entryId?: number) {
    return useQuery({
        queryKey: ['entry', entryId],
        queryFn: () => fetchViaProxy(`/entry/${entryId}`),
        enabled: !!entryId,
    });
}

// Hook: Get my-team (includes transfers data)
// Uses authenticated server-side route
export function useMyTeam() {
    return useQuery({
        queryKey: ['my-team'],
        queryFn: async () => {
            const res = await fetch('/api/my-team');
            if (!res.ok) {
                throw new Error(`API Error: ${res.status}`);
            }
            return res.json();
        },
    });
}

// Hook: Get entry history
export function useHistory(entryId?: number) {
    return useQuery({
        queryKey: ['history', entryId],
        queryFn: () => fetchViaProxy(`/entry/${entryId}/history`),
        enabled: !!entryId,
    });
}

// Hook: Get entry picks for specific gameweek
export function useEventPicks(entryId?: number, eventId?: number) {
    return useQuery({
        queryKey: ['event-picks', entryId, eventId],
        queryFn: () => fetchViaProxy(`/entry/${entryId}/event/${eventId}/picks`),
        enabled: !!entryId && !!eventId,
    });
}

// Hook: Get fixtures
export function useFixtures() {
    return useQuery({
        queryKey: ['fixtures'],
        queryFn: () => fetchViaProxy('/fixtures'),
    });
}

// Combined hook for dashboard
export function useFPLData(entryId?: number, currentEvent?: number) {
    const bootstrap = useBootstrapStatic();
    const entry = useEntry(entryId);
    const myTeam = useMyTeam();
    const history = useHistory(entryId);
    const picks = useEventPicks(entryId, currentEvent);
    const fixtures = useFixtures();

    return {
        bootstrap: bootstrap.data,
        entry: entry.data,
        myTeam: myTeam.data,
        history: history.data,
        picks: picks.data,
        fixtures: fixtures.data,
        isLoading: bootstrap.isLoading || entry.isLoading || myTeam.isLoading || history.isLoading || picks.isLoading || fixtures.isLoading,
        error: bootstrap.error || entry.error || myTeam.error || history.error || picks.error || fixtures.error,
    };
}
