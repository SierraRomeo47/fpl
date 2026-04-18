'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';

// Use our proxy API instead of direct FPL calls
const PROXY_BASE_URL = '/api/fpl';

async function fetchViaProxy(endpoint: string) {
    const res = await fetch(`${PROXY_BASE_URL}${endpoint}`, {
        credentials: 'include'
    });

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
export function useMyTeam(enabled: boolean = true) {
    const pathname = usePathname();
    // Don't run on login page
    const shouldEnable = enabled && pathname !== '/login';
    
    return useQuery({
        queryKey: ['my-team'],
        queryFn: async () => {
            const res = await fetch('/api/my-team', {
                credentials: 'include'
            });
            if (!res.ok) {
                // Don't throw error for 401 - just return null
                if (res.status === 401) {
                    return null;
                }
                throw new Error(`API Error: ${res.status}`);
            }
            return res.json();
        },
        enabled: shouldEnable,
        retry: (failureCount, error: any) => {
            // Don't retry on 401 errors
            if (error?.message?.includes('401') || error?.status === 401) {
                return false;
            }
            return failureCount < 1;
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
export function useEventPicks(
    entryId?: number,
    eventId?: number,
    options?: { refetchInterval?: number | false }
) {
    return useQuery({
        queryKey: ['event-picks', entryId, eventId],
        queryFn: () => fetchViaProxy(`/entry/${entryId}/event/${eventId}/picks`),
        enabled: !!entryId && !!eventId,
        refetchInterval: options?.refetchInterval ?? false,
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
export function useFPLData(entryId?: number, currentEvent?: number, enableMyTeam: boolean = true) {
    const bootstrap = useBootstrapStatic();
    const entry = useEntry(entryId);
    const myTeam = useMyTeam(enableMyTeam && !!entryId);
    const history = useHistory(entryId);
    const picksRefetchInterval = useMemo(() => {
        const ev = bootstrap.data?.events?.find((e: { id: number; is_current?: boolean }) => e.id === currentEvent);
        if (ev?.is_current) return 45_000;
        return false;
    }, [bootstrap.data, currentEvent]);
    const picks = useEventPicks(entryId, currentEvent, { refetchInterval: picksRefetchInterval });
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
