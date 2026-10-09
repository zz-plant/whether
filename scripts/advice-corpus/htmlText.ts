/**
 * Text and metadata out of an archive page, with no parser dependency: Bun's HTMLRewriter
 * walks the container a source names, skipping navigation, asides and figures, and the
 * metadata comes from JSON-LD and meta tags, which every registered source publishes.
 */
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  mdash: "—",
  ndash: "–",
  hellip: "…",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      const code = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    if (entity.startsWith("#")) {
      const code = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

const BLOCK_TAGS = ["p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "br", "blockquote", "div", "tr", "pre"];
const SKIP_TAGS = ["nav", "aside", "footer", "figure", "figcaption", "form", "button", "header"];

/** Drops elements whose text is never prose, before the rewriter sees them. */
const stripNoise = (html: string) =>
  html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|iframe|template)\b[\s\S]*?<\/\1>/gi, " ");

/**
 * The visible text inside the first selector in `containers` that yields at least
 * `minWords` words, one paragraph per line. Returns "" when none does.
 */
export function extractText(html: string, containers: readonly string[], minWords = 40): string {
  const clean = stripNoise(html);
  for (const container of containers) {
    let out = "";
    let skip = 0;
    let rewriter = new HTMLRewriter().on(container, {
      text(chunk) {
        if (skip === 0) out += chunk.text;
      },
    });
    rewriter = rewriter.on(BLOCK_TAGS.map((tag) => `${container} ${tag}`).join(", "), {
      element() {
        out += "\n";
      },
    });
    rewriter = rewriter.on(SKIP_TAGS.map((tag) => `${container} ${tag}`).join(", "), {
      element(element) {
        skip += 1;
        element.onEndTag(() => {
          skip -= 1;
        });
      },
    });
    rewriter.transform(clean);
    const text = normaliseText(decodeEntities(out));
    if (wordCount(text) >= minWords) return text;
  }
  return "";
}

export function normaliseText(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/[ \t ]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

export const wordCount = (text: string) => (text.match(/\S+/g) ?? []).length;

export type PageMeta = { title: string | null; published: string | null; author: string | null };

const metaContent = (html: string, attribute: "property" | "name", key: string): string | null => {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const forward = new RegExp(`<meta[^>]*${attribute}=["']${escaped}["'][^>]*content=["']([^"']*)["']`, "i");
  const backward = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*${attribute}=["']${escaped}["']`, "i");
  const match = forward.exec(html) ?? backward.exec(html);
  return match ? decodeEntities(match[1]).trim() || null : null;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** Every object in a JSON-LD payload, `@graph` members included. */
const ldObjects = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) return value.flatMap(ldObjects);
  if (!isRecord(value)) return [];
  const graph = value["@graph"];
  return [value, ...(Array.isArray(graph) ? graph.flatMap(ldObjects) : [])];
};

const nameOf = (value: unknown, people: Map<string, string>): string | null => {
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value)) {
    const names = value.map((item) => nameOf(item, people)).filter((name): name is string => Boolean(name));
    return names.length > 0 ? names.join(", ") : null;
  }
  if (isRecord(value)) {
    if (typeof value.name === "string" && value.name.trim()) return value.name.trim();
    if (typeof value["@id"] === "string") return people.get(value["@id"]) ?? null;
  }
  return null;
};

/** Title, publication timestamp and author from JSON-LD, then OpenGraph/article meta tags. */
export function extractMeta(html: string): PageMeta {
  let title: string | null = null;
  let published: string | null = null;
  let author: string | null = null;
  const objects: Record<string, unknown>[] = [];
  for (const match of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      objects.push(...ldObjects(JSON.parse(match[1].trim())));
    } catch {
      // A malformed block is skipped; the meta tags below are the fallback.
    }
  }
  const people = new Map<string, string>();
  for (const object of objects) {
    if (object["@type"] === "Person" && typeof object["@id"] === "string" && typeof object.name === "string") {
      people.set(object["@id"], object.name);
    }
  }
  for (const object of objects) {
    const type = object["@type"];
    const isArticle =
      typeof type === "string"
        ? /Article|BlogPosting|NewsArticle|WebPage/.test(type)
        : Array.isArray(type) && type.some((entry) => typeof entry === "string" && /Article|BlogPosting/.test(entry));
    if (!isArticle) continue;
    if (!published && typeof object.datePublished === "string") published = object.datePublished;
    if (!title && typeof object.headline === "string") title = decodeEntities(object.headline);
    if (!author) author = nameOf(object.author, people);
  }
  published ??= metaContent(html, "property", "article:published_time");
  published ??= /<time[^>]*\bdatetime=["']([^"']+)["']/i.exec(html)?.[1] ?? null;
  title ??= metaContent(html, "property", "og:title");
  author ??= metaContent(html, "name", "author");
  if (!title) {
    const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    title = titleTag ? decodeEntities(titleTag[1]).trim() || null : null;
  }
  return { title, published, author };
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/** The first "Month YYYY" in `text` (Paul Graham dates each essay this way), as `YYYY-MM`. */
export function firstMonthYear(text: string): string | null {
  const match = new RegExp(`\\b(${MONTHS.join("|")})\\s+((?:19|20)\\d\\d)\\b`, "i").exec(text);
  if (!match) return null;
  const month = MONTHS.indexOf(match[1].toLowerCase()) + 1;
  return `${match[2]}-${String(month).padStart(2, "0")}`;
}
