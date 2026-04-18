/**
 * FPL News Feed Component
 * Football headlines from server-parsed RSS (BBC Sport, Guardian) with optional NewsAPI enrichment.
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
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
    const [feedError, setFeedError] = useState<string | null>(null);
    const [usedHeadlinesFallback, setUsedHeadlinesFallback] = useState(false);
    const [feedWarning, setFeedWarning] = useState<string | null>(null);
    const [feedAttribution, setFeedAttribution] = useState<string | null>(null);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                setFeedError(null);
                setFeedWarning(null);
                setFeedAttribution(null);
                setUsedHeadlinesFallback(false);
                const response = await fetch('/api/news/feed', { cache: 'no-store' });
                const data = await response.json();

                const c = data.categories || {};
                const nextNews = {
                    all: c.all || [],
                    transfers: c.transfers || [],
                    injuries: c.injuries || [],
                    'team-news': c['team-news'] || [],
                    tips: c.tips || [],
                };
                setNews(nextNews);

                if (data.ok === false && (data.error || data.hint)) {
                    setFeedError(data.hint || data.error || 'News unavailable');
                    setFeedAttribution(
                        typeof data.meta?.attribution === 'string' ? data.meta.attribution : null
                    );
                    return;
                }

                setFeedError(null);
                setUsedHeadlinesFallback(Boolean(data.meta?.usedHeadlinesFallback));
                {
                    const w = typeof data.meta?.warning === 'string' ? data.meta.warning : null;
                    const hasStories =
                        (nextNews.all?.length ?? 0) > 0 ||
                        (typeof data.meta?.totalArticles === 'number' && data.meta.totalArticles > 0);
                    const hideBenignRateLimit =
                        hasStories &&
                        w &&
                        /rate limit/i.test(w) &&
                        /newsapi|rss/i.test(w);
                    setFeedWarning(hideBenignRateLimit ? null : w);
                }
                setFeedAttribution(
                    typeof data.meta?.attribution === 'string' ? data.meta.attribution : null
                );
            } catch (error) {
                console.error('Failed to fetch FPL news:', error);
                setFeedError('Could not load news feed');
            } finally {
                setLoading(false);
            }
        };

        fetchNews();
        const interval = setInterval(fetchNews, 45 * 60 * 1000);
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

    const totalArticles = useMemo(
        () => Object.values(news).reduce((n, arr) => n + arr.length, 0),
        [news]
    );

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
                {feedAttribution && (
                    <p className="text-xs text-muted-foreground leading-relaxed mt-2">{feedAttribution}</p>
                )}
            </CardHeader>
            <CardContent>
                {feedWarning && (
                    <div
                        role="status"
                        className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-foreground"
                    >
                        <span className="font-semibold">News feed: </span>
                        {feedWarning}
                    </div>
                )}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as NewsCategory)}>
                    <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 gap-1 mb-4 h-auto border border-border bg-muted/80 text-foreground">
                        <TabsTrigger
                            value="all"
                            className="text-[11px] px-2 py-1 whitespace-normal leading-tight data-[state=inactive]:text-foreground/80"
                        >
                            All News
                        </TabsTrigger>
                        <TabsTrigger
                            value="transfers"
                            className="text-[11px] px-2 py-1 whitespace-normal leading-tight data-[state=inactive]:text-foreground/80"
                        >
                            Transfers
                        </TabsTrigger>
                        <TabsTrigger
                            value="injuries"
                            className="text-[11px] px-2 py-1 whitespace-normal leading-tight data-[state=inactive]:text-foreground/80"
                        >
                            Injuries
                        </TabsTrigger>
                        <TabsTrigger
                            value="team-news"
                            className="text-[11px] px-2 py-1 whitespace-normal leading-tight data-[state=inactive]:text-foreground/80"
                        >
                            Team News
                        </TabsTrigger>
                        <TabsTrigger
                            value="tips"
                            className="text-[11px] px-2 py-1 whitespace-normal leading-tight data-[state=inactive]:text-foreground/80"
                        >
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
                                    <div className="text-center py-8 space-y-2">
                                        <AlertCircle className="w-12 h-12 mx-auto mb-1 text-foreground/40" />
                                        <p className="font-medium text-foreground">
                                            {feedError
                                                ? feedError
                                                : totalArticles === 0
                                                  ? 'No news articles loaded'
                                                  : 'Nothing in this category yet'}
                                        </p>
                                        {feedError ? (
                                            <p className="text-xs max-w-md mx-auto text-foreground/80 leading-relaxed">
                                                The feed normally loads BBC Sport and Guardian football RSS on the
                                                server (no key). Optional: add{' '}
                                                <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                                                    NEWS_API_KEY
                                                </code>{' '}
                                                to{' '}
                                                <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                                                    .env.local
                                                </code>{' '}
                                                for extra NewsAPI coverage (free tier quota applies). Articles load via{' '}
                                                <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                                                    /api/news/feed
                                                </code>{' '}
                                                on the server only.
                                            </p>
                                        ) : totalArticles === 0 ? (
                                            <p className="text-xs max-w-md mx-auto text-foreground/80 leading-relaxed">
                                                {feedWarning ? (
                                                    <>
                                                        See the notice above for the exact error from NewsAPI. Common
                                                        causes: invalid key, daily quota exceeded (100/day on free tier),
                                                        or free-tier requests only allowed from localhost — deploy a key
                                                        or upgrade at newsapi.org.
                                                    </>
                                                ) : (
                                                    <>
                                                        Check network access to BBC and Guardian RSS from your server,
                                                        or try again later. With{' '}
                                                        <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                                                            NEWS_API_KEY
                                                        </code>
                                                        , also verify NewsAPI quota and allowed hosts. This panel
                                                        refreshes every 45 minutes.
                                                        {usedHeadlinesFallback && (
                                                            <span className="block mt-2 text-foreground/70">
                                                                UK headline fallbacks were tried after the main search.
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </p>
                                        ) : (
                                            <p className="text-xs text-foreground/75">
                                                Try &ldquo;All News&rdquo; or another tab — stories are grouped by
                                                keywords.
                                            </p>
                                        )}
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
