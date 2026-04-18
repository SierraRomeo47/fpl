/**
 * Shared NewsAPI.org query + filter logic (used by /api/news/feed server route).
 * NewsAPI must be called from the server — browser requests are blocked by CORS.
 */

export type NewsCategoryKey = 'all' | 'transfers' | 'injuries' | 'team-news' | 'tips';

export interface NewsArticleRow {
    title: string;
    description: string;
    url: string;
    urlToImage?: string;
    publishedAt: string;
    source: { name: string };
    content?: string;
}

export const NEWS_CATEGORY_QUERIES: { key: NewsCategoryKey; query: string }[] = [
    { key: 'all', query: '"Fantasy Premier League" OR "FPL" OR "Premier League fantasy"' },
    {
        key: 'transfers',
        query: '"Fantasy Premier League" transfers OR "FPL transfers" OR "Premier League transfers"',
    },
    { key: 'injuries', query: '"Premier League" injuries OR "FPL injury" OR "English football injuries"' },
    {
        key: 'team-news',
        query: '"Premier League" "team news" OR "FPL lineup" OR "Premier League XI"',
    },
    { key: 'tips', query: '"FPL tips" OR "Fantasy Premier League advice" OR "FPL captain picks"' },
];

const EXCLUDE_TERMS = [
    'broncos',
    'nfl',
    'super bowl',
    'touchdown',
    'quarterback',
    'patriots',
    'cowboys',
    'raiders',
    'chiefs',
    '49ers',
    'rugby',
    'all blacks',
    'tries',
    'scrum',
    'nba',
    'mlb',
    'nhl',
    'basketball',
    'baseball',
    'hockey',
];

export function filterPremierLeagueArticles(articles: NewsArticleRow[]): NewsArticleRow[] {
    return (articles || []).filter((article) => {
        const searchText = `${article.title} ${article.description || ''}`.toLowerCase();

        const hasExcludedTerm = EXCLUDE_TERMS.some((term) => searchText.includes(term.toLowerCase()));
        if (hasExcludedTerm) return false;

        const hasPLContent =
            searchText.includes('premier league') ||
            searchText.includes('fpl') ||
            searchText.includes('fantasy premier league') ||
            searchText.includes('gameweek') ||
            searchText.includes('english football');

        return hasPLContent;
    });
}

/** For top-headlines fallback: drop obvious non-football noise only (headlines rarely repeat “Premier League”). */
export function filterSportsArticleNoise(articles: NewsArticleRow[]): NewsArticleRow[] {
    return (articles || []).filter((article) => {
        const searchText = `${article.title} ${article.description || ''}`.toLowerCase();
        return !EXCLUDE_TERMS.some((term) => searchText.includes(term.toLowerCase()));
    });
}
