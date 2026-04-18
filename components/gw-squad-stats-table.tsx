'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    baseGwPointsFromLiveRow,
    formatActiveChipLabel,
    formatStatCellCount,
    gwStatsForLiveElement,
    POS_SHORT,
    type LiveElementRow,
    type PlayerProfile,
} from '@/lib/live-match-utils';
import { Sparkles } from 'lucide-react';

export type FplPick = {
    element: number;
    position: number;
    multiplier: number;
    is_captain: boolean;
    is_vice_captain: boolean;
};

type GwSquadStatsTableProps = {
    picks: FplPick[];
    liveMap: Map<number, LiveElementRow>;
    playersMap: Map<number, PlayerProfile>;
    teamShort: Map<number, string>;
    /** From `GET .../entry/{id}/event/{gw}/picks/` → `active_chip`. Omit to hide the chip row. */
    activeChip?: string | null;
};

/** GW squad breakdown: FPL points (with captain mult) + explain stats — same columns as Live Match Center rival view. */
export function GwSquadStatsTable({
    picks,
    liveMap,
    playersMap,
    teamShort,
    activeChip,
}: GwSquadStatsTableProps) {
    const sorted = [...picks].sort((a, b) => a.position - b.position);
    const chipLabel = formatActiveChipLabel(activeChip ?? null);
    const showChipRow = activeChip !== undefined;

    return (
        <div className="w-full min-w-0 max-w-full space-y-2">
            {showChipRow &&
                (chipLabel ? (
                    <div className="flex flex-wrap items-center gap-2 px-0.5">
                        <Badge
                            variant="secondary"
                            className="gap-1 border border-primary/25 bg-primary/10 font-semibold text-primary"
                        >
                            <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
                            Chip: {chipLabel}
                        </Badge>
                    </div>
                ) : (
                    <p className="px-0.5 text-[11px] text-muted-foreground">No chip played this gameweek.</p>
                ))}

            {/* Full squad height (15 rows) — no max-height. Horizontal scroll only when the table is wider than the card. */}
            <div className="w-full min-w-0 max-w-full overflow-x-auto rounded-md border border-border bg-card">
                <table className="w-full min-w-[720px] table-fixed border-collapse text-[11px] md:text-xs">
                        <colgroup>
                            <col className="w-[3.25rem]" />
                            <col className="w-[17%] min-w-[7rem]" />
                            <col className="w-[3.25rem]" />
                            <col className="w-[2.75rem]" />
                            <col className="w-[2.75rem]" />
                            <col className="w-[2.25rem]" />
                            <col className="w-[2.25rem]" />
                            <col className="w-[2.25rem]" />
                            <col className="w-[2.25rem]" />
                            <col className="w-[2.25rem]" />
                            <col className="w-[2.25rem]" />
                            <col className="w-[2.25rem]" />
                            <col className="w-[2.25rem]" />
                            <col className="w-[2.25rem]" />
                            <col className="w-[2.5rem]" />
                            <col className="w-[2.5rem]" />
                        </colgroup>
                        <thead className="sticky top-0 z-[1] border-b border-border bg-muted/80 backdrop-blur-sm">
                            <tr className="text-left text-muted-foreground">
                                <th className="px-1.5 py-1.5 font-semibold tabular-nums">Pts</th>
                                <th className="px-1.5 py-1.5 font-semibold">Player</th>
                                <th className="px-1 py-1.5 text-center font-semibold">Team</th>
                                <th className="px-1 py-1.5 text-center font-semibold">Pos</th>
                                <th className="px-1 py-1.5 text-center font-semibold" title="Minutes">
                                    Min
                                </th>
                                <th className="px-1 py-1.5 text-center font-semibold" title="Goals">
                                    G
                                </th>
                                <th className="px-1 py-1.5 text-center font-semibold" title="Assists">
                                    A
                                </th>
                                <th className="px-1 py-1.5 text-center font-semibold" title="Clean sheet">
                                    CS
                                </th>
                                <th className="px-1 py-1.5 text-center font-semibold" title="Goals conceded">
                                    GC
                                </th>
                                <th className="px-1 py-1.5 text-center font-semibold" title="Saves">
                                    Sv
                                </th>
                                <th className="px-1 py-1.5 text-center font-semibold" title="C/B/I">
                                    CBI
                                </th>
                                <th className="px-1 py-1.5 text-center font-semibold" title="Yellow cards">
                                    YC
                                </th>
                                <th className="px-1 py-1.5 text-center font-semibold" title="Red cards">
                                    RC
                                </th>
                                <th className="px-1 py-1.5 text-center font-semibold" title="BPS">
                                    BPS
                                </th>
                                <th className="px-1 py-1.5 text-center font-semibold" title="Bonus">
                                    Bon
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map((pick) => {
                                const profile = playersMap.get(pick.element);
                                const liveRow = liveMap.get(pick.element);
                                const base = baseGwPointsFromLiveRow(liveRow);
                                const mult = pick.multiplier || 1;
                                const effective = Math.round(base * mult);
                                const stats = gwStatsForLiveElement(liveRow);
                                const teamCode = profile ? (teamShort.get(profile.team) ?? '?') : '?';
                                const bench = pick.position > 11;

                                return (
                                    <tr
                                        key={`${pick.element}-${pick.position}`}
                                        className={cn(
                                            'border-b border-border/50 hover:bg-muted/30',
                                            bench && 'bg-muted/15'
                                        )}
                                    >
                                        <td
                                            className={cn(
                                                'px-1.5 py-1 align-middle font-mono tabular-nums',
                                                effective < 0 && 'text-rose-600',
                                                effective > 0 && 'font-semibold text-foreground'
                                            )}
                                        >
                                            {effective > 0 ? `+${effective}` : `${effective}`}
                                        </td>
                                        <td className="max-w-0 truncate px-1.5 py-1 align-middle">
                                            <span className="font-medium text-foreground">
                                                {profile?.web_name ?? `#${pick.element}`}
                                            </span>
                                            {pick.is_captain && (
                                                <span className="ml-1 text-[10px] font-bold text-primary">
                                                    {' '}
                                                    (C)
                                                </span>
                                            )}
                                            {pick.is_vice_captain && !pick.is_captain && (
                                                <span className="ml-1 text-[10px] font-semibold text-muted-foreground">
                                                    {' '}
                                                    (V)
                                                </span>
                                            )}
                                            {bench && (
                                                <span className="ml-1 text-[10px] text-muted-foreground">
                                                    bench
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-1 py-1 text-center align-middle font-mono text-muted-foreground">
                                            {teamCode}
                                        </td>
                                        <td className="px-1 py-1 text-center align-middle text-muted-foreground">
                                            {profile ? (POS_SHORT[profile.element_type] ?? '?') : '?'}
                                        </td>
                                        <td className="px-1 py-1 text-center align-middle tabular-nums text-muted-foreground">
                                            {formatStatCellCount(stats.minutes)}
                                        </td>
                                        <td className="px-1 py-1 text-center align-middle tabular-nums">
                                            {formatStatCellCount(stats.goals)}
                                        </td>
                                        <td className="px-1 py-1 text-center align-middle tabular-nums">
                                            {formatStatCellCount(stats.assists)}
                                        </td>
                                        <td className="px-1 py-1 text-center align-middle tabular-nums">
                                            {formatStatCellCount(stats.cleanSheets)}
                                        </td>
                                        <td className="px-1 py-1 text-center align-middle tabular-nums">
                                            {formatStatCellCount(stats.goalsConceded)}
                                        </td>
                                        <td className="px-1 py-1 text-center align-middle tabular-nums">
                                            {formatStatCellCount(stats.saves)}
                                        </td>
                                        <td className="px-1 py-1 text-center align-middle tabular-nums">
                                            {formatStatCellCount(stats.clearancesBlocksInterceptions)}
                                        </td>
                                        <td className="px-1 py-1 text-center align-middle tabular-nums">
                                            {formatStatCellCount(stats.yellowCards)}
                                        </td>
                                        <td className="px-1 py-1 text-center align-middle tabular-nums">
                                            {formatStatCellCount(stats.redCards)}
                                        </td>
                                        <td className="px-1 py-1 text-center align-middle tabular-nums">
                                            {formatStatCellCount(stats.bps)}
                                        </td>
                                        <td className="px-1 py-1 text-center align-middle tabular-nums">
                                            {formatStatCellCount(stats.bonus)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
            </div>
        </div>
    );
}
