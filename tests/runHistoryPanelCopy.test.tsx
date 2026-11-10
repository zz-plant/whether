import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RunHistorySection } from "../app/trust/runHistorySection";
import type { CronRunHistory } from "../lib/telemetry/runHistory";

/*
 * /trust is the page the navigation points a reader to "when you want to
 * sanity-check the brief before a big decision". This panel was written for the
 * other reader — the one who maintains the pipeline. It named the Worker and its
 * crons, printed the internal reason a read failed, and rendered a raw error
 * message under a column header promising a time.
 *
 * Rendered rather than read off the source, per the rule in docs/agents/lessons/tests-and-copy-rules.md: this is a
 * plain server component over a prop, so the markup is available here and the
 * claim is about what the markup says.
 */

const render = (runHistory: CronRunHistory) =>
  renderToStaticMarkup(<RunHistorySection runHistory={runHistory} />);

/** Words that belong to the implementation, not to the person reading the page. */
const MAINTAINER_VOCABULARY = /\b(worker|cron|crons|telemetry|binding|dataset|analytics engine|isolate)\b/i;

const okHistory: CronRunHistory = {
  status: "ok",
  windowDays: 30,
  generatedAt: "2026-09-16T00:00:00.000Z",
  totalRuns: 6,
  totalFailures: 1,
  steps: [
    {
      step: "email/send-weekly",
      label: "Weekly email",
      runs: 2,
      failures: 1,
      lastRunAt: "2026-09-14T14:00:05.000Z",
      lastOkAt: "2026-09-07T14:00:05.000Z",
      lastFailedAt: "2026-09-14T14:00:05.000Z",
      lastError: "SMTP 550: mailbox unavailable for 2 of 31 recipients",
    },
  ],
};

describe("run history panel copy", () => {
  it("dates the last failure instead of pasting the error under a column that promises a time", () => {
    const markup = render(okHistory);

    assert.match(markup, /Sep 14, 14:00 UTC/);
    assert.ok(
      !markup.includes("SMTP 550"),
      "the failing step's own error message reached the page",
    );
  });

  it("keeps the implementation out of every state it can render", () => {
    const states: CronRunHistory[] = [
      okHistory,
      { ...okHistory, steps: [], totalRuns: 0, totalFailures: 0 },
      { status: "unavailable", reason: "analytics_query_failed: 403" },
    ];

    for (const state of states) {
      const markup = render(state);
      const found = MAINTAINER_VOCABULARY.exec(markup);
      assert.equal(found, null, `panel said "${found?.[0]}" to a reader: ${markup}`);
    }
  });

  it("does not print the internal reason a read failed", () => {
    const markup = render({ status: "unavailable", reason: "analytics_query_failed: 403" });

    assert.ok(!markup.includes("403"), "the read failure's internal reason reached the page");
    assert.match(markup, /could not be loaded/i);
  });

  it("renders nothing at all when the read is not configured", () => {
    assert.equal(render({ status: "unconfigured" }), "");
  });
});

describe("run history day strip", () => {
  it("draws one mark per day in place of the last-success stamp, and labels the strip in words", () => {
    const days = Array.from({ length: 30 }, (_, index) =>
      index === 27 ? { runs: 1, failures: 1 } : index % 7 === 0 ? { runs: 1, failures: 0 } : { runs: 0, failures: 0 },
    );
    const markup = render({ ...okHistory, steps: okHistory.steps.map((step) => ({ ...step, days })) });

    assert.equal((markup.match(/data-run-day=/g) ?? []).length, 30);
    assert.equal((markup.match(/data-run-day="failed"/g) ?? []).length, 1);
    assert.match(markup, /Last 30 days/);
    assert.ok(!markup.includes("Last success"), "the stamp column stayed beside the strip");
    assert.match(markup, /aria-label="Ran on 6 of the last 30 days, with a failure on 1\."/);
    // The last failure keeps its date: the strip says which day, the stamp says when.
    assert.match(markup, /Sep 14, 14:00 UTC/);
  });
});
