import { NextResponse } from 'next/server';
import {
    filterPremierLeagueArticles,
    filterSportsArticleNoise,
    type NewsArticleRow,
    type NewsCategoryKey,
} from '@/lib/news-feed-config';
import {
    FOOTBALL_RSS_ATTRIBUTION,
    RSS_FEED_SOURCES,
    fetchRssFootballFeeds,
    mergeArticleLists,
} from '@/lib/rss-football-feeds';

/** Route must never cache empty/error responses from NewsAPI (Next fetch cache + CDN). */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getNewsApiKey(): string | null {
    const raw = process.env.NEWS_API_KEY || process.env.NEXT_PUBLIC_NEWS_API_KEY;
    const key = typeof raw === 'string' ? raw.trim() : '';
    if (!key || key === 'demo') return null;
    return key;
}

const FETCH_INIT: RequestInit = {
    cache: 'no-store',
    headers: { 'User-Agent': 'FPL-DnD/1.0 (server)' },
};

type NewsApiResult = {
    articles: NewsArticleRow[];
    /** NewsAPI JSON error message when status === 'error' */
    apiMessage?: string;
    /** HTTP failure */
    httpError?: string;
    httpStatus?: number;
};

function isNewsApiRateLimited(r: Pick<NewsApiResult, 'httpStatus' | 'apiMessage' | 'httpError'>): boolean {
    if (r.httpStatus === 429) return true;
    const msg = `${r.apiMessage || ''} ${r.httpError || ''}`.toLowerCase();
    return msg.includes('too many requests') || msg.includes('too many requests recently');
}

/** In-memory cache: free NewsAPI tier is 100 req/day — avoid calling them on every page load. */
let feedMemoryCache: { json: Record<string, unknown>; expires: number } | null = null;
/** Last good payload when NewsAPI returns 429 so UI can still show articles. */
let lastSuccessfulFeedJson: Record<string, unknown> | null = null;

const MEMORY_CACHE_MS = 45 * 60 * 1000;

function flattenCategories(c: Record<NewsCategoryKey, NewsArticleRow[]> | undefined): NewsArticleRow[] {
    if (!c) return [];
    const seen = new Set<string>();
    const out: NewsArticleRow[] = [];
    const keys: NewsCategoryKey[] = ['all', 'transfers', 'injuries', 'team-news', 'tips'];
    for (const key of keys) {
        for (const a of c[key] || []) {
            const k = (a.url || a.title).trim();
            if (!k || seen.has(k)) continue;
            seen.add(k);
            out.push(a);
        }
    }
    return out;
}

async function parseNewsApiResponse(response: Response): Promise<NewsApiResult> {
    const httpStatus = response.status;
    let data: { status?: string; message?: string; code?: string; articles?: NewsArticleRow[] };
    try {
        data = await response.json();
    } catch {
        return { articles: [], httpError: `Invalid JSON (${httpStatus})`, httpStatus };
    }

    if (!response.ok) {
        return {
            articles: [],
            httpError: `${httpStatus} ${response.statusText}`,
            apiMessage: data?.message,
            httpStatus,
        };
    }

    if (data.status === 'error') {
        return {
            articles: [],
            apiMessage: data.message || data.code || 'NewsAPI returned an error',
            httpStatus,
        };
    }

    return { articles: (data.articles || []) as NewsArticleRow[], httpStatus };
}

/** One broad search instead of 5 parallel calls (avoids burning quota + burst rate limits). */
async function fetchEverythingBroad(apiKey: string): Promise<NewsApiResult> {
    const q =
        '("Premier League" OR FPL OR "Fantasy Premier League" OR "English Premier League" OR EPL OR gameweek)';
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&language=en&sortBy=publishedAt&pageSize=40&apiKey=${apiKey}`;
    const response = await fetch(url, FETCH_INIT);
    const parsed = await parseNewsApiResponse(response);

    let filtered = filterPremierLeagueArticles(parsed.articles);
    if (filtered.length === 0 && parsed.articles.length > 0) {
        filtered = filterSportsArticleNoise(parsed.articles).filter((a) => {
            const t = `${a.title} ${a.description || ''}`.toLowerCase();
            return (
                t.includes('premier') ||
                t.includes('football') ||
                t.includes('soccer') ||
                t.includes('fpl') ||
                t.includes('arsenal') ||
                t.includes('liverpool') ||
                t.includes('chelsea') ||
                t.includes('manchester') ||
                t.includes('tottenham') ||
                t.includes('newcastle') ||
                t.includes('brighton') ||
                t.includes('aston villa') ||
                t.includes('everton') ||
                t.includes('fulham') ||
                t.includes('brentford') ||
                t.includes('west ham') ||
                t.includes('crystal palace') ||
                t.includes('nottingham') ||
                t.includes('wolves') ||
                t.includes('bournemouth') ||
                t.includes('leicester') ||
                t.includes('ipswich') ||
                t.includes('southampton')
            );
        });
    }
    if (filtered.length === 0 && parsed.articles.length > 0) {
        filtered = filterSportsArticleNoise(parsed.articles);
    }

    return {
        articles: filtered.slice(0, 25),
        apiMessage: parsed.apiMessage,
        httpError: parsed.httpError,
        httpStatus: parsed.httpStatus,
    };
}

async function fetchTopHeadlinesUrl(apiKey: string, url: string): Promise<NewsApiResult> {
    const response = await fetch(url, FETCH_INIT);
    return parseNewsApiResponse(response);
}

function bucketIntoCategories(articles: NewsArticleRow[]): Record<NewsCategoryKey, NewsArticleRow[]> {
    const seen = new Set<string>();
    const dedupe = (a: NewsArticleRow) => {
        const k = a.url || a.title;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    };

    const base = articles.filter(dedupe);
    const out: Record<NewsCategoryKey, NewsArticleRow[]> = {
        all: base.slice(0, 10),
        transfers: [],
        injuries: [],
        'team-news': [],
        tips: [],
    };

    for (const a of base) {
        const t = `${a.title} ${a.description || ''}`.toLowerCase();
        if (/transfer|signing|sign |deal|loan/.test(t)) out.transfers.push(a);
        if (/injur|injury|knock|doubt|suspension|ban |illness/.test(t)) out.injuries.push(a);
        if (/lineup|xi|starting|match preview|press conference|team news/.test(t)) out['team-news'].push(a);
        if (/fpl|fantasy|captain|gameweek|tips|advice|differential/.test(t)) out.tips.push(a);
    }

    for (const key of ['transfers', 'injuries', 'team-news', 'tips'] as NewsCategoryKey[]) {
        const s = new Set<string>();
        out[key] = out[key]
            .filter((a) => {
                const k = a.url || a.title;
                if (s.has(k)) return false;
                s.add(k);
                return true;
            })
            .slice(0, 10);
    }

    return out;
}

function totalInCategories(c: Record<NewsCategoryKey, NewsArticleRow[]>): number {
    return Object.values(c).reduce((n, arr) => n + arr.length, 0);
}

export async function GET() {
    const apiKey = getNewsApiKey();

    const now = Date.now();
    if (feedMemoryCache && feedMemoryCache.expires > now) {
        const cached = { ...feedMemoryCache.json };
        const meta = {
            ...(typeof cached.meta === 'object' && cached.meta !== null ? cached.meta : {}),
            cache: 'memory',
            cacheExpiresInSec: Math.round((feedMemoryCache.expires - now) / 1000),
        };
        return NextResponse.json(
            { ...cached, meta },
            {
                headers: {
                    'Cache-Control': 'public, max-age=300',
                    'X-News-Feed-Cache': 'hit',
                },
            }
        );
    }

    const diagnostics: string[] = [];

    try {
        const rssResult = await fetchRssFootballFeeds();
        if (rssResult.errors.length) {
            diagnostics.push(...rssResult.errors.map((e) => `RSS: ${e}`));
        }

        let newsApiArticles: NewsArticleRow[] = [];
        let rateLimited = false;

        if (apiKey) {
            const broad = await fetchEverythingBroad(apiKey);
            if (broad.apiMessage) diagnostics.push(`everything: ${broad.apiMessage}`);
            if (broad.httpError) diagnostics.push(`everything HTTP: ${broad.httpError}`);
            rateLimited = isNewsApiRateLimited(broad);
            if (!rateLimited) {
                newsApiArticles = broad.articles;
            }
        }

        const rssFeedsMeta = RSS_FEED_SOURCES.map((f) => f.label);

        if (apiKey && rateLimited && lastSuccessfulFeedJson) {
            const prevCats = lastSuccessfulFeedJson.categories as
                | Record<NewsCategoryKey, NewsArticleRow[]>
                | undefined;
            const prevFlat = flattenCategories(prevCats);
            const merged = mergeArticleLists(rssResult.articles, prevFlat);
            const categories = bucketIntoCategories(merged);
            const totalArticles = totalInCategories(categories);

            const prevMeta =
                typeof lastSuccessfulFeedJson.meta === 'object' && lastSuccessfulFeedJson.meta !== null
                    ? (lastSuccessfulFeedJson.meta as { newsApiUsed?: boolean })
                    : {};
            const body = {
                ok: true as const,
                categories,
                meta: {
                    stale: true,
                    totalArticles,
                    rssFeeds: rssFeedsMeta,
                    attribution: FOOTBALL_RSS_ATTRIBUTION,
                    newsApiUsed: prevMeta.newsApiUsed === true,
                    usedHeadlinesFallback: false,
                    newsApiRateLimited: true,
                    ...(process.env.NODE_ENV === 'development' && diagnostics.length ? { diagnostics } : {}),
                },
            };

            return NextResponse.json(body, {
                headers: {
                    'Cache-Control': 'public, max-age=120',
                    'X-News-Feed-Stale': 'rate-limit',
                },
            });
        }

        if (apiKey && rateLimited && !lastSuccessfulFeedJson) {
            const categories = bucketIntoCategories(rssResult.articles);
            const totalArticles = totalInCategories(categories);

            const body = {
                ok: true as const,
                categories,
                meta: {
                    stale: true,
                    totalArticles,
                    rssFeeds: rssFeedsMeta,
                    attribution: FOOTBALL_RSS_ATTRIBUTION,
                    newsApiUsed: false,
                    usedHeadlinesFallback: false,
                    newsApiRateLimited: true,
                    ...(process.env.NODE_ENV === 'development' && diagnostics.length ? { diagnostics } : {}),
                },
            };

            if (totalArticles > 0) {
                feedMemoryCache = { json: body as Record<string, unknown>, expires: now + MEMORY_CACHE_MS };
            }

            return NextResponse.json(body, {
                headers: {
                    'Cache-Control': 'public, max-age=120',
                    'X-News-Feed-Stale': 'rate-limit',
                },
            });
        }

        let merged = mergeArticleLists(rssResult.articles, newsApiArticles);
        let categories = bucketIntoCategories(merged);
        let usedHeadlinesFallback = false;

        let totalArticles = totalInCategories(categories);

        if (totalArticles === 0 && apiKey && !rateLimited) {
            const fallbacks = [
                `https://newsapi.org/v2/top-headlines?country=gb&category=sports&pageSize=40&apiKey=${apiKey}`,
                `https://newsapi.org/v2/top-headlines?country=gb&pageSize=40&apiKey=${apiKey}`,
                `https://newsapi.org/v2/top-headlines?country=gb&q=Premier+League&pageSize=40&apiKey=${apiKey}`,
            ];

            for (const fbUrl of fallbacks) {
                const fb = await fetchTopHeadlinesUrl(apiKey, fbUrl);
                if (isNewsApiRateLimited(fb)) {
                    diagnostics.push(`top-headlines: ${fb.apiMessage || fb.httpError || 'rate limited'}`);
                    break;
                }
                if (fb.apiMessage) diagnostics.push(`top-headlines: ${fb.apiMessage}`);
                if (fb.httpError) diagnostics.push(`top-headlines HTTP: ${fb.httpError}`);

                const noiseFiltered = filterSportsArticleNoise(fb.articles);
                if (noiseFiltered.length > 0) {
                    merged = mergeArticleLists(rssResult.articles, noiseFiltered);
                    categories = bucketIntoCategories(merged);
                    usedHeadlinesFallback = true;
                    break;
                }
            }
        }

        totalArticles = totalInCategories(categories);

        const newsApiUsed = newsApiArticles.length > 0 || usedHeadlinesFallback;

        const warning =
            totalArticles === 0 && diagnostics.length > 0
                ? diagnostics.join(' · ')
                : totalArticles === 0
                  ? apiKey
                      ? 'No articles yet: check RSS URLs, NewsAPI key, and quota (100/day on free tier).'
                      : 'No articles yet: check BBC / Guardian RSS availability from this server.'
                  : undefined;

        const body = {
            ok: true as const,
            categories,
            meta: {
                usedHeadlinesFallback,
                totalArticles,
                rssFeeds: rssFeedsMeta,
                attribution: FOOTBALL_RSS_ATTRIBUTION,
                newsApiUsed,
                ...(warning ? { warning } : {}),
                ...(process.env.NODE_ENV === 'development' && diagnostics.length ? { diagnostics } : {}),
            },
        };

        if (totalArticles > 0) {
            lastSuccessfulFeedJson = body as Record<string, unknown>;
            feedMemoryCache = { json: body as Record<string, unknown>, expires: now + MEMORY_CACHE_MS };
        }

        return NextResponse.json(body, {
            headers: {
                'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
                'X-News-Feed-Cache': 'miss',
            },
        });
    } catch (e) {
        console.error('[News Feed API]', e);
        return NextResponse.json(
            {
                ok: false,
                error: e instanceof Error ? e.message : 'Failed to load news feed',
                categories: {
                    all: [],
                    transfers: [],
                    injuries: [],
                    'team-news': [],
                    tips: [],
                } as Record<NewsCategoryKey, NewsArticleRow[]>,
                meta: {
                    rssFeeds: RSS_FEED_SOURCES.map((f) => f.label),
                    attribution: FOOTBALL_RSS_ATTRIBUTION,
                },
            },
            { status: 200 }
        );
    }
}
