import assert from "node:assert/strict";
import { DECISION_CONTRACT_LABELS } from "../lib/report/reportCopy";
import { describe, it } from "bun:test";
import { readFileSync } from "node:fs";
import { formatMeetingSlideMarkdown } from "../lib/export/meetingSlideExport";
import {
  BRIEF_FORMATS,
  MONDAY_AGENDA_STEPS,
  briefArtifactToSlidePayload,
  briefConditionEntries,
  formatBriefArtifact,
  parseBriefArtifact,
  resolveBriefUrl,
  resolveSharedBriefUrl,
  type BriefArtifact,
} from "../lib/report/briefArtifact";

const origin = "https://whether.work";

const artifact: BriefArtifact = {
  title: "Whether Weekly Brief",
  recordDateLabel: "2026-09-04",
  call: "Hold hiring at current headcount.",
  actionNow: "Stage offers behind the September close.",
  guardrail: "Funding pressure crosses 72",
  reversal: "Resume staged approvals when pressure falls below 60",
  clearsWhen: ["Funding pressure at or below 58"],
  regimeLabel: "Tightening",
  postureLabel: "Defensive",
  tightness: 64,
  riskAppetite: 55,
  confidenceLabel: "MED",
  source: "FRED",
};

describe("brief artifact formats", () => {
  it("keeps date, bounded conditions and provenance in every format", () => {
    for (const format of BRIEF_FORMATS) {
      const text = formatBriefArtifact(artifact, format.id, origin);
      const missing = [
        artifact.recordDateLabel,
        artifact.call,
        artifact.guardrail,
        artifact.reversal,
        artifact.clearsWhen?.[0],
        artifact.source,
        "64",
      ]
        .filter((field): field is string => typeof field === "string")
        .filter((field) => !text.includes(field));

      assert.deepEqual(missing, [], `${format.id} format dropped: ${missing.join(", ")}`);
    }
  });

  it("cites the frozen record when the archive has a current one", () => {
    const withPermalink = { ...artifact, permalinkPath: "/brief/2026-w36" };
    assert.equal(resolveBriefUrl(withPermalink, origin), `${origin}/brief/2026-w36`);
    assert.match(formatBriefArtifact(withPermalink, "citation", origin), /Permanent record\./);
  });

  it("refuses to imply a permanent record when none was published", () => {
    // `/` re-renders weekly under one address. `data/published_briefs.json` holds
    // one record and is deliberately never backfilled, so this is the common case,
    // not the edge one.
    const citation = formatBriefArtifact(artifact, "citation", origin);
    assert.equal(resolveBriefUrl(artifact, origin), `${origin}/`);
    assert.match(citation, /re-renders each week/);
    assert.ok(!citation.includes("Permanent record."));
  });

  it("marks a snapshot read as one wherever the brief is pasted", () => {
    const cached = { ...artifact, isFallback: true };
    for (const format of BRIEF_FORMATS) {
      assert.match(
        formatBriefArtifact(cached, format.id, origin),
        /cached snapshot, not a live read/,
        `${format.id} format hides that the reading was cached`,
      );
    }
  });

  it("omits absent fields rather than printing empty labels", () => {
    const sparse: BriefArtifact = {
      title: "Whether Weekly Brief",
      recordDateLabel: "2026-09-04",
      call: "Hold.",
      regimeLabel: "Tightening",
      tightness: 64,
      source: "FRED",
    };

    for (const format of BRIEF_FORMATS) {
      const text = formatBriefArtifact(sparse, format.id, origin);
      assert.ok(!text.includes(`${DECISION_CONTRACT_LABELS.threshold.pauseIf}:`), `${format.id} printed an empty pause line`);
      assert.ok(!text.includes("undefined"), `${format.id} leaked an undefined field`);
      assert.ok(!text.includes("risk appetite"), `${format.id} claimed a risk appetite it lacks`);
    }
  });

  it("gives the presentation frames the same conditions the formats print", () => {
    // The frames and the copy formats read one list. A slide the room is looking
    // at and the block someone pastes afterwards cannot name different
    // thresholds.
    const entries = briefConditionEntries(artifact);
    /* Three lines, three names, and the same three names the hero prints —
       these used to read "Guardrail / Reversal / Clears when" against the
       plan page's "Pause if / Resume when" for the same numbers. */
    assert.deepEqual(
      entries.map((entry) => entry.label),
      [
        DECISION_CONTRACT_LABELS.threshold.pauseIf,
        DECISION_CONTRACT_LABELS.watch.postureFlips,
        DECISION_CONTRACT_LABELS.reversal.resumeWhen,
      ],
    );

    const slack = formatBriefArtifact(artifact, "slack", origin);
    for (const entry of entries) {
      assert.ok(slack.includes(`${entry.label}: ${entry.value}`), `slack omits ${entry.label}`);
    }
  });

  it("drops a condition rather than labelling an empty one", () => {
    assert.deepEqual(
      briefConditionEntries({ ...artifact, reversal: undefined, clearsWhen: [] }).map((e) => e.label),
      [DECISION_CONTRACT_LABELS.threshold.pauseIf],
    );
  });

  it("does not restate the call as the action when they are the same sentence", () => {
    const restated = { ...artifact, actionNow: artifact.call };
    for (const format of BRIEF_FORMATS) {
      const text = formatBriefArtifact(restated, format.id, origin);
      assert.ok(
        !text.includes("Do now:"),
        `${format.id} printed the call twice, once as the action`,
      );
      assert.ok(text.includes(artifact.call), `${format.id} dropped the call`);
    }
  });

  it("still carries a distinct action", () => {
    const slack = formatBriefArtifact(artifact, "slack", origin);
    assert.ok(slack.includes(`Do now: ${artifact.actionNow}`));
  });

  it("rejects an island missing a field every format prints", () => {
    assert.equal(parseBriefArtifact("not json"), null);
    assert.equal(parseBriefArtifact("null"), null);
    assert.equal(parseBriefArtifact(JSON.stringify({ ...artifact, call: undefined })), null);
    assert.equal(parseBriefArtifact(JSON.stringify({ ...artifact, tightness: "64" })), null);
    assert.equal(parseBriefArtifact(JSON.stringify({ ...artifact, source: "" })), null);
  });

  it("accepts an island carrying only the required fields", () => {
    const minimal = {
      title: "Whether Weekly Brief",
      recordDateLabel: "2026-09-04",
      call: "Hold.",
      regimeLabel: "Tightening",
      source: "FRED",
      tightness: 64,
    };
    const parsed = parseBriefArtifact(JSON.stringify(minimal));
    assert.ok(parsed);
    assert.equal(parsed.title, minimal.title);
    assert.equal(parsed.recordDateLabel, minimal.recordDateLabel);
    assert.equal(parsed.call, minimal.call);
    assert.equal(parsed.regimeLabel, minimal.regimeLabel);
    assert.equal(parsed.source, minimal.source);
    assert.equal(parsed.tightness, minimal.tightness);
    assert.equal(parsed.guardrail, undefined);
    assert.equal(parsed.isFallback, false);
  });

  it("rebuilds the artifact field by field rather than trusting the island", () => {
    // The parsed object becomes text people paste into their own channels, so a
    // malformed island must not smuggle fields through, and a half-written entry
    // in a list must not reach a slide as a blank row.
    const parsed = parseBriefArtifact(
      JSON.stringify({
        ...artifact,
        smuggled: "not a field of the contract",
        clearsWhen: ["Funding pressure at or below 58", 42, ""],
        revisit: [
          { label: "Hiring", recheck: "Recheck approvals." },
          { label: "Burn discipline" },
          "not an object",
        ],
        riskAppetite: Number.NaN,
      }),
    );

    assert.ok(parsed);
    assert.ok(!("smuggled" in parsed));
    assert.deepEqual(parsed.clearsWhen, ["Funding pressure at or below 58"]);
    assert.deepEqual(parsed.revisit, [{ label: "Hiring", recheck: "Recheck approvals." }]);
    assert.equal(parsed.riskAppetite, undefined);
  });

  it("gives both slide controls the same markdown for the same week", () => {
    // `CopyMeetingSlideButton` and the share panel's "Slide" format built their
    // own blocks from the same call: the panel's carried the resume thresholds
    // and a link, the button's carried neither. They compose through one builder
    // now, and this is what stops a second one appearing.
    const viaPanel = formatBriefArtifact(artifact, "slide", origin);
    const viaButton = formatMeetingSlideMarkdown(briefArtifactToSlidePayload(artifact, origin));
    assert.equal(viaPanel, viaButton);
  });

  it("keeps the slide's stance line distinct from its action", () => {
    const slide = formatBriefArtifact(artifact, "slide", origin);
    assert.match(slide, /\*\*CALL\*\*: Hold hiring at current headcount\./);
    assert.match(slide, /\*\*ACTION NOW\*\*: Stage offers behind the September close\./);

    // On a week where the model has no stage-scoped action the two hold the same
    // sentence, and the slide states it once.
    const restated = formatBriefArtifact({ ...artifact, actionNow: artifact.call }, "slide", origin);
    assert.ok(!restated.includes("**CALL**:"));
  });

  it("keeps the weekly call defined in one place", () => {
    // The hero assembled its own `MeetingSlidePayload` literal, with its own
    // fallback copy for the pause and reversal lines — a second definition of
    // the week sitting beside the route that publishes it.
    const hero = readFileSync("app/components/DecisionHero.tsx", "utf8");
    assert.ok(
      !hero.includes("changeCourseIf:"),
      "the hero must not assemble an export payload of its own",
    );
  });

  it("marks the link a channel paste carries as a share, and leaves the citation's alone", () => {
    // A reader who follows the Slack or agenda link is a teammate's referral,
    // and `/` greets them as one (`?ref=share`). A citation names the canonical
    // address: a tracking query in a footnote is noise, and the frozen record
    // it points at re-renders nothing.
    assert.equal(resolveSharedBriefUrl(artifact, origin), `${origin}/?ref=share`);
    assert.equal(
      resolveSharedBriefUrl({ ...artifact, permalinkPath: "/brief/2026-w36" }, origin),
      `${origin}/brief/2026-w36?ref=share`,
    );
    assert.match(formatBriefArtifact(artifact, "slack", origin), /Full brief: https:\/\/whether\.work\/\?ref=share/);
    assert.match(formatBriefArtifact(artifact, "agenda", origin), /Full brief: https:\/\/whether\.work\/\?ref=share/);
    assert.ok(!formatBriefArtifact(artifact, "citation", origin).includes("ref=share"));
  });

  it("lays the agenda out as the three timed steps, with the conditions under the one that checks them", () => {
    const agenda = formatBriefArtifact(artifact, "agenda", origin);
    const lines = agenda.split("\n");

    assert.match(lines[0], /^### .* \(3 min\) — 2026-09-04$/);
    assert.equal(lines[1], `**Operating call:** ${artifact.call} (${artifact.regimeLabel})`);

    for (const [index, step] of MONDAY_AGENDA_STEPS.entries()) {
      assert.ok(
        agenda.includes(`${index + 1}. **${step.label}** (${step.minutes} min) — ${step.prompt}`),
        `agenda lost step ${index + 1}: ${step.label}`,
      );
    }

    // The bounded conditions are indented under "Check the thresholds", not
    // floated above the steps, so a room reads them at the minute they apply.
    const thresholdsLine = lines.findIndex((line) => line.includes("**Check the thresholds**"));
    const revisitLine = lines.findIndex((line) => line.includes("**Decide what to revisit**"));
    assert.ok(thresholdsLine > 0 && revisitLine > thresholdsLine);
    const under = lines.slice(thresholdsLine + 1, revisitLine);
    for (const entry of briefConditionEntries(artifact)) {
      assert.ok(under.includes(`   - ${entry.label}: ${entry.value}`), `${entry.label} is not under the thresholds step`);
    }
    assert.ok(under.some((line) => line.startsWith("   - Scores: Funding pressure 64/100")));
  });
});
