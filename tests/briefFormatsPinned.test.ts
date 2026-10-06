import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { afterEach, describe, it } from "bun:test";
import { isValidElement, type ReactNode } from "react";
import { NextRequest } from "next/server";
import SharePage from "../app/share/page";
import { SharePageFormats } from "../app/share/sharePageFormats";
import { GuardrailTagControls } from "../app/share/guardrailTagControls";
import { PullPolicyControls } from "../app/share/pullPolicyControls";
import { BriefArtifactScript } from "../app/components/briefArtifactScript";
import { GET as getSlideImage } from "../app/api/image/slide/route";
import { GET as getBoardSlide } from "../app/api/export/board-slide/route";
import { GET as getWeeklyMandate } from "../app/api/integrations/weekly-mandate/route";
import { GET as getSlackBriefRoute } from "../app/api/brief/slack/route";
import { BRIEF_FORMATS, briefArtifactToSlidePayload, formatBriefArtifact } from "../lib/report/briefArtifact";
import { formatInvestorUpdateSnippet } from "../lib/export/investorUpdateSnippet";
import {
  extractMeetingSlidePayload,
  formatMeetingSlideHtml,
  formatMeetingSlideMarkdown,
} from "../lib/export/meetingSlideExport";
import { buildWeeklyOperatorBriefPayload, buildWeeklyOperatorBriefPlainText } from "../lib/export/weeklyOperatorBrief";
import { buildSlackBrief } from "../lib/export/briefBuilders";
import { deliverSlackBrief } from "../lib/slack/deliverSlackBrief";
import { sendWeeklyBrief } from "../lib/email/sendWeeklyBrief";
import { getSubscriberStore, resetSubscriberStore } from "../lib/email/subscriberStore";
import { buildOperatingSnapshot } from "../lib/operatingState/snapshot";
import { resetOperatingSnapshotStore } from "../lib/operatingState/snapshotStore";
import type { OperatingSnapshot } from "../lib/operatingState/types";
import { loadReportData } from "../lib/report/reportData";
import { loadWeeklyBriefSnapshot } from "../lib/report/weeklyBriefSnapshot";
import { applyStageToWeeklyCall } from "../lib/report/weeklyCallContract";
import type { RunwayBand } from "../lib/report/operatorRunway";
import { macroSeries } from "../lib/macroSnapshot";
import { snapshotData } from "../lib/snapshot";
import { macros, treasury as exportTreasury } from "./factories/exportFixtures";

/*
 * Every format the week leaves the site in, pinned byte for byte on four weeks:
 * an ordinary live week, the bundled saved copy a total outage serves, a week
 * the policy layer holds, and the ordinary week read by someone who has chosen a
 * stage and a runway band.
 *
 * The formats were built from five models of the same week, and the work that
 * folds them into one document has to prove, format by format, that it changed
 * nothing it did not mean to. Each surface is read through its production entry
 * point — the /share page, the slide and deck routes, the integration and Slack
 * routes, the Monday post and the email — so the pin is on what a reader gets,
 * not on a builder a route may have stopped calling.
 *
 * A change that means to move a string updates the golden file in the same
 * commit, and the diff is the list of strings it moved:
 *   WHETHER_UPDATE_BRIEF_GOLDEN=1 bun run test tests/briefFormatsPinned.test.ts
 */

const GOLDEN_URL = new URL("./fixtures/briefFormats.golden.json", import.meta.url);
const UPDATE = process.env.WHETHER_UPDATE_BRIEF_GOLDEN === "1";
const ORIGIN = "https://origin.test";
const BANDS: readonly (RunwayBand | null)[] = [null, "critical", "tight", "balanced", "abundant"];

type Fixture = {
  name: string;
  snapshot: () => OperatingSnapshot;
  now: Date;
  /** Whether the Monday sends publish this reading at all; they refuse a saved copy. */
  publishes: boolean;
  stage?: "seed" | "series-a";
  runwayBand?: RunwayBand;
};

const fixtures: Fixture[] = [
  {
    name: "ordinary live week",
    snapshot: () =>
      buildOperatingSnapshot({
        treasury: { ...snapshotData, isLive: true, fallback_at: undefined, fallback_reason: undefined, record_date: "2026-08-28", fetched_at: "2026-08-28T12:00:00.000Z" },
        macroSeries,
        now: new Date("2026-08-31T12:00:00.000Z"),
      }),
    now: new Date("2026-08-31T12:00:00.000Z"),
    publishes: true,
  },
  {
    name: "saved-copy week",
    snapshot: () => buildOperatingSnapshot({ treasury: snapshotData, macroSeries, now: new Date("2026-08-31T12:00:00.000Z") }),
    now: new Date("2026-08-31T12:00:00.000Z"),
    publishes: false,
  },
  {
    name: "policy-override week",
    snapshot: () => buildOperatingSnapshot({ treasury: exportTreasury, macroSeries: macros, now: new Date("2026-03-05T12:00:00.000Z") }),
    now: new Date("2026-03-05T12:00:00.000Z"),
    publishes: true,
  },
  {
    name: "stage and runway reader",
    snapshot: () =>
      buildOperatingSnapshot({
        treasury: { ...snapshotData, isLive: true, fallback_at: undefined, fallback_reason: undefined, record_date: "2026-08-28", fetched_at: "2026-08-28T12:00:00.000Z" },
        macroSeries,
        now: new Date("2026-08-31T12:00:00.000Z"),
      }),
    now: new Date("2026-08-31T12:00:00.000Z"),
    publishes: true,
    stage: "seed",
    runwayBand: "tight",
  },
];

/** The props a page hands every `component` in its tree, read without rendering it. */
const propsHandedTo = <P,>(node: ReactNode, component: (props: P) => ReactNode): P[] => {
  if (Array.isArray(node)) return node.flatMap((child: ReactNode) => propsHandedTo(child, component));
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  const own = node.type === component && isValidElement<P>(node) ? [node.props] : [];
  return [...own, ...propsHandedTo(node.props.children, component)];
};

const sha256 = (bytes: ArrayBuffer) => createHash("sha256").update(new Uint8Array(bytes)).digest("hex");

const originalFetch = globalThis.fetch;
const noFetch: typeof fetch = async () => {
  throw new Error("a pinned format must not read around its OperatingSnapshot");
};

afterEach(() => {
  globalThis.fetch = originalFetch;
  resetOperatingSnapshotStore();
  resetSubscriberStore();
});

const collectShare = async (out: Record<string, string>) => {
  const page = await SharePage();
  const formats = propsHandedTo(page, SharePageFormats)[0];
  assert.ok(formats, "/share renders its format picker");
  out["share: score lines"] = (formats.scoreReferences ?? []).join("\n");
  out["share: calendar details"] = formats.calendar.details;
  for (const option of formats.options) {
    if (option.kind === "text") {
      out[`share: ${option.id}`] = option.text;
    } else if (option.kind === "investor") {
      for (const band of BANDS) out[`share: investor-update (${band ?? "no band"})`] = formatInvestorUpdateSnippet(option.parts, band);
    } else if (option.id === "work-item-tags") {
      const tags = propsHandedTo(option.content, GuardrailTagControls)[0];
      out["share: work-item-tags"] = (tags?.blocks ?? []).map((block) => block.markdown).join("\n\n");
    } else if (option.id === "pull-policies") {
      const policies = propsHandedTo(option.content, PullPolicyControls)[0];
      out["share: pull-policies"] = JSON.stringify(policies ?? null);
    }
  }

  /* The island the share rail, the presentation frames and "Copy as a slide" read. */
  const island = propsHandedTo(page, BriefArtifactScript)[0]?.artifact;
  assert.ok(island, "/share publishes the brief island");
  out["island: json"] = JSON.stringify(island);
  for (const format of BRIEF_FORMATS) out[`island: ${format.id}`] = formatBriefArtifact(island, format.id, ORIGIN);
  out["island: slide html"] = formatMeetingSlideHtml(briefArtifactToSlidePayload(island, ORIGIN));
};

const collectSlides = async (out: Record<string, string>, snapshot: OperatingSnapshot, stage: Fixture["stage"]) => {
  const query = stage ? `?stage=${stage}` : "";
  const svg = await getSlideImage(new NextRequest(`https://whether.test/api/image/slide${query}`));
  out[`slide route: svg${query}`] = await svg.text();
  const pptx = await getBoardSlide(new NextRequest(`https://whether.test/api/export/board-slide${query}${query ? "&" : "?"}format=pptx`));
  out[`deck route: pptx sha256${query}`] = sha256(await pptx.arrayBuffer());
  out[`deck route: pptx filename${query}`] = pptx.headers.get("Content-Disposition") ?? "";
  /* The PDF stamps its own creation time, so its bytes are not stable; the payload it draws is. */
  const payload = extractMeetingSlidePayload(snapshot, stage ?? null);
  out[`slide payload${query}`] = JSON.stringify(payload);
  out[`slide markdown${query}`] = formatMeetingSlideMarkdown(payload);
  out[`slide html${query}`] = formatMeetingSlideHtml(payload);
};

const collectRoutes = async (out: Record<string, string>) => {
  for (const target of ["slack", "notion", "linear"]) {
    const response = await getWeeklyMandate(new Request(`https://whether.test/api/integrations/weekly-mandate?target=${target}`));
    const body: unknown = await response.json();
    out[`mandate route: ${target}`] = JSON.stringify(typeof body === "object" && body !== null ? Reflect.get(body, "payload") : null);
  }
  const slack: unknown = await (await getSlackBriefRoute()).json();
  out["slack route: brief"] = String(typeof slack === "object" && slack !== null ? Reflect.get(slack, "brief") : "");

  /* What `scripts/generateWeeklySlackBrief.ts` writes to docs/briefs: the same read, the same call. */
  const report = await loadReportData();
  out["weekly slack artifact script"] = buildSlackBrief(report.assessment, report.treasury, report.sensors, report.macroSeries);

  /* The citation the answer pages print. */
  out["answer-page citation"] = (await loadWeeklyBriefSnapshot()).snapshot.callCitation;
};

const collectMonday = async (out: Record<string, string>, snapshot: OperatingSnapshot, now: Date) => {
  let posted = "";
  const capture = async (_url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    posted = typeof init?.body === "string" ? init.body : "";
    return new Response("ok", { status: 200 });
  };
  const result = await deliverSlackBrief({ webhookUrls: ["https://hooks.slack.com/services/T0/B0/pin"], snapshot, now, fetchImpl: capture });
  assert.equal(result.status, "posted", result.error);
  out["monday slack post"] = posted;

  const store = getSubscriberStore();
  const subscriber = await store.subscribe("operator@example.com");
  await store.verifyEmail(subscriber.confirmToken ?? "");
  const mailed: Array<{ subject: string; text: string }> = [];
  const previousBinding = Reflect.get(globalThis, "EMAIL");
  Reflect.set(globalThis, "EMAIL", {
    send: async (message: { subject: string; text: string }) => {
      mailed.push({ subject: message.subject, text: message.text });
    },
  });
  try {
    const sent = await sendWeeklyBrief({ snapshot, weeklyCall: snapshot.weeklyCall, now });
    assert.equal(sent.sent, 1, sent.error);
  } finally {
    if (previousBinding === undefined) Reflect.deleteProperty(globalThis, "EMAIL");
    else Reflect.set(globalThis, "EMAIL", previousBinding);
  }
  /* The unsubscribe link carries a per-subscriber token; the body around it is the pin. */
  out["monday email subject"] = mailed[0]?.subject ?? "";
  out["monday email text"] = (mailed[0]?.text ?? "").replace(/token=[^\s&"]+/g, "token=<token>");
};

/** The stage- and runway-calibrated call, as the homepage's operator brief and Markdown brief print it. */
const collectReader = (out: Record<string, string>, snapshot: OperatingSnapshot, fixture: Fixture) => {
  const weeklyCall = applyStageToWeeklyCall(snapshot.weeklyCall, {
    assessment: snapshot.assessment,
    startupVariantMode: fixture.stage,
    runwayBand: fixture.runwayBand,
  });
  out["reader operator brief"] = buildWeeklyOperatorBriefPlainText(
    buildWeeklyOperatorBriefPayload({ assessment: snapshot.assessment, treasury: snapshot.treasury, weeklyCall }),
  );
};

const collect = async (fixture: Fixture): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  const snapshot = fixture.snapshot();
  await resetOperatingSnapshotStore().write(snapshot);
  globalThis.fetch = noFetch;

  if (fixture.stage) {
    await collectSlides(out, snapshot, fixture.stage);
    collectReader(out, snapshot, fixture);
    return out;
  }

  await collectShare(out);
  await collectSlides(out, snapshot, undefined);
  await collectRoutes(out);
  if (fixture.publishes) await collectMonday(out, snapshot, fixture.now);
  return out;
};

const readGolden = (): Record<string, Record<string, string>> => {
  if (!existsSync(GOLDEN_URL)) return {};
  const parsed: unknown = JSON.parse(readFileSync(GOLDEN_URL, "utf8"));
  const golden: Record<string, Record<string, string>> = {};
  if (typeof parsed !== "object" || parsed === null) return golden;
  for (const [name, surfaces] of Object.entries(parsed)) {
    if (typeof surfaces !== "object" || surfaces === null) continue;
    golden[name] = Object.fromEntries(Object.entries(surfaces).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  }
  return golden;
};

describe("every brief format, pinned", () => {
  for (const fixture of fixtures) {
    it(`renders the ${fixture.name} exactly as pinned`, async () => {
      const actual = await collect(fixture);
      if (UPDATE) {
        const golden = readGolden();
        golden[fixture.name] = actual;
        writeFileSync(GOLDEN_URL, `${JSON.stringify(golden, null, 2)}\n`);
        return;
      }
      const expected = readGolden()[fixture.name];
      assert.ok(expected, `no pin for "${fixture.name}"; run with WHETHER_UPDATE_BRIEF_GOLDEN=1`);
      assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort(), "the same surfaces are pinned");
      for (const [surface, text] of Object.entries(expected)) {
        assert.equal(actual[surface], text, `${fixture.name} → ${surface}`);
      }
    });
  }
});
