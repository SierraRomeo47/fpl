/**
 * Public RSS feeds — no API keys. Fetch server-side only.
 * Respect BBC / Guardian terms; attribute sources in the UI.
 */

import type { NewsArticleRow } from '@/lib/news-feed-config';

/** Shown in API meta and the dashboard; reminds users to follow publisher terms. */
export const FOOTBALL_RSS_ATTRIBUTION =
    'Headlines include public RSS feeds from BBC Sport and The Guardian; open each article on the publisher’s site and follow their terms of use.';

export const RSS_FEED_SOURCES = [
    {
        id: 'bbc-football',
        label: 'BBC Sport — Football',
        /** Official BBC Sport football RSS */
        url: 'https://feeds.bbci.co.uk/sport/football/rss.xml',
        sourceName: 'BBC Sport',
    },
    {
        id: 'guardian-football',
        label: 'The Guardian — Football',
        url: 'https://www.theguardian.com/football/rss',
        sourceName: 'The Guardian',
    },
] as const;

function stripHtml(raw: string): string {
    return raw
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractTag(block: string, tag: string): string {
    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const m = block.match(re);
    if (!m) return '';
    let inner = m[1].trim();
    if (inner.startsWith('<![CDATA[')) {
        inner = inner.replace(/^<!\[CDATA\[/, '').replace(/\]\]>\s*$/, '');
    }
    return inner.trim();
}

/** Optional enclosure / media thumbnail (BBC uses media:thumbnail). */
function extractThumbnail(block: string): string | undefined {
    const u =
        block.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i)?.[1] ||
        block.match(/<enclosure[^>]+url=["']([^"']+)["']/i)?.[1];
    return u;
}

function extractAtomLink(block: string): string {
    const links = [...block.matchAll(/<link([^>]*)>/gi)];
    for (const lm of links) {
        const attrs = lm[1] || '';
        const href = attrs.match(/href=["']([^"']+)["']/i)?.[1];
        if (href && /^https?:\/\//i.test(href)) return href;
    }
    return extractTag(block, 'link').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1').trim();
}

function parseRss2Items(xml: string, sourceName: string): NewsArticleRow[] {
    const items: NewsArticleRow[] = [];
    const re = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) !== null) {
        const block = m[1];
        const title = stripHtml(extractTag(block, 'title'));
        let link = extractTag(block, 'link').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1').trim();
        if (!link) link = extractAtomLink(block);
        const pubRaw = extractTag(block, 'pubDate') || extractTag(block, 'dc:date');
        const desc = stripHtml(extractTag(block, 'description') || extractTag(block, 'summary'));
        const thumb = extractThumbnail(block);
        if (!title || !link) continue;
        const publishedAt = pubRaw ? new Date(pubRaw).toISOString() : new Date().toISOString();
        items.push({
            title,
            description: desc || '',
            url: link,
            publishedAt,
            source: { name: sourceName },
            ...(thumb ? { urlToImage: thumb } : {}),
        });
    }
    return items;
}

function parseAtomEntries(xml: string, sourceName: string): NewsArticleRow[] {
    const items: NewsArticleRow[] = [];
    const re = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) !== null) {
        const block = m[1];
        const title = stripHtml(extractTag(block, 'title'));
        const link = extractAtomLink(block);
        const pubRaw =
            extractTag(block, 'published') ||
            extractTag(block, 'updated') ||
            extractTag(block, 'pubDate');
        const summary = stripHtml(extractTag(block, 'summary') || extractTag(block, 'content'));
        if (!title || !link) continue;
        const publishedAt = pubRaw ? new Date(pubRaw).toISOString() : new Date().toISOString();
        items.push({
            title,
            description: summary || '',
            url: link,
            publishedAt,
            source: { name: sourceName },
        });
    }
    return items;
}

export function parseFeedXml(xml: string, sourceName: string): NewsArticleRow[] {
    const head = xml.slice(0, 1200).toLowerCase();
    if (head.includes('<feed') || head.includes('xmlns="http://www.w3.org/2005/atom"')) {
        const atom = parseAtomEntries(xml, sourceName);
        if (atom.length > 0) return atom;
    }
    return parseRss2Items(xml, sourceName);
}

const RSS_FETCH_INIT: RequestInit = {
    cache: 'no-store',
    headers: {
        'User-Agent': 'FPL-DnD/1.0 (RSS reader; server-side only)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
    },
};

export type RssFetchResult = {
    articles: NewsArticleRow[];
    errors: string[];
};

export async function fetchRssFootballFeeds(): Promise<RssFetchResult> {
    const errors: string[] = [];
    const all: NewsArticleRow[] = [];

    await Promise.all(
        RSS_FEED_SOURCES.map(async (feed) => {
            try {
                const res = await fetch(feed.url, RSS_FETCH_INIT);
                if (!res.ok) {
                    errors.push(`${feed.label}: HTTP ${res.status}`);
                    return;
                }
                const xml = await res.text();
                const parsed = parseFeedXml(xml, feed.sourceName);
                if (parsed.length === 0) {
                    errors.push(`${feed.label}: no items parsed`);
                    return;
                }
                all.push(...parsed);
            } catch (e) {
                errors.push(
                    `${feed.label}: ${e instanceof Error ? e.message : String(e)}`
                );
            }
        })
    );

    all.sort(
        (a, b) =>
            new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    return { articles: all, errors };
}

export function mergeArticleLists(
    primary: NewsArticleRow[],
    secondary: NewsArticleRow[]
): NewsArticleRow[] {
    const seen = new Set<string>();
    const out: NewsArticleRow[] = [];

    const norm = (u: string) =>
        u.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '').toLowerCase();

    for (const a of [...primary, ...secondary]) {
        const key = norm(a.url || '') || a.title;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(a);
    }

    out.sort(
        (a, b) =>
            new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    return out;
}
