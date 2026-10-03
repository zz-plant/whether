import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import SharePage from "../app/share/page";
import { macroSeries } from "../lib/macroSnapshot";
import { buildOperatingSnapshot } from "../lib/operatingState/snapshot";
import { resetOperatingSnapshotStore } from "../lib/operatingState/snapshotStore";
import { snapshotData } from "../lib/snapshot";
import { decisionAreaLabel, decisionAreaOrder } from "../lib/report/boundedDecisionRules";

const originalFetch = globalThis.fetch;

beforeEach(async () => {
  globalThis.fetch = async () => {
    throw new Error("The current share artifact must not fetch around its OperatingSnapshot.");
  };
  const snapshot = buildOperatingSnapshot({
    treasury: snapshotData,
    macroSeries,
    now: new Date("2026-08-31T12:00:00.000Z"),
  });
  snapshot.weeklyCall = {
    ...snapshot.weeklyCall,
    currentCall: "Share the persisted call exactly.",
    actionNow: "Transmit the committed action.",
    pauseIf: "Pause if the snapshot cannot be read.",
    callChangesIf: "Re-open only from the next committed snapshot.",
  };
  await resetOperatingSnapshotStore().write(snapshot);
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  resetOperatingSnapshotStore();
});

describe("/share current weekly artifact", () => {
  it("renders real weekly brief exports instead of placeholder marketing copy", async () => {
    const html = renderToStaticMarkup(await SharePage());

    assert.match(html, /Week of /);
    // The exports lead with the conditions label; "Posture" was the export header before the
    // 2026-09-22 copy pass renamed it, and is no longer a word the page prints.
    assert.match(html, /Conditions:/);
    assert.match(html, /Do now/);
    assert.match(html, /Pause if/);
    // The change condition under its own label, not the resume vocabulary.
    assert.match(html, /Conditions change if: Re-open only from the next committed snapshot\./);
    assert.match(html, /Resume when/);
    assert.match(html, /Meeting pack/);
    assert.match(html, /Share the persisted call exactly\./);
    assert.match(html, /Transmit the committed action\./);
    assert.match(html, /Pause if the snapshot cannot be read\./);
    assert.match(html, /Re-open only from the next committed snapshot\./);
    assert.doesNotMatch(html, /Macro signals.*operating posture/);
    assert.doesNotMatch(html, /Current regime and operating posture for the period/);
  });

  it("offers the board slide as a file beside the images, and the investor update beside the copy formats", async () => {
    const html = renderToStaticMarkup(await SharePage());

    assert.match(html, /href="\/api\/export\/board-slide\?format=pptx&amp;stage=seed"/);
    assert.match(html, /href="\/api\/export\/board-slide\?format=pdf&amp;stage=seed"/);
    assert.match(html, /Download PPTX/);
    assert.match(html, /Download PDF/);
    assert.match(html, /Investor update/);
    assert.match(html, /Copy investor update/);
    assert.match(html, /Portfolio note/);
    assert.match(html, /Copy portfolio note/);
  });

  /* DD-037. Each group's h2 was an eyebrow label, smaller than the serif titles
     of the cards inside it, and the five tag buttons sat in a row under the
     table, a table's height from the rows they copy. */
  it("heads each group with a heading, and puts each area's tag button in that area's row", async () => {
    const html = renderToStaticMarkup(await SharePage());

    /* "Copy this week's guidance" reads the brief from the page in the browser
       and renders nothing on the server, so it is not in this markup. */
    for (const id of ["longer-formats-heading", "guardrail-tags-heading", "wip-limits-heading", "role-memos-heading", "share-files-heading"]) {
      const heading = new RegExp(`<h2 id="${id}" class="([^"]*)"`).exec(html);
      assert.ok(heading, `${id} renders as an h2`);
      assert.doesNotMatch(heading[1] ?? "", /type-eyebrow/, `${id} is a heading, not a label`);
    }

    const tagRows = [...html.matchAll(/<tr[^>]*data-area="([^"]+)"[^>]*>([\s\S]*?)<\/tr>/g)].filter(([, , row]) => /tag<\/button>|tag</.test(row ?? ""));
    assert.equal(tagRows.length, decisionAreaOrder.length, "one tag row per area");
    for (const [, area, row] of tagRows) {
      const label = decisionAreaOrder.find((key) => key === area);
      assert.ok(label, `known area ${area}`);
      assert.match(row ?? "", new RegExp(`Copy ${decisionAreaLabel(label)} tag`), `${area}'s button is in its own row`);
    }
  });

  it("provides quick destination jump links that target matching section containers", async () => {
    const html = renderToStaticMarkup(await SharePage());

    const expectedAnchors = [
      { href: "#meeting-slack", label: "Meeting &amp; Slack formats" },
      { href: "#tickets-kanban", label: "Tickets &amp; Kanban" },
      { href: "#role-memos", label: "Team role memos" },
      { href: "#image-artifacts", label: "Slide images" },
    ];

    for (const { href, label } of expectedAnchors) {
      assert.match(html, new RegExp(`href="${href}"`));
      assert.match(html, new RegExp(label));
      const targetId = href.replace(/^#/, "");
      assert.match(html, new RegExp(`id="${targetId}"`));
    }
  });
});
