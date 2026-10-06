import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { isValidElement, type ReactNode } from "react";
import SharePage from "../app/share/page";
import { SharePageFormats } from "../app/share/sharePageFormats";
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

/** The props a page hands every `component` in its tree, read without rendering it. */
const propsHandedTo = <P,>(node: ReactNode, component: (props: P) => ReactNode): P[] => {
  if (Array.isArray(node)) return node.flatMap((child: ReactNode) => propsHandedTo(child, component));
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  const own = node.type === component && isValidElement<P>(node) ? [node.props] : [];
  return [...own, ...propsHandedTo(node.props.children, component)];
};

const shareOptions = async () => {
  const options = propsHandedTo(await SharePage(), SharePageFormats)[0]?.options ?? [];
  const textOf = (id: string) => {
    const option = options.find((candidate) => candidate.id === id);
    return option?.kind === "text" ? option.text : "";
  };
  return { options, textOf };
};

describe("/share current weekly artifact", () => {
  it("opens on the Slack post, built from the persisted call", async () => {
    const html = renderToStaticMarkup(await SharePage());

    assert.match(html, /Week of /);
    assert.match(html, /data-share-format="slack-post"/, "the server renders the format the page opens on");
    // The short post leads with the week's action, the line a channel acts on.
    assert.match(html, /Transmit the committed action\./);
    // The change condition under its own label, not the resume vocabulary.
    assert.match(html, /Conditions change if: Re-open only from the next committed snapshot\./);
    assert.doesNotMatch(html, /Macro signals.*operating posture/);
    assert.doesNotMatch(html, /Current regime and operating posture for the period/);
  });

  it("hands every other format the same persisted call, each under its own name", async () => {
    const { options, textOf } = await shareOptions();
    const fullBrief = textOf("full-brief");

    // The exports lead with the conditions label; "Posture" was the export header before the
    // 2026-09-22 copy pass renamed it, and is no longer a word the page prints.
    assert.match(fullBrief, /Conditions:/);
    assert.match(fullBrief, /Do now/);
    assert.match(fullBrief, /Pause if/);
    assert.match(fullBrief, /Transmit the committed action\./);
    // The meeting pack carries the Slack brief's per-area lines, resume line included.
    assert.match(textOf("meeting-pack"), /Resume when/);
    assert.match(textOf("meeting-pack"), /Share the persisted call exactly\./);
    // The pause line under its label carries the condition only, not the rule's own verb.
    assert.match(textOf("slack-post"), /Pause if: The snapshot cannot be read\./);

    // Two Slack texts, kept on purpose and named apart: the short post and the full brief.
    assert.notEqual(textOf("slack-post"), fullBrief);
    const labels = options.map((option) => option.label);
    assert.equal(new Set(labels).size, labels.length, "no two formats share a name");
    for (const label of ["Slack post", "Full brief", "Meeting pack", "Investor update", "Portfolio note", "Work-item tags", "Role memos"]) {
      assert.ok(labels.includes(label), `offers ${label}`);
    }
  });

  it("offers the board slide as a file beside the images, and the investor update beside the copy formats", async () => {
    const html = renderToStaticMarkup(await SharePage());
    const { options } = await shareOptions();

    assert.match(html, /href="\/api\/export\/board-slide\?format=pptx&amp;stage=seed"/);
    assert.match(html, /href="\/api\/export\/board-slide\?format=pdf&amp;stage=seed"/);
    assert.match(html, /Download PPTX/);
    assert.match(html, /Download PDF/);
    // Every format is named in the picker the server renders, and each copy action says what it copies.
    assert.match(html, />Investor update</);
    assert.match(html, />Portfolio note</);
    const copyLabel = (id: string) => {
      const option = options.find((candidate) => candidate.id === id);
      return option && option.kind !== "panel" ? option.copyLabel : "";
    };
    assert.equal(copyLabel("investor-update"), "Copy investor update");
    assert.equal(copyLabel("portfolio-note"), "Copy portfolio note");
  });

  /* DD-037: each area's tag button sits in that area's row, not in a row of five under the table. */
  it("puts each area's tag button in that area's row", async () => {
    const { options } = await shareOptions();
    const tags = options.find((option) => option.id === "work-item-tags");
    assert.ok(tags?.kind === "panel", "the work-item tags are a format of their own");
    const html = renderToStaticMarkup(<>{tags.content}</>);

    const tagRows = [...html.matchAll(/<tr[^>]*data-area="([^"]+)"[^>]*>([\s\S]*?)<\/tr>/g)].filter(([, , row]) => /tag<\/button>|tag</.test(row ?? ""));
    assert.equal(tagRows.length, decisionAreaOrder.length, "one tag row per area");
    for (const [, area, row] of tagRows) {
      const label = decisionAreaOrder.find((key) => key === area);
      assert.ok(label, `known area ${area}`);
      assert.match(row ?? "", new RegExp(`Copy ${decisionAreaLabel(label)} tag`), `${area}'s button is in its own row`);
    }
  });

  /* DD-041: the formats were stacked sections, about 5,700px on desktop with the Slack text drawn
     three times. One picker now, under one heading; the files and the embed keep their own. */
  it("draws one picker under one heading, and keeps the anchors other pages land on", async () => {
    const html = renderToStaticMarkup(await SharePage());
    const { options } = await shareOptions();

    for (const id of ["copy-call-heading", "share-files-heading"]) {
      const heading = new RegExp(`<h2 id="${id}" class="([^"]*)"`).exec(html);
      assert.ok(heading, `${id} renders as an h2`);
      assert.doesNotMatch(heading[1] ?? "", /type-eyebrow/, `${id} is a heading, not a label`);
    }
    assert.equal((html.match(/Ready to paste/g) ?? []).length, 1, "one preview");
    for (const id of ["formats", "image-artifacts", "embed"]) assert.match(html, new RegExp(`id="${id}"`));
    // The stacked page's anchors open the format that lived there.
    for (const id of ["slack-post", "work-item-tags", "role-memos"]) {
      assert.ok(options.some((option) => option.id === id), `${id} is still a format`);
    }
  });
});
