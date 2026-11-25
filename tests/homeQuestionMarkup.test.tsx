import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { afterEach, beforeEach, describe, it, mock, setSystemTime } from "bun:test";
import { renderToReadableStream } from "react-dom/server";
import type { unstable_cache } from "next/cache";
import * as nextNavigation from "next/navigation";
import snapshotFallback from "../data/snapshot_fallback.json";
import { resetOperatingSnapshotStore } from "../lib/operatingState/snapshotStore";
import { assembleHomePage } from "../lib/report/homePageAssembler";
import * as homePageAssemblyLoader from "../lib/report/homePageAssemblyLoader";
import { createHomePageReportDataLoader } from "../lib/report/homePageData";
import { parseOperatorContextFromCookies } from "../lib/report/operatorContext";
import { loadReportDataSafe } from "../lib/report/reportData";
import { DEFINED_TERM_SET_ID } from "../lib/seo/definedTerms";
import { serveUnreachableUpstreams } from "./fixtures/unreachableUpstreams";

serveUnreachableUpstreams();

const mockAny: any = mock;

/* The same offline render `tests/homeLoadBudget.test.tsx` measures: the bundled reading,
   served as the live path serves it, with no cookie and no data cache. */
mockAny.module("next/navigation", () => ({
  ...nextNavigation,
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
}));

const asLiveRead: typeof loadReportDataSafe = async (...args) => {
  const result = await loadReportDataSafe(...args);
  if (!result.ok) return result;
  return { ...result, data: { ...result.data, treasury: { ...result.data.treasury, fallback_at: null, fallback_reason: null } } };
};

const uncached: typeof unstable_cache = (load) => load;
mockAny.module("../lib/report/homePageAssemblyLoader", () => ({
  ...homePageAssemblyLoader,
  loadHomePageAssembly: async (searchParams?: Parameters<typeof homePageAssemblyLoader.loadHomePageAssembly>[0]) => {
    const operatorContext = parseOperatorContextFromCookies("");
    const homepage = await assembleHomePage(
      { searchParams, operatorContext },
      { loadHomePageReportData: createHomePageReportDataLoader({ unstableCache: uncached, loadReportDataSafe: asLiveRead }) },
    );
    return { homepage, reportData: homepage.reportResult.ok ? homepage.reportResult.data : homepage.reportResult.fallback, operatorContext };
  },
}));

let rendered: Promise<string> | undefined;
const renderHome = () =>
  (rendered ??= (async () => {
    resetOperatingSnapshotStore();
    try {
      const { default: HomePage } = await import("../app/page");
      const stream = await renderToReadableStream(await HomePage({ searchParams: Promise.resolve({}) }));
      await stream.allReady;
      const html = await new Response(stream).text();
      /* For reading the page while editing its copy: WHETHER_HOME_HTML_OUT=/path bun run test this file. */
      if (process.env.WHETHER_HOME_HTML_OUT) writeFileSync(process.env.WHETHER_HOME_HTML_OUT, html);
      return html;
    } finally {
      resetOperatingSnapshotStore();
    }
  })());

beforeEach(() => setSystemTime(new Date(snapshotFallback.fetched_at)));
afterEach(() => setSystemTime());

const decode = (text: string) =>
  text
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

/** What a reader reads: scripts and comments out, tags as nothing, entities decoded, whitespace collapsed. */
const visible = (html: string) =>
  decode(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, "").replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ");

const headings = (html: string) =>
  [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map((match) => visible(match[1] ?? "").trim());

type Node = Record<string, unknown>;

const isNode = (value: unknown): value is Node => typeof value === "object" && value !== null && !Array.isArray(value);

/** The nodes a property holds, whether it holds one or a list. */
const nodesIn = (value: unknown): Node[] => (Array.isArray(value) ? value.filter(isNode) : isNode(value) ? [value] : []);

const homeGraph = (html: string): Node[] => {
  const scripts = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  for (const script of scripts) {
    const parsed: unknown = JSON.parse(script[1] ?? "null");
    if (typeof parsed !== "object" || parsed === null) continue;
    const graph = Reflect.get(parsed, "@graph");
    if (Array.isArray(graph) && graph.some((node: Node) => node["@type"] === "CollectionPage")) return graph;
  }
  throw new Error("the homepage has no JSON-LD graph with its CollectionPage");
};

const questionNodes = (graph: Node[]): Node[] => {
  const page = graph.find((node) => node["@type"] === "CollectionPage");
  const parts = page?.hasPart;
  return Array.isArray(parts) ? parts.filter((part: Node) => part["@type"] === "Question") : [];
};

const answerText = (question: Node) => {
  const answer = question.acceptedAnswer;
  return typeof answer === "object" && answer !== null ? String(Reflect.get(answer, "text")) : "";
};

describe("the homepage marks up only the questions it asks and the answers it prints", () => {
  it("marks up every question heading that has an answer, each in its section", async () => {
    const html = await renderHome();
    const questions = questionNodes(homeGraph(html));
    assert.ok(questions.length >= 4, `expected the page's questions under hasPart, found ${questions.length}`);
    const printed = headings(html);
    for (const question of questions) {
      const name = String(question.name);
      assert.ok(name.endsWith("?"), `"${name}" is marked up as a Question but is not one`);
      assert.ok(printed.includes(name), `"${name}" is marked up but no h2 on the page says it`);
    }
  });

  it("gives each Question the answer the page prints under its heading, word for word", async () => {
    const html = await renderHome();
    const text = visible(html);
    for (const question of questionNodes(homeGraph(html))) {
      const answer = answerText(question);
      assert.ok(answer.length > 0, `"${String(question.name)}" has no answer text`);
      assert.ok(text.includes(answer), `the answer to "${String(question.name)}" is not on the page: ${answer}`);
      /* The answer is the first thing under its heading: the section's lead. */
      const id = question["@id"];
      const section = (typeof id === "string" ? id : "").split("#").at(-1) ?? "";
      const at = html.indexOf(`id="${section}"`);
      assert.ok(at > 0, `no section with id "${section}"`);
      const lead = html.slice(at).match(/data-section-lead[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? "";
      assert.equal(visible(lead).trim(), answer, `the lead under "${String(question.name)}" is not its marked-up answer`);
    }
  });

  it("asks a question only where it answers one", async () => {
    const html = await renderHome();
    const marked = new Set(questionNodes(homeGraph(html)).map((question) => String(question.name)));
    for (const heading of headings(html).filter((entry) => entry.endsWith("?"))) {
      assert.ok(marked.has(heading), `"${heading}" is a question heading with no marked-up answer`);
    }
  });

  it("says what this week's reading holds, and points at the site's own terms", async () => {
    const graph = homeGraph(await renderHome());
    const page = graph.find((node) => node["@type"] === "CollectionPage");
    const [dataset] = nodesIn(page?.mainEntity);
    assert.equal(dataset?.["@type"], "Dataset");
    const measured = nodesIn(dataset?.variableMeasured);
    for (const name of ["Funding pressure", "Risk appetite"]) {
      const score = measured.find((entry) => entry.name === name);
      assert.ok(score, `${name} is not in variableMeasured`);
      assert.equal(typeof score.value, "number");
      assert.equal(score.minValue, 0);
      assert.equal(score.maxValue, 100);
      assert.equal(score.unitText, "points");
    }
    const mentions = nodesIn(page?.mentions);
    assert.ok(
      mentions.some((entry) => entry["@type"] === "DefinedTerm" && nodesIn(entry.inDefinedTermSet).some((set) => set["@id"] === DEFINED_TERM_SET_ID)),
      "the page names none of the site's terms",
    );
    assert.ok(mentions.some((entry) => typeof entry.sameAs === "string" && entry.sameAs.startsWith("https://en.wikipedia.org/wiki/")), "no market concept carries its Wikipedia sameAs");
    assert.ok(!graph.some((node) => node["@type"] === "FAQPage"), "an FAQPage marks up questions the page does not print");
  });

  it("dates the week, the reading and the earlier reading in <time dateTime>", async () => {
    const html = await renderHome();
    const times = [...html.matchAll(/<time dateTime="([^"]+)"[^>]*>/gi)].map((match) => match[1]);
    assert.ok(times.length >= 3, `expected the page's dates in <time>, found ${times.length}`);
    for (const value of times) assert.match(value ?? "", /^\d{4}-\d{2}(-\d{2})?$/, `"${value}" is not an ISO date`);
  });
});
