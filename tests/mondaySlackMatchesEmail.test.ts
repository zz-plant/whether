import assert from "node:assert/strict";
import { weeklyHeadline } from "../lib/report/reportEvidence";
import { formatWeekAnswer } from "../lib/report/briefArtifact";
import { describe, it } from "bun:test";
import { buildOperatingSnapshot } from "../lib/operatingState/snapshot";
import type { OperatingSnapshot } from "../lib/operatingState/types";
import { POLICY_OVERRIDE_CALL } from "../lib/report/reportCopy";
import { liveMacroSeries } from "./fixtures/reportFixtures";
import { snapshotData } from "../lib/snapshot";
import { macros, treasury as fixtureTreasury } from "./factories/exportFixtures";
import { mailedBriefText, postedBriefText } from "./fixtures/mondaySends";

/*
 * The Monday cron sends one week twice: the email to subscribers and the post to
 * every subscribed channel, from the same `OperatingSnapshot`. The email read the
 * snapshot's `WeeklyCallContract`; the post re-derived the call from the lead
 * area row and `assessment.description`, with no policy-override branch. So on a
 * week the two scores disagreed, the inbox said "the guidance is not changing
 * this week" and the channel printed the lead area's own action and pause line
 * beside it, while a comment above the post claimed it was "the email's call in
 * Slack's blocks". These pin that it is.
 */

const webhookUrls = ["https://hooks.slack.com/services/T0/B0/monday"];

/** The export fixture's reading, which the policy layer refuses: its two scores disagree. */
const overrideSnapshot = () =>
  buildOperatingSnapshot({
    treasury: fixtureTreasury,
    macroSeries: macros,
    now: new Date("2026-03-05T12:00:00.000Z"),
  });

/** The bundled reading, marked live and current, which the policy layer does not refuse. */
const ordinarySnapshot = () =>
  buildOperatingSnapshot({
    treasury: { ...snapshotData, isLive: true, record_date: "2026-08-28", fetched_at: "2026-08-28T12:00:00.000Z" },
    macroSeries: liveMacroSeries,
    now: new Date("2026-08-31T12:00:00.000Z"),
  });

/** The value printed after `label: ` on a line of its own, with any bullet stripped. */
const slot = (text: string, label: string): string | undefined => {
  for (const line of text.split("\n")) {
    const match = new RegExp(`^(?:• )?${label}: (.+)$`).exec(line);
    if (match) return match[1];
  }
  return undefined;
};

/** The post's first line without its bold marks: the week's answer, as the email's first line prints it. */
const postAnswer = (post: string) => (post.split("\n")[0] ?? "").replace(/^\*(.*)\*$/, "$1");

const assertSameCall = (post: string, mail: string, snapshot: OperatingSnapshot) => {
  const { weeklyCall } = snapshot;
  // Both open on the week's one headline action (`weeklyHeadline`) as one typed line,
  // "This week (Aug 28, 2026): …": the email since 2026-11-18, the post since 2026-11-25,
  // when it stopped printing it under a "Guidance" label below a title.
  assert.equal(postAnswer(post), mail.split("\n")[0] ?? "", "the post and the email open on the same line");
  assert.equal(postAnswer(post).replace(/^This week \([^)]+\): /, "This week: "), formatWeekAnswer(weeklyHeadline(weeklyCall).composed));
  assert.equal(slot(post, "Guidance"), undefined, "the guidance is the first line, not a slot");
  assert.equal(slot(mail, "Action now"), undefined, "the email prints no second headline");
  assert.equal(slot(post, "Pause if"), slot(mail, "Pause if"));
  assert.equal(slot(post, "Conditions change if"), slot(mail, "Conditions change if"));
  assert.equal(slot(post, "Conditions change if"), weeklyCall.callChangesIf);
  const headline = (weeklyCall.policyOverrideActive ? weeklyCall.actionNow : weeklyCall.currentCall).replace(/\.$/, "");
  assert.ok(postAnswer(post).toLowerCase().includes(headline.toLowerCase()), "the headline is the call, or a held week's action");
};

describe("the Monday Slack post carries the email's call", () => {
  it("on a week the policy layer holds the guidance", async () => {
    const now = new Date("2026-03-05T12:00:00.000Z");
    const snapshot = overrideSnapshot();
    assert.equal(snapshot.weeklyCall.policyOverrideActive, true, "the fixture is an override week");

    const post = await postedBriefText(snapshot, { webhookUrls, now });
    const mail = await mailedBriefText(snapshot, { now });

    assertSameCall(post, mail, snapshot);
    // Held first because the two scores disagree, so the post leads with that reason's lines.
    assert.equal(snapshot.assessment.policyAssessment.refusal.reasonCodes?.[0], "signals-disagree");
    const hold = POLICY_OVERRIDE_CALL["signals-disagree"];
    assert.equal(postAnswer(post).replace(/^This week \([^)]+\): /, "This week: "), formatWeekAnswer(`${hold.actionNow} ${hold.currentCall}`));
    assert.equal(slot(post, "Do now"), undefined, "the action is not repeated under a second label");
    assert.equal(slot(mail, "Pause if"), hold.pauseIf);
  });

  it("on an ordinary week", async () => {
    const now = new Date("2026-08-31T12:00:00.000Z");
    const snapshot = ordinarySnapshot();
    assert.equal(snapshot.weeklyCall.policyOverrideActive, false, "the fixture is an ordinary week");

    assertSameCall(await postedBriefText(snapshot, { webhookUrls, now }), await mailedBriefText(snapshot, { now }), snapshot);
  });
});
