'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, AlertCircle, Heart, Activity, Newspaper, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NewsTickerItem {
    id: string;
    title: string;
    description?: string;
    url?: string;
    publishedAt?: string;
    source?: string;
    priority: 'high' | 'medium' | 'low';
    type: 'health' | 'injury' | 'news' | 'status';
}

interface NewsTickerProps {
    player: any;
    team?: any;
}

export function NewsTicker({ player, team }: NewsTickerProps) {
    const [items, setItems] = useState<NewsTickerItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const autoScrollRef = useRef<NodeJS.Timeout | null>(null);

    // Get player health status
    const healthPercent = player.chance_of_playing_next_round || 100;
    const playerStatus = player.status || 'a';
    const playerNews = player.news || '';

    useEffect(() => {
        const fetchNews = async () => {
            if (!player) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                
                // Build prioritized news items
                const newsItems: NewsTickerItem[] = [];

                // 1. HIGH PRIORITY: Player health status (always first if not 100%)
                if (healthPercent < 100 || playerStatus !== 'a' || playerNews) {
                    let healthTitle = '';
                    let healthType: 'health' | 'injury' | 'status' = 'health';
                    
                    if (playerStatus !== 'a') {
                        const statusMap: Record<string, string> = {
                            'u': 'Unavailable',
                            'd': 'Doubtful',
                            'i': 'Injured',
                            's': 'Suspended',
                            'n': 'Not in squad',
                        };
                        healthTitle = `Status: ${statusMap[playerStatus] || 'Unknown'}`;
                        healthType = playerStatus === 'i' ? 'injury' : playerStatus === 's' ? 'status' : 'health';
                    } else if (healthPercent < 75) {
                        healthTitle = `Fitness: ${healthPercent}% chance of playing next round`;
                        healthType = healthPercent < 50 ? 'injury' : 'health';
                    } else if (playerNews) {
                        healthTitle = playerNews.length > 80 ? playerNews.substring(0, 80) + '...' : playerNews;
                        healthType = playerNews.toLowerCase().includes('injured') || playerNews.toLowerCase().includes('injury') 
                            ? 'injury' 
                            : 'health';
                    }

                    if (healthTitle) {
                        newsItems.push({
                            id: 'health-status',
                            title: healthTitle,
                            description: playerNews && healthTitle !== playerNews ? playerNews : undefined,
                            priority: healthPercent < 50 ? 'high' : 'medium',
                            type: healthType,
                        });
                    }
                }

                // 2. Fetch external news articles
                try {
                    const query = `${player.web_name} ${team?.name || ''} Premier League football injury fitness`.trim();
                    const response = await fetch(`/api/news?q=${encodeURIComponent(query)}`);
                    
                    if (response.ok) {
                        const data = await response.json();
                        const articles = data.articles || [];

                        // Filter and prioritize articles
                        articles.forEach((article: any, index: number) => {
                            const title = article.title || '';
                            const desc = article.description || '';
                            const text = `${title} ${desc}`.toLowerCase();

                            // Determine priority based on keywords
                            let priority: 'high' | 'medium' | 'low' = 'low';
                            let type: 'health' | 'injury' | 'news' = 'news';

                            if (text.includes('injured') || text.includes('injury') || text.includes('knock') || text.includes('fitness')) {
                                priority = 'high';
                                type = 'injury';
                            } else if (text.includes('doubt') || text.includes('suspended') || text.includes('ban')) {
                                priority = 'high';
                                type = 'health';
                            } else if (text.includes('fit') || text.includes('available') || text.includes('lineup')) {
                                priority = 'medium';
                                type = 'health';
                            }

                            newsItems.push({
                                id: `news-${index}`,
                                title: article.title || 'No title',
                                description: article.description,
                                url: article.url,
                                publishedAt: article.publishedAt,
                                source: article.source?.name,
                                priority,
                                type,
                            });
                        });
                    }
                } catch (error) {
                    console.error('[NewsTicker] Failed to fetch news:', error);
                }

                // Sort by priority: high first, then by date
                newsItems.sort((a, b) => {
                    const priorityOrder = { high: 0, medium: 1, low: 2 };
                    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                        return priorityOrder[a.priority] - priorityOrder[b.priority];
                    }
                    // If same priority, health status first
                    if (a.id === 'health-status') return -1;
                    if (b.id === 'health-status') return 1;
                    return 0;
                });

                setItems(newsItems);
            } catch (error) {
                console.error('[NewsTicker] Error:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchNews();
    }, [player, team, healthPercent, playerStatus, playerNews]);

    // Auto-scroll every 5 seconds
    useEffect(() => {
        if (items.length <= 1 || isPaused) return;

        autoScrollRef.current = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % items.length);
        }, 5000);

        return () => {
            if (autoScrollRef.current) {
                clearInterval(autoScrollRef.current);
            }
        };
    }, [items.length, isPaused]);

    if (loading) {
        return (
            <div className="bg-gray-50 rounded-lg p-3 border-2 border-gray-200">
                <div className="flex items-center gap-2 text-gray-600">
                    <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Loading news...</span>
                </div>
            </div>
        );
    }

    if (items.length === 0) {
        return null; // Don't show anything if no news
    }

    const currentItem = items[currentIndex];
    const getIcon = () => {
        if (currentItem.type === 'injury') return <AlertCircle className="w-4 h-4" />;
        if (currentItem.type === 'health') return <Heart className="w-4 h-4" />;
        return <Newspaper className="w-4 h-4" />;
    };

    const getColorClasses = () => {
        if (currentItem.priority === 'high') {
            return currentItem.type === 'injury' 
                ? 'bg-red-50 border-red-300 text-red-900' 
                : 'bg-orange-50 border-orange-300 text-orange-900';
        }
        return 'bg-blue-50 border-blue-200 text-blue-900';
    };

    return (
        <div className="relative">
            <div 
                className={`rounded-lg border-2 p-3 ${getColorClasses()} transition-colors`}
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
            >
                <div className="flex items-center gap-2">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                        {getIcon()}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentIndex}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                {currentItem.url ? (
                                    <a
                                        href={currentItem.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block hover:underline"
                                    >
                                        <p className="text-sm font-bold line-clamp-1">{currentItem.title}</p>
                                        {currentItem.description && (
                                            <p className="text-xs mt-1 line-clamp-1 opacity-90">{currentItem.description}</p>
                                        )}
                                    </a>
                                ) : (
                                    <>
                                        <p className="text-sm font-bold">{currentItem.title}</p>
                                        {currentItem.description && (
                                            <p className="text-xs mt-1 opacity-90">{currentItem.description}</p>
                                        )}
                                    </>
                                )}
                                {currentItem.source && (
                                    <p className="text-xs mt-1 opacity-70">
                                        {currentItem.source}
                                        {currentItem.publishedAt && ` • ${new Date(currentItem.publishedAt).toLocaleDateString()}`}
                                    </p>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Navigation */}
                    {items.length > 1 && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                                onClick={() => setCurrentIndex((prev) => (prev - 1 + items.length) % items.length)}
                                className="p-1 hover:bg-white/30 rounded transition-colors"
                                aria-label="Previous news"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            
                            {/* Dots indicator */}
                            <div className="flex gap-1 mx-1">
                                {items.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentIndex(idx)}
                                        className={`w-1.5 h-1.5 rounded-full transition-colors ${
                                            idx === currentIndex ? 'bg-current opacity-100' : 'bg-current opacity-30'
                                        }`}
                                        aria-label={`Go to news ${idx + 1}`}
                                    />
                                ))}
                            </div>

                            <button
                                onClick={() => setCurrentIndex((prev) => (prev + 1) % items.length)}
                                className="p-1 hover:bg-white/30 rounded transition-colors"
                                aria-label="Next news"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

