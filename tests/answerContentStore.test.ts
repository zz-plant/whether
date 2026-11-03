import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { answerPageContent } from "../lib/answerContentSource";
import {
  ANSWER_CONTENT_KV_KEY,
  findPublishedDecisionPage,
  publishAnswerPages,
  readAnswerPagesWithSource,
  validateAnswerPagesForPublish,
} from "../lib/answers/answerContentStore";
import type { KvNamespace } from "../lib/runtime/kv";

const memoryKv = (entries: Record<string, string> = {}): KvNamespace => {
  const map = new Map(Object.entries(entries));
  return {
    get: async (key) => map.get(key) ?? null,
    put: async (key, value) => {
      map.set(key, value);
    },
    list: async () => ({ keys: [], list_complete: true }),
  };
};

describe("answer content store", () => {
  it("falls back to the bundled seed with no binding and with no published set", async () => {
    assert.equal((await readAnswerPagesWithSource(null)).source, "seed");
    const empty = await readAnswerPagesWithSource(memoryKv());
    assert.equal(empty.source, "seed");
    assert.equal(empty.pages.length, answerPageContent.length);
  });

  it("reads a published set in preference to the seed", async () => {
    const kv = memoryKv();
    const pages = answerPageContent.map((page, index) =>
      index === 0 ? { ...page, shortAnswer: `${page.shortAnswer} (published)` } : page,
    );
    const published = await publishAnswerPages(pages, kv);
    assert.equal(published.length, pages.length);

    const read = await readAnswerPagesWithSource(kv);
    assert.equal(read.source, "kv");
    assert.equal(read.pages[0]?.shortAnswer, pages[0]?.shortAnswer);
  });

  it("refuses a set that is invalid before it writes anything", async () => {
    const kv = memoryKv();
    const first = answerPageContent[0];
    assert.ok(first);

    await assert.rejects(
      () => publishAnswerPages([first, { ...first }], kv),
      /duplicate slug/,
    );
    assert.equal((await readAnswerPagesWithSource(kv)).source, "seed", "nothing was written");
  });

  it("flags thin onward links and duplicate enduring answers", () => {
    const first = answerPageContent[0];
    assert.ok(first);
    const thin = validateAnswerPagesForPublish([
      { ...first, supportingLinks: first.supportingLinks.slice(0, 1) },
    ]);
    assert.equal(thin.ok, false);
    assert.ok(thin.reasons.some((reason) => reason.includes("fewer than 2 onward links")));

    const duplicate = validateAnswerPagesForPublish([
      first,
      { ...first, slug: "another-slug" },
    ]);
    assert.equal(duplicate.ok, false);
    assert.ok(duplicate.reasons.some((reason) => reason.includes("duplicate enduring answer")));
  });

  it("falls back to the seed when the published value does not parse", async () => {
    const kv = memoryKv({ [ANSWER_CONTENT_KV_KEY]: "{not json" });
    const read = await readAnswerPagesWithSource(kv);
    assert.equal(read.source, "seed");
  });

  it("serves a published page through the same lookup the route uses", async () => {
    const kv = memoryKv();
    const slug = answerPageContent[0]!.slug;
    const pages = answerPageContent.map((page) =>
      page.slug === slug ? { ...page, shortAnswer: "Published copy for the preview." } : page,
    );
    await publishAnswerPages(pages, kv);

    const page = await findPublishedDecisionPage(slug, kv);
    assert.equal(page?.shortAnswer, "Published copy for the preview.");
    assert.equal((await findPublishedDecisionPage("not-a-page", kv)), undefined);
  });
});
