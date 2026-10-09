/**
 * The registered sources: twelve archives from ten firms, each with the way its posts are
 * enumerated and where its prose sits on the page. Registered in
 * docs/research/advice-corpus-preregistration.md §3; a change here is a deviation there.
 *
 * `firm` is the weighting unit. Paul Graham's essays and the YC blog are one firm, and so are
 * AVC and usv.com, because the analysis weights firms equally and one prolific writer at a
 * firm must not count as a second firm.
 */
import { z } from "zod";

import { decodeEntities, extractText, firstMonthYear } from "./htmlText";
import { logFailure, politeFetch } from "./politeFetch";

export type IndexEntry = {
  url: string;
  title: string | null;
  /** ISO timestamp, `YYYY-MM-DD` or `YYYY-MM` when the index carries one; otherwise read from the page. */
  published: string | null;
  author: string | null;
  /** Post body as HTML when the index already carries it (WordPress REST, the YC listing). */
  inlineHtml: string | null;
};

export type Source = {
  id: string;
  name: string;
  firm: string;
  /** How the archive is enumerated, as registered. */
  discovery: string;
  /** CSS selectors tried in order for the post body on a fetched page. */
  containers: readonly string[];
  /** Author when every post in the archive has the same one. */
  author: string | null;
  /** Suffixes the site appends to titles (" | a16z"), removed. */
  titleSuffix: RegExp | null;
  /** Read the publication month from the body text instead of page metadata. */
  dateFromText?: boolean;
  /** Where the page keeps its date when JSON-LD and meta tags do not. */
  pagePublished?: (html: string) => string | null;
  /** Where the page keeps its body when the HTML does not (a framework's data payload). */
  pageBody?: (html: string) => string | null;
  /** Boilerplate that starts where the post ends (a legal notice, a newsletter box). */
  trimFrom?: RegExp;
  /** The index's HTML is sometimes empty (a page builder), so a short inline body means: fetch the page. */
  inlineMayBeEmpty?: boolean;
  discover: () => Promise<IndexEntry[]>;
};

const STUDY_FIRST_DAY = "2012-01-01";
const STUDY_LAST_DAY = "2026-09-30";

const entry = (url: string, fields: Partial<Omit<IndexEntry, "url">> = {}): IndexEntry => ({
  url,
  title: fields.title ?? null,
  published: fields.published ?? null,
  author: fields.author ?? null,
  inlineHtml: fields.inlineHtml ?? null,
});

const ok = async (url: string) => {
  const response = await politeFetch(url);
  if (response.status < 200 || response.status >= 300) throw new Error(`${response.status} for ${url}`);
  return response.body;
};

/** Every `<loc>` in a sitemap or sitemap index, following nested indexes. */
async function sitemapLocations(url: string): Promise<string[]> {
  const body = await ok(url);
  const locations = [...body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((match) => decodeEntities(match[1]));
  if (/<sitemapindex/i.test(body)) {
    const nested: string[] = [];
    for (const location of locations) nested.push(...(await sitemapLocations(location)));
    return nested;
  }
  return locations;
}

const WpPostSchema = z.object({
  date: z.string(),
  link: z.string(),
  title: z.object({ rendered: z.string() }),
  content: z.object({ rendered: z.string() }),
  author: z.number().optional(),
  categories: z.array(z.number()).optional(),
});
const WpUserSchema = z.object({ id: z.number(), name: z.string() });

/**
 * A WordPress archive through its public REST API: one request per hundred posts, body
 * included, inside the study window.
 */
async function discoverWordPress(origin: string, options: { excludeCategories?: number[]; author?: string | null } = {}) {
  const users = new Map<number, string>();
  if (!options.author) {
    try {
      const parsed = z.array(WpUserSchema).safeParse(JSON.parse(await ok(`${origin}/wp-json/wp/v2/users?per_page=100`)));
      if (parsed.success) for (const user of parsed.data) users.set(user.id, user.name);
    } catch {
      // Author names are optional metadata; a closed users endpoint leaves them blank.
    }
  }
  const entries: IndexEntry[] = [];
  for (let page = 1; ; page += 1) {
    const url =
      `${origin}/wp-json/wp/v2/posts?per_page=100&page=${page}&orderby=date&order=asc` +
      `&after=${STUDY_FIRST_DAY}T00:00:00&before=${STUDY_LAST_DAY}T23:59:59&_fields=date,link,title,content,author,categories`;
    const response = await politeFetch(url);
    if (response.status === 400) break; // past the last page
    if (response.status !== 200) throw new Error(`${response.status} for ${url}`);
    const parsed = z.array(WpPostSchema).parse(JSON.parse(response.body));
    for (const post of parsed) {
      if (options.excludeCategories && post.categories?.some((id) => options.excludeCategories?.includes(id))) continue;
      entries.push(
        entry(post.link, {
          title: decodeEntities(post.title.rendered),
          published: post.date,
          author: options.author ?? (post.author !== undefined ? users.get(post.author) ?? null : null),
          inlineHtml: post.content.rendered,
        }),
      );
    }
    if (parsed.length < 100) break;
  }
  return entries;
}

async function discoverFromSitemap(sitemap: string, keep: RegExp) {
  const locations = await sitemapLocations(sitemap);
  return [...new Set(locations.filter((location) => keep.test(location)))].map((url) => entry(url));
}

const YcPostSchema = z.object({
  title: z.string(),
  slug: z.string(),
  html: z.string().nullable(),
  published_at: z.string(),
  url: z.string().optional(),
  primary_author: z.object({ name: z.string() }).nullable().optional(),
});
const YcPageSchema = z.object({
  props: z.object({
    posts: z.array(YcPostSchema),
    pagination: z.object({ page: z.number(), pages: z.number() }),
  }),
});

/** The YC blog's listing pages carry each post's HTML in the page's data attribute, ten at a time. */
async function discoverYcBlog() {
  const entries: IndexEntry[] = [];
  for (let page = 1; ; page += 1) {
    const body = await ok(`https://www.ycombinator.com/blog?page=${page}`);
    const match = /data-page="([^"]*)"/.exec(body);
    if (!match) throw new Error(`no listing data on YC blog page ${page}`);
    const parsed = YcPageSchema.parse(JSON.parse(decodeEntities(match[1])));
    for (const post of parsed.props.posts) {
      entries.push(
        entry(`https://www.ycombinator.com/blog/${post.slug}`, {
          title: post.title,
          published: post.published_at,
          author: post.primary_author?.name ?? null,
          inlineHtml: post.html,
        }),
      );
    }
    const oldest = parsed.props.posts.at(-1)?.published_at ?? "";
    if (page >= parsed.props.pagination.pages || oldest < STUDY_FIRST_DAY) break;
  }
  return entries;
}

async function discoverPaulGraham() {
  const body = await ok("https://paulgraham.com/articles.html");
  const links = [...body.matchAll(/<a href="([a-z0-9]+\.html)">([^<]+)<\/a>/gi)];
  const seen = new Set<string>();
  const entries: IndexEntry[] = [];
  for (const [, href, title] of links) {
    if (href === "index.html" || href === "articles.html" || seen.has(href)) continue;
    seen.add(href);
    entries.push(entry(`https://paulgraham.com/${href}`, { title: decodeEntities(title).trim() }));
  }
  return entries;
}

/** Tunguz's listing pages give each post's date and title, ten a page, newest first. */
async function discoverTunguz() {
  const entries: IndexEntry[] = [];
  for (let page = 1; ; page += 1) {
    const url = page === 1 ? "https://tomtunguz.com/post/" : `https://tomtunguz.com/post/page/${page}/`;
    const response = await politeFetch(url);
    if (response.status === 404) break;
    if (response.status !== 200) throw new Error(`${response.status} for ${url}`);
    const posts = [
      ...response.body.matchAll(/<h2 class="post-title">\s*<a href="([^"]+)">([\s\S]*?)<\/a>[\s\S]*?<time datetime="([^"]+)"/g),
    ];
    if (posts.length === 0) break;
    for (const [, href, title, published] of posts) {
      const absolute = new URL(href, "https://tomtunguz.com").toString();
      entries.push(entry(absolute, { published, title: decodeEntities(title.replace(/<[^>]+>/g, "")).trim() }));
    }
    if ((posts.at(-1)?.[3] ?? "") < STUDY_FIRST_DAY) break;
  }
  return entries;
}

const NfxPageSchema = z.object({
  props: z.object({ pageProps: z.object({ post: z.object({ content: z.object({ rendered: z.string() }) }) }) }),
});

/** NFX renders its posts from a data payload; the body is the WordPress HTML inside it. */
function nfxBody(html: string): string | null {
  const payload = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  if (!payload) return null;
  try {
    const parsed = NfxPageSchema.safeParse(JSON.parse(payload[1]));
    return parsed.success ? inlineText(parsed.data.props.pageProps.post.content.rendered) : null;
  } catch {
    return null;
  }
}

export const SOURCES: readonly Source[] = [
  {
    id: "a16z",
    name: "a16z",
    firm: "Andreessen Horowitz",
    discovery: "the post-sitemap*.xml files listed in https://a16z.com/sitemap_index.xml (articles, not podcasts or events); each page fetched",
    containers: [".article-body", ".post-content", "article", "main"],
    author: null,
    titleSuffix: /\s*[|–-]\s*Andreessen Horowitz\s*$|\s*[|–-]\s*a16z\s*$/i,
    trimFrom: /\nAbout the Contributors?\n|Expert News by a16z|The views expressed here are those of the individual AH Capital Management/,
    discover: async () => {
      const index = await ok("https://a16z.com/sitemap_index.xml");
      const postSitemaps = [...index.matchAll(/<loc>\s*(https:\/\/a16z\.com\/post-sitemap\d*\.xml)\s*<\/loc>/g)].map((match) => match[1]);
      const entries: IndexEntry[] = [];
      for (const sitemap of postSitemaps) entries.push(...(await discoverFromSitemap(sitemap, /^https:\/\/a16z\.com\/[^?#]+\/$/)));
      return entries;
    },
  },
  {
    id: "sequoia",
    name: "Sequoia articles",
    firm: "Sequoia Capital",
    discovery: "/article/ URLs in https://sequoiacap.com/sitemap.xml; each page fetched",
    containers: [".article__content", "article", "main"],
    author: null,
    titleSuffix: /\s*[|–-]\s*Sequoia Capital\s*$/i,
    trimFrom: /\nshare\n|\nshare$|Join our mailing list|Related Topics/i,
    discover: () => discoverFromSitemap("https://sequoiacap.com/sitemap.xml", /^https:\/\/sequoiacap\.com\/article\/(?!tag\/)[^/]+\/?$/),
  },
  {
    id: "yc-blog",
    name: "Y Combinator blog",
    firm: "Y Combinator",
    discovery: "https://www.ycombinator.com/blog?page=N listing pages, which carry each post's HTML",
    containers: ["body"],
    author: null,
    titleSuffix: null,
    discover: discoverYcBlog,
  },
  {
    id: "paul-graham",
    name: "Paul Graham essays",
    firm: "Y Combinator",
    discovery: "https://paulgraham.com/articles.html; each essay fetched, dated by its own Month YYYY line",
    containers: ["table table", "body"],
    author: "Paul Graham",
    titleSuffix: null,
    dateFromText: true,
    discover: discoverPaulGraham,
  },
  {
    id: "first-round",
    name: "First Round Review",
    firm: "First Round Capital",
    discovery: "https://review.firstround.com/sitemap-posts.xml; each page fetched",
    containers: [".gh-content", ".post-content", "article", "main"],
    author: null,
    titleSuffix: null,
    discover: () => discoverFromSitemap("https://review.firstround.com/sitemap-posts.xml", /^https:\/\/review\.firstround\.com\/[^?#]+$/),
  },
  {
    id: "bessemer",
    name: "Bessemer Atlas and memos",
    firm: "Bessemer Venture Partners",
    discovery: "/atlas/ and /memos/ URLs in https://www.bvp.com/sitemap.xml; each page fetched",
    containers: ["article", "main"],
    author: null,
    titleSuffix: /\s*[|–-]\s*Bessemer Venture Partners\s*$/i,
    pagePublished: (html) => /publishedAt\\?":\\?"(\d{4}-\d{2}-\d{2})/.exec(html)?.[1] ?? null,
    trimFrom: /The information contained herein|Past performance is not indicative/,
    discover: () => discoverFromSitemap("https://www.bvp.com/sitemap.xml", /^https:\/\/www\.bvp\.com\/(atlas|memos)\/[^/?#]+$/),
  },
  {
    id: "greylock",
    name: "Greylock Greymatter",
    firm: "Greylock Partners",
    discovery:
      "WordPress REST API at https://greylock.com/wp-json/wp/v2/posts, excluding the Portfolio News, Firm News and Press categories; a page whose API body is empty is fetched",
    containers: ["article", "main"],
    inlineMayBeEmpty: true,
    author: null,
    titleSuffix: null,
    discover: () => discoverWordPress("https://greylock.com", { excludeCategories: [6, 8, 458] }),
  },
  {
    id: "nfx",
    name: "NFX",
    firm: "NFX",
    discovery: "/post/ URLs in https://nfx.com/sitemap.xml; each page fetched",
    containers: ["article", "main"],
    author: null,
    titleSuffix: /\s*[|–-]\s*NFX\s*$/i,
    pageBody: nfxBody,
    discover: () => discoverFromSitemap("https://nfx.com/sitemap.xml", /^https:\/\/(www\.)?nfx\.com\/post\/[^/?#]+$/),
  },
  {
    id: "usv",
    name: "Union Square Ventures writing",
    firm: "Union Square Ventures",
    discovery: "/writing/ URLs in https://www.usv.com/sitemap.xml; each page fetched",
    containers: ["article", "main"],
    author: null,
    titleSuffix: /\s*[|–-]\s*Union Square Ventures\s*$/i,
    discover: () => discoverFromSitemap("https://www.usv.com/sitemap.xml", /^https:\/\/www\.usv\.com\/writing\/[^/?#]+$/),
  },
  {
    id: "avc",
    name: "AVC (Fred Wilson)",
    firm: "Union Square Ventures",
    discovery:
      "WordPress REST API at https://avc.com/wp-json/wp/v2/posts to May 2024, then https://avc.xyz/sitemap.xml with each page fetched",
    containers: ["article", "main", "body"],
    author: "Fred Wilson",
    titleSuffix: /\s*[|–-]\s*AVC\s*$/i,
    discover: async () => {
      const wordpress = await discoverWordPress("https://avc.com", { author: "Fred Wilson" });
      const onchain = await discoverFromSitemap("https://avc.xyz/sitemap.xml", /^https:\/\/avc\.xyz\/(?!p\/\d+$)[^/?#]+$/);
      return [...wordpress, ...onchain];
    },
  },
  {
    id: "above-the-crowd",
    name: "Above the Crowd (Bill Gurley)",
    firm: "Benchmark",
    discovery: "WordPress REST API at https://abovethecrowd.com/wp-json/wp/v2/posts",
    containers: ["body"],
    author: "Bill Gurley",
    titleSuffix: null,
    discover: () => discoverWordPress("https://abovethecrowd.com", { author: "Bill Gurley" }),
  },
  {
    id: "tunguz",
    name: "Tomasz Tunguz",
    firm: "Tomasz Tunguz (Redpoint, then Theory Ventures)",
    discovery: "https://tomtunguz.com/post/page/N/ listing pages for date and URL; each post fetched",
    containers: [".post-content", "article", "main"],
    author: "Tomasz Tunguz",
    titleSuffix: /\s*[|–-]\s*Tomasz Tunguz\s*$/i,
    trimFrom: /\nPhoto by [^\n]* on Unsplash/,
    discover: discoverTunguz,
  },
];

/** Registered and dropped before any fetch of post text, with the reason (pre-registration §3.2). */
export const EXCLUDED_SOURCES = [
  {
    name: "Both Sides of the Table (Mark Suster)",
    reason:
      "The archive moved to Medium, which answers HTTP 403 to a client that identifies itself honestly; the study does not disguise its User-Agent, and the archive is not gone, so the Wayback Machine rule does not apply.",
  },
  {
    name: "Craft Ventures / David Sacks",
    reason:
      "No dated archive spans the period: craftventures.com publishes no blog index or sitemap, and Sacks's Substack holds about 30 posts, all from 2023 on.",
  },
] as const;

export const sourceById = (id: string) => SOURCES.find((source) => source.id === id) ?? null;

/** Body text for an index entry that carried its HTML. */
export const inlineText = (html: string) => extractText(`<body>${html}</body>`, ["body"], 1);

export const monthFromText = firstMonthYear;

export const reportDiscoveryFailure = (source: Source, error: unknown) =>
  logFailure({ stage: "discover", source: source.id, error: error instanceof Error ? error.message : String(error) });
