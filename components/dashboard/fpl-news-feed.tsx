/**
 * FPL News Feed Component
 * Displays latest Fantasy Premier League news from NewsAPI
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Newspaper, TrendingUp, AlertCircle, Users, Calendar, ExternalLink } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface NewsArticle {
    title: string;
    description: string;
    url: string;
    urlToImage?: string;
    publishedAt: string;
    source: { name: string };
    content?: string;
}

type NewsCategory = 'all' | 'transfers' | 'injuries' | 'team-news' | 'tips';

export function FPLNewsFeed() {
    const [news, setNews] = useState<Record<NewsCategory, NewsArticle[]>>({
        all: [],
        transfers: [],
        injuries: [],
        'team-news': [],
        tips: []
    });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<NewsCategory>('all');

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const apiKey = process.env.NEXT_PUBLIC_NEWS_API_KEY || 'demo';

                // Fetch different categories with Premier League-specific queries
                const categories = [
                    { key: 'all', query: '"Fantasy Premier League" OR "FPL" OR "Premier League fantasy"' },
                    { key: 'transfers', query: '"Fantasy Premier League" transfers OR "FPL transfers" OR "Premier League transfers"' },
                    { key: 'injuries', query: '"Premier League" injuries OR "FPL injury" OR "English football injuries"' },
                    { key: 'team-news', query: '"Premier League" "team news" OR "FPL lineup" OR "Premier League XI"' },
                    { key: 'tips', query: '"FPL tips" OR "Fantasy Premier League advice" OR "FPL captain picks"' }
                ];

                // Terms to filter out (American football, rugby, other sports)
                const excludeTerms = [
                    'broncos', 'nfl', 'super bowl', 'touchdown', 'quarterback',
                    'patriots', 'cowboys', 'raiders', 'chiefs', '49ers',
                    'rugby', 'all blacks', 'tries', 'scrum',
                    'nba', 'mlb', 'nhl', 'basketball', 'baseball', 'hockey'
                ];

                const fetchPromises = categories.map(async (category) => {
                    const response = await fetch(
                        `https://newsapi.org/v2/everything?q=${encodeURIComponent(category.query)}&language=en&sortBy=publishedAt&pageSize=15&apiKey=${apiKey}`
                    );

                    if (response.ok) {
                        const data = await response.json();
                        // Filter out non-Premier League content
                        const filtered = (data.articles || []).filter((article: NewsArticle) => {
                            const searchText = `${article.title} ${article.description || ''}`.toLowerCase();

                            // Exclude if contains any excluded terms
                            const hasExcludedTerm = excludeTerms.some(term =>
                                searchText.includes(term.toLowerCase())
                            );

                            if (hasExcludedTerm) return false;

                            // Include if mentions Premier League or FPL terms
                            const hasPLContent =
                                searchText.includes('premier league') ||
                                searchText.includes('fpl') ||
                                searchText.includes('fantasy premier league') ||
                                searchText.includes('gameweek') ||
                                searchText.includes('english football');

                            return hasPLContent;
                        });

                        return { key: category.key as NewsCategory, articles: filtered.slice(0, 10) };
                    }
                    return { key: category.key as NewsCategory, articles: [] };
                });

                const results = await Promise.all(fetchPromises);
                const newsData = results.reduce((acc, { key, articles }) => {
                    acc[key] = articles;
                    return acc;
                }, {} as Record<NewsCategory, NewsArticle[]>);

                setNews(newsData);
            } catch (error) {
                console.error('Failed to fetch FPL news:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchNews();
        // Refresh every 30 minutes
        const interval = setInterval(fetchNews, 30 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const getCategoryIcon = (category: NewsCategory) => {
        switch (category) {
            case 'transfers': return TrendingUp;
            case 'injuries': return AlertCircle;
            case 'team-news': return Users;
            case 'tips': return Calendar;
            default: return Newspaper;
        }
    };

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <Card className="border-primary/20 bg-gradient-to-br from-card to-card/50">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Newspaper className="w-5 h-5 text-primary" />
                    FPL News & Updates
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as NewsCategory)}>
                    <TabsList className="grid w-full grid-cols-5 mb-4">
                        <TabsTrigger value="all" className="text-xs">
                            All News
                        </TabsTrigger>
                        <TabsTrigger value="transfers" className="text-xs">
                            Transfers
                        </TabsTrigger>
                        <TabsTrigger value="injuries" className="text-xs">
                            Injuries
                        </TabsTrigger>
                        <TabsTrigger value="team-news" className="text-xs">
                            Team News
                        </TabsTrigger>
                        <TabsTrigger value="tips" className="text-xs">
                            Tips
                        </TabsTrigger>
                    </TabsList>

                    {(['all', 'transfers', 'injuries', 'team-news', 'tips'] as NewsCategory[]).map((category) => (
                        <TabsContent key={category} value={category} className="mt-0">
                            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                                {loading ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Newspaper className="w-12 h-12 mx-auto mb-3 animate-pulse opacity-50" />
                                        <p>Loading latest FPL news...</p>
                                    </div>
                                ) : news[category].length > 0 ? (
                                    news[category].map((article, idx) => {
                                        const Icon = getCategoryIcon(category);
                                        return (
                                            <a
                                                key={idx}
                                                href={article.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block group"
                                            >
                                                <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 hover:bg-primary/10 hover:border-primary/20 transition-all">
                                                    <div className="flex gap-3">
                                                        {article.urlToImage && (
                                                            <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                                                                <img
                                                                    src={article.urlToImage}
                                                                    alt=""
                                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                                    onError={(e) => {
                                                                        e.currentTarget.style.display = 'none';
                                                                    }}
                                                                />
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                                <Badge variant="outline" className="bg-primary/20 text-xs flex items-center gap-1">
                                                                    <Icon className="w-3 h-3" />
                                                                    {article.source.name}
                                                                </Badge>
                                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                                    <Calendar className="w-3 h-3" />
                                                                    {formatTimeAgo(article.publishedAt)}
                                                                </span>
                                                            </div>
                                                            <h4 className="font-semibold mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                                                                {article.title}
                                                            </h4>
                                                            {article.description && (
                                                                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                                                    {article.description}
                                                                </p>
                                                            )}
                                                            <div className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <span>Read more</span>
                                                                <ExternalLink className="w-3 h-3" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </a>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>No news found for this category</p>
                                        <p className="text-xs mt-2">
                                            {!process.env.NEXT_PUBLIC_NEWS_API_KEY &&
                                                'Add NEXT_PUBLIC_NEWS_API_KEY to .env.local'
                                            }
                                        </p>
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            </CardContent>
        </Card>
    );
}
