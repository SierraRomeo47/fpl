'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { usePathname } from 'next/navigation';

import { ThemeProvider } from 'next-themes';

export default function Providers({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 5 * 60 * 1000, // 5 minutes
                gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
                refetchOnWindowFocus: false,
                retry: (failureCount, error: any) => {
                    // Don't retry on 401/403 errors (authentication issues)
                    if (error?.status === 401 || error?.status === 403 || error?.message?.includes('401') || error?.message?.includes('403')) {
                        return false;
                    }
                    return failureCount < 1;
                },
            },
        },
    }));

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeRoot>{children}</ThemeRoot>
        </QueryClientProvider>
    );
}

/** Light-only on /login; elsewhere respects saved light/dark (default light, no system). */
function ThemeRoot({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const forceLightLogin = pathname === '/login';

    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            forcedTheme={forceLightLogin ? 'light' : undefined}
        >
            {children}
        </ThemeProvider>
    );
}
