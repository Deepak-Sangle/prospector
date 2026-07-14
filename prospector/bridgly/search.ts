import type { Platform } from '../schemas/monitor.ts';
import { bridgly } from './client.ts';

/**
 * A single normalized social post from any platform. Every Bridgly search
 * result is mapped down to this shape so the rest of the app never has to know
 * platform-specific fields.
 */
export interface SocialHit {
  platform: Platform;
  author: string;
  url: string;
  content: string;
  /**
   * Native post identifier used to reply via Composio: Reddit fullname (t3_…),
   * X tweet id, or LinkedIn activity/share URN. Null when the source omitted it.
   */
  externalId: string | null;
}

/** How many posts to pull per keyword per platform. */
const RESULTS_PER_KEYWORD = 10;

/** Search Reddit posts for a keyword and normalize them to SocialHits. */
async function searchReddit(keyword: string): Promise<SocialHit[]> {
  const res = await bridgly.reddit.searchPosts({ query: keyword, sort: 'new', limit: RESULTS_PER_KEYWORD });
  if (res.type !== 'success') return [];
  return res.data.posts.map((post) => ({
    platform: 'reddit' as const,
    author: post.author ?? 'unknown',
    url: post.postUrl,
    content: [post.title, post.selftext].filter((part) => part != null && part.length > 0).join('\n\n'),
    externalId: post.fullname,
  }));
}

/** Search X (Twitter) for a keyword and normalize the tweets to SocialHits. */
async function searchX(keyword: string): Promise<SocialHit[]> {
  const res = await bridgly.x.search({ query: keyword, sortOrder: 'Latest', count: RESULTS_PER_KEYWORD });
  if (res.type !== 'success') return [];
  return res.data.map((tweet) => ({
    platform: 'x' as const,
    author: `@${tweet.authorHandle}`,
    url: tweet.url,
    content: tweet.text,
    externalId: tweet.id,
  }));
}

/** Search LinkedIn posts for a keyword and normalize them to SocialHits. */
async function searchLinkedIn(keyword: string): Promise<SocialHit[]> {
  const res = await bridgly.linkedin.searchPosts({
    keyword,
    sortOrder: 'date_posted',
    count: RESULTS_PER_KEYWORD,
  });
  if (res.type !== 'success') return [];
  return res.data.posts
    .filter((post) => post.url != null && post.text != null)
    .map((post) => ({
      platform: 'linkedin' as const,
      author: post.author?.name ?? 'unknown',
      url: post.url as string,
      content: post.text as string,
      externalId: post.urn,
    }));
}

/** Dispatch a single keyword search to the right platform. */
function searchPlatform(platform: Platform, keyword: string): Promise<SocialHit[]> {
  if (platform === 'reddit') return searchReddit(keyword);
  if (platform === 'x') return searchX(keyword);
  return searchLinkedIn(keyword);
}

/**
 * Search every (platform, keyword) combination and return de-duplicated hits.
 * Each hit is tagged with the keywords that surfaced it so downstream code can
 * record which of the monitor's keywords matched.
 */
export async function searchKeywords({
  platforms,
  keywords,
}: {
  platforms: Platform[];
  keywords: string[];
}): Promise<Array<SocialHit & { matchedKeywords: string[] }>> {
  const combos = platforms.flatMap((platform) => keywords.map((keyword) => ({ platform, keyword })));
  const batches = await Promise.all(combos.map(({ platform, keyword }) => searchPlatform(platform, keyword)));

  // Merge by URL, collecting every keyword that surfaced the same post.
  const byUrl = new Map<string, SocialHit & { matchedKeywords: string[] }>();
  batches.forEach((hits, index) => {
    const keyword = combos[index]?.keyword ?? '';
    for (const hit of hits) {
      const existing = byUrl.get(hit.url);
      if (existing) {
        if (!existing.matchedKeywords.includes(keyword)) existing.matchedKeywords.push(keyword);
      } else {
        byUrl.set(hit.url, { ...hit, matchedKeywords: [keyword] });
      }
    }
  });
  return [...byUrl.values()];
}
