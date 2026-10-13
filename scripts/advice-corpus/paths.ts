/**
 * Where the advice corpus keeps its files, and the constants the pre-registration fixes.
 *
 * Raw pages and extracted text stay under `.cache/advice-corpus/` (gitignored): the study
 * commits derived metadata only, never a post's text. Protocol:
 * docs/research/advice-corpus-preregistration.md.
 */
import { join } from "node:path";

export const REPO_ROOT = join(import.meta.dirname, "..", "..");
export const CACHE_ROOT = join(REPO_ROOT, ".cache", "advice-corpus");

export const CACHE = {
  http: join(CACHE_ROOT, "http"),
  index: join(CACHE_ROOT, "index"),
  text: join(CACHE_ROOT, "text"),
  embeddings: join(CACHE_ROOT, "embeddings.jsonl"),
  prefilter: join(CACHE_ROOT, "prefilter.json"),
  labels: join(CACHE_ROOT, "labels"),
  validation: join(CACHE_ROOT, "validation"),
  failures: join(CACHE_ROOT, "failures.jsonl"),
  log: join(CACHE_ROOT, "run.log"),
};

export const DATA_DIR = join(REPO_ROOT, "data", "advice-corpus");
export const POSTS_PATH = join(DATA_DIR, "posts.json");
export const MONTHLY_PATH = join(DATA_DIR, "monthly.json");
export const RESEARCH_DIR = join(REPO_ROOT, "docs", "research");

/** Sent with every request, so a site owner can see who is reading and why. */
export const USER_AGENT =
  "WhetherAdviceCorpus/1.0 (+https://whether.work/concepts; a dated corpus of public investor advice, read at most once a second per host)";

/** The record runs from the January 2012 month-end; posts outside it are not analysed. */
export const STUDY_START = { year: 2012, month: 1 };
export const STUDY_END = { year: 2026, month: 9 };

/** Seconds between two requests to one host. The registered ceiling is one request a second. */
export const MIN_SECONDS_BETWEEN_REQUESTS = 1.1;

export const LOCAL_CHAT_MODEL = "qwen3-coder:30b-128k";
export const LOCAL_EMBED_MODEL = "nomic-embed-text";
export const OLLAMA_URL = "http://127.0.0.1:11434";

/** Classifier input: the first HEAD_WORDS words, then up to SNIPPETS windows around capital terms later in the post. */
export const HEAD_WORDS = 1100;
export const SNIPPET_WORDS = 60;
export const SNIPPETS = 4;

/** Seeds fixed in the pre-registration. */
export const SEEDS = { nonCandidateSample: 20261009, validationSample: 20261010, spotcheck: 20261011, bootstrap: 20261012 };

export const NON_CANDIDATE_SAMPLE_RATE = 0.1;
