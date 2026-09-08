import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  BRIEF_FORMATS,
  briefConditionEntries,
  formatBriefArtifact,
  parseBriefArtifact,
  resolveBriefUrl,
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
      assert.ok(!text.includes("Guardrail:"), `${format.id} printed an empty guardrail`);
      assert.ok(!text.includes("undefined"), `${format.id} leaked an undefined field`);
      assert.ok(!text.includes("risk appetite"), `${format.id} claimed a risk appetite it lacks`);
    }
  });

  it("gives the presentation frames the same conditions the formats print", () => {
    // The frames and the copy formats read one list. A slide the room is looking
    // at and the block someone pastes afterwards cannot name different
    // thresholds.
    const entries = briefConditionEntries(artifact);
    assert.deepEqual(
      entries.map((entry) => entry.label),
      ["Guardrail", "Reversal", "Clears when"],
    );

    const slack = formatBriefArtifact(artifact, "slack", origin);
    for (const entry of entries) {
      assert.ok(slack.includes(`${entry.label}: ${entry.value}`), `slack omits ${entry.label}`);
    }
  });

  it("drops a condition rather than labelling an empty one", () => {
    assert.deepEqual(
      briefConditionEntries({ ...artifact, reversal: undefined, clearsWhen: [] }).map((e) => e.label),
      ["Guardrail"],
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
});
