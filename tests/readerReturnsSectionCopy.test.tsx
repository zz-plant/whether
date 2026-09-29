import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ReaderReturnsSection } from "../app/trust/readerReturnsSection";

/*
 * The first public claim this product makes about how many people use it, and it lands on
 * the page the navigation points a reader to "when you want to sanity-check the brief before
 * a big decision".
 *
 * Rendered rather than read off the source, per the rule in docs/agents/lessons/tests-and-copy-rules.md: this is a plain
 * server component over two props, so the claim is about what the markup says.
 *
 * The claims worth pinning are the ones that are easy to lose in a copy edit. A percentage
 * is easy to add and would be fabricated — the events carry no identity. "5 readers" is
 * easier still to write than "5 returns" and names five people the data cannot count. And
 * an undated count on the trust page is the one number there a reader has no way to age.
 */

/** Words that belong to the implementation, not to the person reading the page. */
const MAINTAINER_VOCABULARY = /\b(worker|cron|crons|telemetry|binding|dataset|analytics engine|kv|isolate|iso week)\b/i;

const render = (line: string | null, generatedAt = "2026-09-21T14:00:00.000Z") =>
  renderToStaticMarkup(<ReaderReturnsSection line={line} generatedAt={generatedAt} />);

describe("reader returns section", () => {
  it("states the count, its movement, and when it was taken", () => {
    const markup = render("5 returns recorded last week (+3 vs the week before)");

    assert.match(markup, /5 returns recorded last week/);
    assert.match(markup, /\+3 vs the week before/);
    // The date the run wrote the record, in UTC.
    assert.match(markup, /Sep 21, 2026/);
  });

  it("never turns a count of events into a rate or a headcount", () => {
    const markup = render("5 returns recorded last week (+3 vs the week before)");

    assert.doesNotMatch(markup, /%|percent|conversion rate/i);
    assert.doesNotMatch(markup, /\b(5|five) (readers|visitors|people|users)\b/i);
    // And it says why, rather than leaving the reader to assume the count is a headcount.
    assert.match(markup, /not a headcount/i);
  });

  it("keeps the implementation out of the page", () => {
    const markup = render("5 returns recorded last week (+3 vs the week before)");

    assert.ok(
      !MAINTAINER_VOCABULARY.test(markup),
      `maintainer vocabulary reached the page: ${markup.match(MAINTAINER_VOCABULARY)?.[0]}`,
    );
  });

  it("renders nothing at all when there is no line, so a broken anchor is never left behind", () => {
    // The rail's index entry is added on the same condition, so a null line must produce
    // no section rather than an empty one. The null itself comes from
    // `formatActivationFunnelLine` declining to describe two empty weeks, which is pinned
    // in tests/activationFunnelReport.test.ts; a measured zero against a non-zero week
    // *is* a line, and a section that hid it would be hiding a collapse.
    assert.equal(render(null), "");
  });
});
