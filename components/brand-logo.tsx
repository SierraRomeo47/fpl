'use client';

import { cn } from '@/lib/utils';
import { useId } from 'react';

/** Mark sizes — editorial hero stays within common web header guidance (~24–100px mark height). */
const sizeMap = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-14 w-14',
    /** Landing / split-panel: primary brand identification, not nav-badge scale */
    hero: 'h-[4.25rem] w-[4.25rem] sm:h-[4.5rem] sm:w-[4.5rem]',
} as const;

const fplTextSize = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
    hero: 'text-3xl sm:text-4xl',
} as const;

const dndTextSize = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl',
    hero: 'text-2xl sm:text-3xl',
} as const;

/**
 * Custom mark: bird’s-eye pitch + live trend line (data / matchday signal).
 */
function BrandMark({ className }: { className?: string }) {
    const uid = useId();
    const gradId = `brand-grad-${uid.replace(/:/g, '')}`;

    return (
        <svg
            className={cn('shrink-0', className)}
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
        >
            <defs>
                <linearGradient id={gradId} x1="6" y1="4" x2="44" y2="46" gradientUnits="userSpaceOnUse">
                    <stop stopColor="hsl(25, 98%, 56%)" />
                    <stop offset="1" stopColor="hsl(16, 82%, 42%)" />
                </linearGradient>
            </defs>
            <rect width="48" height="48" rx="14" fill={`url(#${gradId})`} />
            <path
                d="M 11 13.5 L 17.5 10 L 24 12 L 30.5 8 L 37 11"
                stroke="white"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.98"
            />
            <rect
                x="10"
                y="18.5"
                width="28"
                height="15"
                rx="2.5"
                stroke="white"
                strokeWidth="1.65"
                fill="none"
                opacity="0.95"
            />
            <line x1="24" y1="18.5" x2="24" y2="33.5" stroke="white" strokeWidth="1.4" opacity="0.75" />
            <circle cx="24" cy="26" r="3.8" stroke="white" strokeWidth="1.2" fill="none" opacity="0.88" />
            <path
                d="M 10 22 v -2.5 M 38 22 v -2.5 M 10 30 v 2.5 M 38 30 v 2.5"
                stroke="white"
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity="0.55"
            />
        </svg>
    );
}

type BrandLogoProps = {
    variant?: 'full' | 'mark';
    size?: keyof typeof sizeMap;
    className?: string;
    /** Editorial subline — e.g. login hero */
    showTagline?: boolean;
    /**
     * `editorial`: wordmark tuned for tinted panels (login left column) — stronger contrast hierarchy.
     * `default`: standard surfaces (sidebar, header).
     */
    tone?: 'default' | 'editorial';
};

export function BrandLogo({
    variant = 'full',
    size = 'md',
    className,
    showTagline = false,
    tone = 'default',
}: BrandLogoProps) {
    const markSize = sizeMap[size];
    const isHero = size === 'hero';
    const editorial = tone === 'editorial';

    if (variant === 'mark') {
        return <BrandMark className={markSize} />;
    }

    const dndColor = editorial ? 'text-on-surface' : 'text-foreground';
    const taglineColor = editorial ? 'text-on-surface-variant' : 'text-muted-foreground';

    return (
        <div
            className={cn(
                'flex items-center',
                isHero ? 'gap-4 sm:gap-5' : 'gap-2.5 sm:gap-3',
                className
            )}
        >
            <span
                className={cn(
                    'shrink-0 rounded-[14px]',
                    isHero &&
                        'shadow-[0_12px_40px_-12px_hsl(25_95%_53%/0.45)] ring-1 ring-black/[0.06] dark:ring-white/10'
                )}
            >
                <BrandMark className={markSize} />
            </span>
            <div className="flex min-w-0 flex-col leading-none">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span
                        className={cn(
                            'font-headline font-black tracking-tight',
                            fplTextSize[size],
                            'bg-gradient-to-br from-primary via-primary to-[hsl(18,82%,44%)] bg-clip-text text-transparent'
                        )}
                    >
                        FPL
                    </span>
                    <span
                        className={cn(
                            'font-headline font-extrabold tracking-[0.12em]',
                            dndTextSize[size],
                            dndColor
                        )}
                    >
                        DnD
                    </span>
                </div>
                {showTagline && (
                    <span
                        className={cn(
                            'font-semibold uppercase',
                            isHero
                                ? 'mt-2.5 text-xs tracking-[0.22em] sm:tracking-[0.26em]'
                                : 'mt-1 text-[0.65rem] tracking-[0.2em]',
                            taglineColor
                        )}
                    >
                        Live data · League intel
                    </span>
                )}
            </div>
        </div>
    );
}
