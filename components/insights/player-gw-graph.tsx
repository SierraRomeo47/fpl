'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, BarChart3 } from 'lucide-react';

interface PlayerGWGraphProps {
    playerId: number;
}

interface GWHistoryPoint {
    event: number;
    total_points: number;
    minutes: number;
    goals_scored: number;
    assists: number;
    clean_sheets: number;
}

export function PlayerGWGraph({ playerId }: PlayerGWGraphProps) {
    const [history, setHistory] = useState<GWHistoryPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!playerId) {
                setLoading(false);
                return;
            }

            try {
                setError(null);
                const response = await fetch(`/api/fpl/element-summary/${playerId}/`);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                console.log('[PlayerGWGraph] API response for player', playerId, ':', {
                    hasHistory: !!data.history,
                    historyLength: data.history?.length || 0,
                    firstHistoryItem: data.history?.[0] || null,
                    sampleKeys: data.history?.[0] ? Object.keys(data.history[0]) : []
                });
                
                // FPL API returns history array directly in element-summary response
                const gwHistory = Array.isArray(data.history) ? data.history : [];
                
                if (gwHistory.length === 0) {
                    console.warn('[PlayerGWGraph] No history data found for player', playerId);
                    setHistory([]);
                    setLoading(false);
                    return;
                }
                
                // Sort by event number to ensure proper order
                const sortedHistory = gwHistory.sort((a: any, b: any) => {
                    const eventA = a.event || a.round || 0;
                    const eventB = b.event || b.round || 0;
                    return eventA - eventB;
                });
                
                console.log('[PlayerGWGraph] Loaded', sortedHistory.length, 'gameweeks');
                console.log('[PlayerGWGraph] Sample data (first 3):', sortedHistory.slice(0, 3).map((h: any) => ({
                    event: h.event || h.round,
                    total_points: h.total_points,
                    points: h.points,
                    minutes: h.minutes
                })));
                
                setHistory(sortedHistory);
            } catch (error: any) {
                console.error('[PlayerGWGraph] Failed to fetch player history:', error);
                setError(error.message || 'Failed to fetch data');
                setHistory([]);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [playerId]);

    if (loading) {
        return (
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-5 h-5 text-caution" />
                    <h4 className="font-bold text-sm text-gray-900">Points Per Gameweek</h4>
                </div>
                <div className="h-48 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-5 h-5 text-caution" />
                    <h4 className="font-bold text-sm text-gray-900">Points Per Gameweek</h4>
                </div>
                <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
                    Error: {error}
                </div>
            </div>
        );
    }

    if (!history || history.length === 0) {
        return (
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-5 h-5 text-caution" />
                    <h4 className="font-bold text-sm text-gray-900">Points Per Gameweek</h4>
                </div>
                <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
                    No history data available
                </div>
            </div>
        );
    }

    // Extract points from history (FPL API uses total_points for points scored in that GW)
    const pointsHistory = history
        .map((h: any) => {
            // FPL API history array uses 'total_points' for points scored in that specific gameweek
            // Also check for 'points' as fallback
            let points: number | null = null;
            if (h.total_points !== undefined && h.total_points !== null) {
                points = Number(h.total_points);
            } else if (h.points !== undefined && h.points !== null) {
                points = Number(h.points);
            }
            
            const event = h.event || h.round || null;
            
            // Only include if we have both event and points (points can be 0, but must be a number)
            if (event === null || event <= 0 || points === null || isNaN(points)) {
                return null;
            }
            
            return {
                event: Number(event),
                points: points
            };
        })
        .filter((h): h is { event: number; points: number } => h !== null); // Filter out null entries

    if (pointsHistory.length === 0) {
        console.warn('[PlayerGWGraph] No valid points history after processing. Raw history:', history);
        return (
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-5 h-5 text-caution" />
                    <h4 className="font-bold text-sm text-gray-900">Points Per Gameweek</h4>
                </div>
                <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
                    No valid gameweek data
                    {history.length > 0 && (
                        <div className="text-xs mt-2 text-muted-foreground">
                            (Found {history.length} entries but couldn't extract points)
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Calculate max points for scaling
    const maxPoints = Math.max(...pointsHistory.map(h => h.points), 1);
    const minPoints = Math.min(...pointsHistory.map(h => h.points), 0);
    const range = maxPoints - minPoints || 1;

    // Graph dimensions - make it larger for better visibility
    const width = 800;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 35, left: 40 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    // Calculate bar positions
    const barWidth = Math.max((graphWidth / pointsHistory.length) * 0.7, 2);
    const barSpacing = (graphWidth / pointsHistory.length) * 0.3;

    // Get color for points (green for high, orange for medium, red for low)
    const getBarColor = (points: number) => {
        if (points >= 8) return '#10b981'; // green-500
        if (points >= 5) return '#f59e0b'; // orange-500
        if (points >= 2) return '#ef4444'; // red-500
        return '#6b7280'; // gray-500
    };

    // Calculate average
    const average = pointsHistory.reduce((sum, h) => sum + h.points, 0) / pointsHistory.length;

    return (
        <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-caution" />
                    <h4 className="font-bold text-sm text-gray-900">Points Per Gameweek</h4>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-600 font-semibold">Avg:</span>
                    <span className="font-black text-gray-900">{average.toFixed(1)}</span>
                </div>
            </div>

            {/* Graph Container */}
            <div className="relative overflow-x-auto">
                <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" className="w-full h-48" style={{ minWidth: `${width}px` }}>
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                        <line
                            key={ratio}
                            x1={padding.left}
                            y1={padding.top + graphHeight * ratio}
                            x2={width - padding.right}
                            y2={padding.top + graphHeight * ratio}
                            stroke="#e5e7eb"
                            strokeWidth="1"
                            strokeDasharray="2,2"
                        />
                    ))}

                    {/* Bars */}
                    {pointsHistory.map((gw, index) => {
                        const points = gw.points;
                        const barHeight = maxPoints > 0 ? (points / maxPoints) * graphHeight : 0;
                        const x = padding.left + index * (barWidth + barSpacing) + barSpacing / 2;
                        const y = padding.top + graphHeight - barHeight;
                        const color = getBarColor(points);

                        return (
                            <g key={`gw-${gw.event}-${index}`}>
                                {/* Bar */}
                                <rect
                                    x={x}
                                    y={y}
                                    width={barWidth}
                                    height={Math.max(barHeight, 0.5)} // Minimum height for visibility
                                    fill={color}
                                    opacity={0.8}
                                    className="hover:opacity-100 transition-opacity cursor-pointer"
                                    rx="2"
                                />
                                {/* Points label on top */}
                                {points > 0 && barHeight > 10 && (
                                    <text
                                        x={x + barWidth / 2}
                                        y={y - 4}
                                        textAnchor="middle"
                                        className="text-[10px] font-bold fill-gray-900"
                                        fontSize="10"
                                    >
                                        {points}
                                    </text>
                                )}
                                {/* GW label at bottom */}
                                <text
                                    x={x + barWidth / 2}
                                    y={height - padding.bottom + 12}
                                    textAnchor="middle"
                                    className="text-[10px] font-semibold fill-gray-700"
                                    fontSize="10"
                                >
                                    {gw.event}
                                </text>
                            </g>
                        );
                    })}

                    {/* Average line */}
                    {average > 0 && (
                        <line
                            x1={padding.left}
                            y1={padding.top + graphHeight - (average / maxPoints) * graphHeight}
                            x2={width - padding.right}
                            y2={padding.top + graphHeight - (average / maxPoints) * graphHeight}
                            stroke="#f59e0b"
                            strokeWidth="2"
                            strokeDasharray="4,3"
                            opacity={0.7}
                        />
                    )}

                    {/* Y-axis labels */}
                    {maxPoints > 0 && (
                        <>
                            <text
                                x={padding.left - 10}
                                y={padding.top + 5}
                                textAnchor="end"
                                className="text-[10px] font-semibold fill-gray-600"
                                fontSize="10"
                            >
                                {maxPoints}
                            </text>
                            <text
                                x={padding.left - 10}
                                y={padding.top + graphHeight / 2 + 3}
                                textAnchor="end"
                                className="text-[10px] font-semibold fill-gray-600"
                                fontSize="10"
                            >
                                {Math.round(maxPoints / 2)}
                            </text>
                            <text
                                x={padding.left - 10}
                                y={padding.top + graphHeight + 3}
                                textAnchor="end"
                                className="text-[10px] font-semibold fill-gray-600"
                                fontSize="10"
                            >
                                0
                            </text>
                        </>
                    )}
                </svg>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-gray-300">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-positive"></div>
                    <span className="text-[9px] text-gray-700 font-semibold">8+ pts</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-orange-500"></div>
                    <span className="text-[9px] text-gray-700 font-semibold">5-7 pts</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-red-500"></div>
                    <span className="text-[9px] text-gray-700 font-semibold">2-4 pts</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-gray-500"></div>
                    <span className="text-[9px] text-gray-700 font-semibold">0-1 pts</span>
                </div>
            </div>
        </div>
    );
}

