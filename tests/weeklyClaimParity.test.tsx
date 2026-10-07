import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";
import { isValidElement, type ReactNode } from "react";
import type { unstable_cache } from "next/cache";
import { buildBriefEmbedData, buildBriefEmbedText } from "../app/api/embed/route";
import { buildBriefImagePayload } from "../app/api/image/brief/route";
import { buildBriefMarkdown } from "../app/brief.md/route";
import SharePage from "../app/share/page";
import { SharePageFormats } from "../app/share/sharePageFormats";
import { buildAgentState } from "../lib/agentState";
import { loadAgentInterfaceContext } from "../lib/agentInterface";
import { formatGuidance } from "../lib/export/briefBuilders";
import { sendWeeklyBrief } from "../lib/email/sendWeeklyBrief";
import { getSubscriberStore, resetSubscriberStore } from "../lib/email/subscriberStore";
import { macroSeries } from "../lib/macroSnapshot";
import { buildOperatingSnapshot } from "../lib/operatingState/snapshot";
import { resetOperatingSnapshotStore } from "../lib/operatingState/snapshotStore";
import type { OperatingSnapshot } from "../lib/operatingState/types";
import { getRegimePublicLabel, REGIME_SEVERITY_RANK } from "../lib/regimePresentation";
import { briefSourceFromReportData, buildBriefDocument } from "../lib/report/briefDocument";
import { buildChangedLead } from "../lib/report/decisionMovement";
import { buildFlipProximity } from "../lib/report/flipProximity";
import { buildHomeQuietDayRead } from "../lib/report/home/homeSectionModel";
import { describeWeeklyMemoLead } from "../lib/report/homeBrief/decisionNarrative";
import { buildDecisionMemo, deriveBriefCallFields } from "../lib/report/homeBrief/briefArtifactBuilder";
import { createHomePageReportDataLoader } from "../lib/report/homePageData";
import { assembleHomePage } from "../lib/report/homePageAssembler";
import { assembleCurrentWeekBrief } from "../lib/report/publishedBriefRecord";
import { describePolicyHold } from "../lib/report/regimeDescription";
import { formatConfidenceChipLabel } from "../lib/report/reportFormatting";
import {
  anyPauseLineMet,
  buildCallChangeLine,
  buildCallChangeLines,
  buildFlipThreshold,
  buildWeekCallChangesIf,
  resolveWeeklyTone,
  splitWeeklyCall,
} from "../lib/report/reportEvidence";
import { buildWeeklyBriefSnapshot } from "../lib/report/weeklyBriefSnapshot";
import { deliverSlackBrief } from "../lib/slack/deliverSlackBrief";
import { snapshotData } from "../lib/snapshot";
import type { MacroSeriesReading, TreasuryData } from "../lib/types";
import { macros, treasury as fixtureTreasury } from "./factories/exportFixtures";

/*
 * One week, one set of claims, every surface (docs/claims-ledger.md).
 *
 * Each claim a reader can act on has one builder, and every surface that prints
 * the claim prints that builder's value: the homepage card and its quiet-day line,
 * the share card, /brief.md, the embed, the brief document every paste renders, the
 * agent state, the /share standup line, the /api/decision memo, the frozen archive
 * record, and the Monday Slack post and email. Until 2026-10-07 the week's action had
 * three builders. On an ordinary week the pastes led with the lead area's rule while
 * the page, the embed and the card led with the week's headline; on a held week the
 * agent state said "Conditions are easing. Grow what is working" beside a hold, and
 * the page held in other words than the pastes. Then what would change the guidance
 * had two: the standup and the quiet-day line said the nearest market move ("0.22%
 * from flip") where every other surface said the nearer line was 9 points away, and on
 * a held week a rate move where the hold's own condition belonged.
 *
 * A claim a surface does not print is not forced onto it: the share card prints the
 * action and no call; the email prints the action and no call; the Monday sends,
 * built from the operating snapshot alone, carry no earlier reading.
 */

const uncached: typeof unstable_cache = (load) => load;
const originalFetch = globalThis.fetch;
const NOW = new Date("2026-10-05T12:00:00.000Z");
const webhookUrls = ["https://hooks.slack.com/services/T0/B0/parity"];

afterEach(() => {
  globalThis.fetch = originalFetch;
  resetOperatingSnapshotStore();
  resetSubscriberStore();
});

const thisWeek = {
  record_date: "2026-10-05",
  fetched_at: "2026-10-05T12:00:00.000Z",
  isLive: true,
  fallback_at: undefined,
  fallback_reason: undefined,
};

const weeks: Array<{ name: string; treasury: TreasuryData; macroSeries: MacroSeriesReading[]; held: boolean }> = [
  { name: "an ordinary week", treasury: { ...snapshotData, ...thisWeek }, macroSeries, held: false },
  /* The export fixture's reading: its two scores disagree, so the policy layer holds it. */
  { name: "a held week", treasury: { ...fixtureTreasury, ...thisWeek }, macroSeries: macros, held: true },
];

/** The props a page hands every `component` in its tree, read without rendering it. */
const propsHandedTo = <P,>(node: ReactNode, component: (props: P) => ReactNode): P[] => {
  if (Array.isArray(node)) return node.flatMap((child: ReactNode) => propsHandedTo(child, component));
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  const own = node.type === component && isValidElement<P>(node) ? [node.props] : [];
  return [...own, ...propsHandedTo(node.props.children, component)];
};

/** The value printed after `label: ` on a line of its own, with any bullet stripped. */
const slot = (text: string, label: string): string | undefined => {
  for (const line of text.split("\n")) {
    const match = new RegExp(`^(?:• )?${label}: (.+)$`).exec(line);
    if (match) return match[1];
  }
  return undefined;
};

/** The Monday post's text, as the webhook receives it. */
const postedText = async (snapshot: OperatingSnapshot): Promise<string> => {
  let body = "";
  const capture = async (_url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    body = typeof init?.body === "string" ? init.body : "";
    return new Response("ok", { status: 200 });
  };
  const result = await deliverSlackBrief({ webhookUrls, snapshot, now: NOW, fetchImpl: capture, force: true });
  assert.equal(result.status, "posted", result.error);
  const parsed: unknown = JSON.parse(body);
  const blocks = typeof parsed === "object" && parsed !== null ? Reflect.get(parsed, "blocks") : undefined;
  assert.ok(Array.isArray(blocks));
  return blocks
    .map((block: unknown) => {
      const text = typeof block === "object" && block !== null ? Reflect.get(block, "text") : undefined;
      const value = typeof text === "object" && text !== null ? Reflect.get(text, "text") : undefined;
      return typeof value === "string" ? value : "";
    })
    .join("\n");
};

/** The Monday email's plain text, to one verified subscriber. */
const mailedText = async (snapshot: OperatingSnapshot): Promise<string> => {
  resetSubscriberStore();
  const store = getSubscriberStore();
  const subscriber = await store.subscribe("operator@example.com");
  await store.verifyEmail(subscriber.confirmToken ?? "");
  const sent: string[] = [];
  const previousBinding = Reflect.get(globalThis, "EMAIL");
  Reflect.set(globalThis, "EMAIL", {
    send: async (message: { text: string }) => {
      sent.push(message.text);
    },
  });
  try {
    const result = await sendWeeklyBrief({ snapshot, weeklyCall: snapshot.weeklyCall, now: NOW, force: true });
    assert.equal(result.sent, 1, result.error);
  } finally {
    if (previousBinding === undefined) Reflect.deleteProperty(globalThis, "EMAIL");
    else Reflect.set(globalThis, "EMAIL", previousBinding);
  }
  assert.ok(sent[0], "the one subscriber was mailed");
  return sent[0];
};

/** Every surface, from one stored reading. */
const renderWeek = async (treasury: TreasuryData, readings: MacroSeriesReading[]) => {
  const snapshot = buildOperatingSnapshot({ treasury, macroSeries: readings, now: NOW });
  await resetOperatingSnapshotStore().write(snapshot);
  globalThis.fetch = async () => {
    throw new Error("every surface reads the stored operating snapshot; nothing here reads the network");
  };
  const home = await assembleHomePage({}, { loadHomePageReportData: createHomePageReportDataLoader({ unstableCache: uncached }) });
  assert.ok(home.reportResult.ok, "the stored snapshot is a live reading");
  const reportData = home.reportResult.data;
  const embed = buildBriefEmbedData(home, { ticker: "", ref: "parity", companyStage: null });
  const share = propsHandedTo(await SharePage(), SharePageFormats)[0];
  assert.ok(share, "/share renders its format picker");
  const frozen = await assembleCurrentWeekBrief({ now: NOW });
  assert.ok(frozen.ok, "the week is publishable");
  return {
    home,
    reportData,
    document: buildBriefDocument(briefSourceFromReportData(reportData), home.weeklyCall),
    markdown: buildBriefMarkdown(home),
    embedText: buildBriefEmbedText(embed),
    card: buildBriefImagePayload(home),
    agent: buildAgentState(await loadAgentInterfaceContext("claim-parity")),
    memo: buildDecisionMemo(home),
    standup: share.options.flatMap((option) => (option.id === "standup" && option.kind === "text" ? [option.text] : []))[0] ?? "",
    quietDay: buildHomeQuietDayRead(home, { historical: false }),
    record: frozen.record,
    slack: await postedText(snapshot),
    email: await mailedText(snapshot),
  };
};

/* One render per week, read by every case: the sends and the share page are the slow part. */
const rendered = new Map<string, ReturnType<typeof renderWeek>>();
const render = (week: (typeof weeks)[number]) => {
  const cached = rendered.get(week.name);
  if (cached) return cached;
  const fresh = renderWeek(week.treasury, week.macroSeries);
  rendered.set(week.name, fresh);
  return fresh;
};

describe("one week, one set of claims, every surface", () => {
  for (const week of weeks) {
    describe(week.name, () => {
      it("is the week it says it is", async () => {
        const { reportData } = await render(week);
        assert.equal(reportData.assessment.policyAssessment.refusal.refused, week.held);
      });

      it("names the same conditions everywhere", async () => {
        const { reportData, home, document, markdown, embedText, card, agent, slack, email } = await render(week);
        const conditions = getRegimePublicLabel(reportData.assessment.regime);

        assert.ok((home.weeklyDecisionCardModel.status.postureWithStageLabel ?? "").startsWith(conditions));
        assert.equal(document.conditions.label, conditions);
        assert.equal(agent.conditions.label, conditions);
        assert.equal(getRegimePublicLabel(card.regime), conditions);
        assert.match(markdown, new RegExp(`\\*\\*Conditions:\\*\\* ${conditions}`));
        assert.match(embedText, new RegExp(`^Conditions: ${conditions} `, "m"));
        assert.match(slack, new RegExp(`^Conditions: ${conditions} `, "m"), "the Monday post");
        assert.match(email, new RegExp(`^Conditions: ${conditions} `, "m"), "the Monday email");
      });

      it("gives the same guidance everywhere", async () => {
        const { home, document, markdown, embedText, card, agent, memo, record, slack, email } = await render(week);
        const { actionNow } = home.weeklyCall;
        const guidance = formatGuidance(home.weeklyCall);

        assert.equal(formatGuidance(document.slots), guidance, "the brief document every paste renders");
        assert.ok(markdown.includes(guidance), "/brief.md");
        assert.ok(embedText.includes(`Guidance: ${guidance}`), `the embed:\n${embedText}\nexpected: ${guidance}`);
        assert.equal(deriveBriefCallFields(home.weeklyDecisionCardModel).primaryCall, actionNow, "the homepage card");
        assert.equal(card.decision, actionNow, "the share card");
        assert.equal(agent.guidance.call, actionNow, "the agent state");
        assert.equal(memo.action, actionNow, "the /api/decision memo");
        assert.equal(record.actionNow, actionNow, "the frozen record");
        assert.equal(slot(slack, "Guidance"), guidance, "the Monday post");
        assert.equal(slot(email, "Action now"), actionNow, "the Monday email");
      });

      it("dates and grades the reading the same everywhere", async () => {
        const { reportData, home, document, markdown, embedText, agent, memo, record, slack } = await render(week);
        const recordDate = reportData.treasury.record_date;
        const confidence = home.weeklyDecisionCardModel.status.confidenceLabel;

        assert.equal(document.provenance.recordDate, recordDate);
        assert.equal(agent.recordDate, recordDate);
        assert.match(markdown, new RegExp(`^# Whether Weekly Brief — ${recordDate}$`, "m"));
        assert.match(embedText, new RegExp(`As of ${recordDate}`));
        assert.equal(record.recordDate, recordDate, "the frozen record");
        assert.match(slack, new RegExp(`^Whether Weekly Brief — ${recordDate}$`, "m"), "the Monday post");
        assert.equal(agent.confidence.label, confidence);
        assert.ok(embedText.includes(formatConfidenceChipLabel(confidence)));
        assert.equal(memo.confidence, confidence, "the /api/decision memo");
        assert.equal(record.confidenceLabel, confidence, "the frozen record");
      });

      /* The guidance's second sentence. The memo printed the home model's own until
         2026-10-07, and the frozen record too: on this ordinary week "Ship fixes and
         releases that pay back quickly; hold anything you could not reverse." beside
         every paste's "Favour releases that pay back quickly and can be rolled back.",
         because the stored call was composed without the week's change of conditions. */
      it("states the same call everywhere", async () => {
        const { reportData, home, document, markdown, embedText, memo, record, slack } = await render(week);
        const { currentCall } = home.weeklyCall;

        assert.equal(document.slots.currentCall, currentCall, "the brief document every paste renders");
        assert.ok(markdown.includes(currentCall), "/brief.md");
        assert.ok(embedText.includes(currentCall), "the embed");
        assert.equal(home.weeklyDecisionCardModel.decision.operatingStanceLine, currentCall, "the homepage card");
        assert.equal(memo.weeklyMemoLines[1], currentCall, "the /api/decision memo");
        assert.equal(record.summary, currentCall, "the frozen record");
        assert.ok(slot(slack, "Guidance")?.endsWith(currentCall), "the Monday post");
        /* The read path composes the same call when no snapshot is stored to project. */
        const composed = buildWeeklyBriefSnapshot({ reportData: { ...reportData, projectsOperatingSnapshot: false }, degraded: false });
        assert.equal(composed.weeklyCall.currentCall, currentCall, "the call the read path composes");
      });

      /* The agent state's `change.direction` is the comparison's own label
         (improving, deteriorating, mixed, stable), not the headline's tone: it reads
         "mixed" on the ordinary week beside "Conditions are tightening.". Whether that
         field should carry the tone is the owner's call (an API change), so it is not
         held here. */
      it("states the week's direction by the headline's rule", async () => {
        const { reportData, home, memo } = await render(week);
        const { assessment, reportDynamics } = reportData;
        const tone = resolveWeeklyTone({
          directionLabel: reportDynamics.directionLabel,
          regimeChanged: reportDynamics.regimeChanged,
          ...(reportDynamics.previousRegime ? { previousRegime: reportDynamics.previousRegime } : {}),
          regime: assessment.regime,
          pauseApplies: anyPauseLineMet(reportData.actionStripItems, assessment.scores),
        });
        assert.ok(tone, "both weeks are compared");
        const card = splitWeeklyCall(deriveBriefCallFields(home.weeklyDecisionCardModel).primaryCall);
        const status = home.weeklyDecisionCardModel.status;

        /* The memo says what the readings did on both weeks; a held week's headline is
           the hold, which states no direction. */
        assert.equal(memo.weeklyMemoLines[0], describeWeeklyMemoLead(status.trendLabel, tone), "the /api/decision memo");
        if (week.held) {
          assert.equal(card.directionLabel, undefined, "the homepage card");
          assert.equal(status.weeklyTone, null, "the sticky strip's badge");
          return;
        }
        assert.ok(home.weeklyCall.actionNow.startsWith(`Conditions are ${tone}. `), "the headline every surface prints");
        assert.equal(card.directionLabel, `${tone.charAt(0).toUpperCase()}${tone.slice(1)} this week`, "the homepage card");
        assert.equal(status.weeklyTone, tone, "the sticky strip's badge");
        /* A change of conditions reads the way the conditions moved. */
        if (reportDynamics.previousRegime) {
          const harsher = REGIME_SEVERITY_RANK[assessment.regime] > REGIME_SEVERITY_RANK[reportDynamics.previousRegime];
          assert.equal(tone === "tightening", harsher);
        }
      });

      /* The Monday sends print no comparison: the operating snapshot they are built
         from carries no earlier reading (`briefSourceFromSnapshot`). Held here as an
         absence, so a send that starts printing one has to print this one. */
      it("compares the week with the same reading everywhere", async () => {
        const { reportData, home, document, markdown, card, agent, memo, record, slack, email } = await render(week);
        const comparedWith = reportData.reportDynamics.comparedWith;
        assert.ok(comparedWith, "both weeks are compared");
        const { label } = comparedWith;

        assert.deepEqual(home.weeklyDecisionCardModel.decision.reportDynamics.comparedWith, comparedWith, "the homepage card");
        assert.ok(home.weeklyDecisionCardModel.decision.decisionMovement?.sentence.includes(label), "the homepage's what-changed lead");
        assert.deepEqual(document.readings.previous?.comparedWith, comparedWith, "the brief document every paste renders");
        for (const reading of card.readings) assert.ok(reading.previous?.endsWith(`on ${label}`), `the share card: ${reading.previous}`);
        assert.ok(markdown.includes(`vs ${label}`), "/brief.md");
        assert.deepEqual(agent.change.comparedWith, comparedWith, "the agent state");
        assert.ok(memo.decisionShift.includes(label), "the /api/decision memo");
        assert.deepEqual(record.scores?.comparedWith, comparedWith, "the frozen record");
        for (const text of [slack, email]) {
          assert.doesNotMatch(text, /\bsince [A-Z][a-z]{2} \d{1,2}\b|\bwas \d+ on\b|\bvs [A-Z][a-z]{2} \d{1,2}\b/i, "the Monday sends");
        }
      });

      it("prints the same two scores, as whole numbers", async () => {
        const { reportData, home, document, card, agent, record, slack, email } = await render(week);
        const { tightness, riskAppetite } = reportData.assessment.scores;
        assert.ok(Number.isInteger(tightness) && Number.isInteger(riskAppetite), "the scores are published whole");

        assert.deepEqual(
          [document.readings.scores.tightness, document.readings.scores.riskAppetite],
          [tightness, riskAppetite],
          "the brief document every paste renders",
        );
        const { currentScores } = home.weeklyDecisionCardModel.diagnostics;
        assert.deepEqual([currentScores.tightness, currentScores.riskAppetite], [tightness, riskAppetite], "the homepage card");
        assert.deepEqual(card.readings.map((reading) => reading.value), [String(tightness), String(riskAppetite)], "the share card");
        assert.deepEqual([agent.scores.tightness.value, agent.scores.riskAppetite.value], [tightness, riskAppetite], "the agent state");
        assert.ok(agent.headline.includes(`Funding pressure ${tightness} `) && agent.headline.includes(`risk appetite ${riskAppetite} `));
        assert.deepEqual([record.scores?.tightness, record.scores?.riskAppetite], [tightness, riskAppetite], "the frozen record");
        assert.ok(slack.includes(`Funding pressure ${tightness} of 100`) && slack.includes(`Risk appetite ${riskAppetite} of 100`), "the Monday post");
        assert.ok(email.includes(`Funding pressure: ${tightness}/100`) && email.includes(`Risk appetite: ${riskAppetite}/100`), "the Monday email");
      });

      it("says what would change the guidance through one builder", async () => {
        const { reportData, home, document, markdown, embedText, agent, memo, standup, quietDay, record, slack, email } =
          await render(week);
        const { assessment } = reportData;
        const { callChangesIf } = home.weeklyCall;
        const label = "Conditions change if";

        assert.equal(callChangesIf, buildWeekCallChangesIf(assessment), "the contract states the claim's builder");
        assert.equal(document.slots.callChangesIf, callChangesIf, "the brief document every paste renders");
        assert.ok(markdown.includes(`**${label}:** ${callChangesIf}`), "/brief.md");
        assert.ok(embedText.includes(`${label}: ${callChangesIf}`), "the embed");
        assert.equal(slot(slack, label), callChangesIf, "the Monday post");
        assert.equal(slot(email, label), callChangesIf, "the Monday email");
        const decision = home.weeklyDecisionCardModel.decision;
        assert.equal(decision.reversalTrigger, callChangesIf, "the homepage card");
        assert.ok(deriveBriefCallFields(home.weeklyDecisionCardModel).briefShareLines.includes(`${label}: ${callChangesIf}`), "Copy Brief");
        assert.equal(reportData.flipThreshold, callChangesIf, "/trust, /signals and /resolve");
        assert.equal(record.flipThreshold, callChangesIf, "the frozen record");
        assert.equal(memo.reversalTrigger, callChangesIf, "the /api/decision memo's trigger");
        assert.deepEqual(memo.watchItems, [callChangesIf], "the /api/decision memo's watch items");
        assert.ok(memo.decisionShift.endsWith(`${label}: ${callChangesIf}`), `the /api/decision memo's shift: ${memo.decisionShift}`);
        if (home.weeklyDecisionCardModel.status.transitionWatch === "OFF") {
          assert.ok(memo.weeklyMemoLines[2]?.endsWith(`${label}: ${callChangesIf}`), "the /api/decision memo's lines");
        }

        /* The one-line surfaces: the nearer line in points, a clause of the sentence,
           or on a held week the hold's own condition. */
        const callChangeLine = buildCallChangeLine({ weeklyCall: home.weeklyCall, assessment });
        assert.ok(standup.endsWith(` ${callChangeLine}`), `the /share standup line: ${standup}`);
        assert.doesNotMatch(standup, /%|flip/i, "the standup line in points, without engine words");
        if (week.held) {
          assert.equal(callChangeLine, `${label}: ${callChangesIf}`);
          assert.deepEqual(agent.guidance.flipConditions, [callChangesIf], "the agent state");
          /* The quiet-day line, and the lead it closes. */
          assert.equal(quietDay, `${label}: ${callChangesIf}`, "the homepage quiet-day line");
          const lead = buildChangedLead({ movement: decision.decisionMovement, quietDayLine: quietDay, fallback: "unused" });
          assert.ok(lead.endsWith(` ${label}: ${callChangesIf}`), "the homepage's what-changed lead");
          /* No surface says what moves the conditions in place of the hold. */
          assert.deepEqual(buildFlipProximity(assessment), [], "the homepage's interest-rate terms");
          const lines = buildFlipThreshold(assessment);
          for (const [surface, text] of Object.entries({ markdown, embedText, slack, email, standup, memo: JSON.stringify(memo), agent: JSON.stringify(agent) })) {
            assert.ok(!text.includes(lines), `${surface} prints the conditions' lines where the hold's condition belongs`);
          }
          return;
        }
        const lines = buildCallChangeLines(assessment);
        const nearest = [...lines].sort((left, right) => (left.distance ?? 0) - (right.distance ?? 0))[0];
        assert.ok(nearest);
        assert.equal(callChangeLine, `${label}: ${nearest.text}.`);
        assert.ok(callChangesIf.toLowerCase().includes(nearest.text.toLowerCase()), "a clause of the sentence");
        assert.deepEqual(
          [...agent.guidance.flipConditions].sort(),
          lines.map((line) => line.boundary).sort(),
          "the agent state names the sentence's lines",
        );
        /* The guidance moved this week, so the homepage prints no quiet-day line. */
        assert.equal(decision.weeklyLeadershipSummary.guidanceChange, "conditions");
        assert.equal(quietDay, null, "the homepage quiet-day line");
        /* The interest-rate terms translate the sentence's lines, in its order. */
        const untripped = lines.filter((line) => !line.tripped).map((line) => line.metric);
        const translated = buildFlipProximity(assessment).map((entry) => entry.axis);
        assert.deepEqual(translated, untripped.filter((metric) => translated.includes(metric)), "the homepage's interest-rate terms");
      });

      it(week.held ? "says why the week holds in the hold's own words" : "states no hold", async () => {
        const { reportData, home, document, markdown, embedText, card, agent, memo, standup, record, slack, email } = await render(week);
        const { refusal } = reportData.assessment.policyAssessment;
        if (!week.held) {
          assert.equal(home.weeklyCall.policyOverrideActive, false);
          for (const text of [markdown, embedText, slack, email, standup]) assert.doesNotMatch(text, /not changing this week|on hold/);
          return;
        }
        const hold = describePolicyHold(refusal);

        assert.deepEqual(
          [home.weeklyCall.actionNow, home.weeklyCall.currentCall, home.weeklyCall.pauseIf, home.weeklyCall.callChangesIf],
          [hold.actionNow, hold.currentCall, hold.pauseIf, hold.callChangesIf],
          "the weekly contract",
        );
        assert.equal(document.slots.whyCouldBeWrong, hold.whyCouldBeWrong, "the brief document every paste renders");
        assert.ok(markdown.includes(hold.currentCall) && markdown.includes(hold.holdsUntil), "/brief.md");
        assert.ok(embedText.includes(hold.currentCall), "the embed");
        /* The post's section stops at Slack's limit before its "Why this could be
           wrong" block on this week, so the hold's reason is the call's. */
        assert.ok(slack.includes(hold.currentCall), "the Monday post");
        assert.equal(slot(email, "Pause if"), hold.pauseIf, "the Monday email");
        assert.equal(card.decision, hold.actionNow, "the share card");
        assert.equal(agent.guidance.call, hold.actionNow, "the agent state");
        assert.equal(memo.guardrail, hold.pauseIf, "the /api/decision memo");
        assert.equal(record.summary, hold.currentCall, "the frozen record");
        assert.ok(standup.startsWith("Guidance on hold this week; no pace change."), `the /share standup line: ${standup}`);
      });
    });
  }
});
