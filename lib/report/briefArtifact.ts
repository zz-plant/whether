import { DECISION_CONTRACT_LABELS, NO_LIVE_READING_CALL } from "./reportCopy";
import { formatMarginBand } from "./reportFormatting";
import { formatSignalReading } from "./signalTranslations";
import {
  formatMeetingSlideMarkdown,
  type MeetingSlidePayload,
} from "../export/meetingSlideExport";
import type { RegimeAssessment } from "../regimeEngine";
import type { MacroSeriesReading } from "../types";
import type { ActionStripItem } from "./operatingCalls";
import type { PreviousReading } from "../export/scoreReference";
import { basisClause, type ScoringBasis } from "./scoringBasis";

/**
 * The week's call as one structured object, so every format the reader can copy
 * is a rendering of the same claim.
 *
 * The share panel used to build its own text: a fixed marketing sentence plus a
 * URL, for both "Plain text" and "Slack format". Neither carried the call, the
 * record date, the bounded conditions or the source — so the one control named
 * for transmitting the brief transmitted none of it. Its third button read the
 * decision card out of the DOM via `[data-share-section="decision"]`, an
 * attribute no component in this app sets, so it only ever copied its own
 * not-found string.
 *
 * Rule 3 in AGENTS.md ("Artifact quality matters") and the trust rule that
 * provenance travels with the claim both land in the same place here: a format
 * may reorder or re-mark the fields, but it may not drop the date, the bounded
 * conditions, or the source.
 */
export type BriefArtifact = {
  /** Names the artifact — the weekly brief, or a month's / quarter's call. */
  title: string;
  recordDateLabel: string;
  call: string;
  actionNow?: string;
  guardrail?: string;
  /** Where the call itself changes. */
  reversal?: string;
  /** A stage's discipline for lifting its hold; absent without a stage. */
  resumeWhen?: string;
  clearsWhen?: readonly string[];
  regimeLabel: string;
  tightness: number;
  riskAppetite: number;
  confidenceLabel: string;
  source: string;
  /** Decisions this week's movement reopens, and the areas it leaves alone.
   *  Carried here so the presentation frames read the same call the share
   *  formats do, rather than a second assembly of the same week. */
  revisit?: readonly { label: string; recheck: string }[];
  noChangeAreas?: readonly string[];
  /** Path of the frozen, citable copy of this week, when the archive has one. */
  permalinkPath?: string;
  /** True when the reading came off a snapshot rather than a live fetch. */
  isFallback?: boolean;
  /*
   * What the slide prints and the share rail's "Copy as a slide" reads off the
   * island. The slide was built two ways — from this object in the browser and
   * from the operating snapshot on the server — and the browser's way had none
   * of these, so it drew "Stage" over the conditions label, printed the weather
   * word where the engine key belonged (so a Freezing slide wore Sunny's green
   * badge), and judged both scores against the engine's default lines. Absent
   * on an island published before they existed; the slide then omits what they
   * would have said rather than standing something in.
   */
  /** The engine key the weather word names, for the slide's badge and conditions line. */
  regime?: string;
  /** The ISO record date, for a file's name and timestamp. */
  recordDate?: string;
  /** The two lines the scores are judged against, where conditions change. */
  lines?: { tightness: number; riskAppetite: number };
  /** The stage the call was calibrated to ("Seed"); absent when the reader chose none. */
  stageLabel?: string;
  /** Where the numbers came from, as a reader names the source. */
  sourceLabel?: string;
  /** Which inputs set the scores, as a sentence: "Scored on the record's inputs." (`ScoringBasis.sentence`). */
  basis?: string;
};

type PublishedConfidenceLabel = "HIGH" | "MED" | "LOW";

/**
 * The week as one document every format renders from: the Slack post, the
 * email, the operator brief, the investor update, the portfolio note, the
 * slide and the deck files, the ticket brief, the integration payloads and the
 * citation.
 *
 * It extends the artifact the share rail renders rather than sitting beside it,
 * because a second model of the same week is how the formats came apart. There
 * were five: the weekly call contract, the export layer's options, the posture
 * state, this artifact, and the home model's canonical copy, each with its own
 * fallback chain, so the Monday post and the email printed different calls and
 * the slide was built two ways. `buildBriefDocument`
 * (`lib/report/briefDocument.ts`) builds it once, from a reading and its
 * `WeeklyCallContract`; a format may choose which fields to print but derives
 * none of them.
 */
export type BriefDocument = BriefArtifact & {
  /** The market state, under the one label every format prints it with. */
  conditions: {
    /** The engine key; a format reads it for colour, never prints it. */
    regime: RegimeAssessment["regime"];
    /**
     * The contract's `regimeStage`: the weather word, with how long it has held
     * when the reading knows. The exports passed four different labels here —
     * the stage label, the canonical copy's, the home model's and none — so the
     * Monday post and /share named the same week's conditions differently.
     */
    label: string;
    /** The label with what it means for money: "Stormy (conditions are changing week to week)". */
    line: string;
  };
  /** The published band (`resolvePublishedConfidence`), resolved once for every format. */
  confidence: PublishedConfidenceLabel;
  provenance: {
    /** The source as a reader names it, never a series URL. */
    sourceLabel: string;
    /** The record's own source string (a FRED series URL on a live read), which citation lines print. */
    sourceUrl: string;
    /** ISO date of the reading. */
    recordDate: string;
    /** True when the numbers came off a saved copy rather than a live read. */
    isFallback: boolean;
    /** The most specific stable URL for the week: the frozen record when there is a current one. */
    permalink: string;
    /** Which inputs set the scores, and what the inputs left out would do (`resolveScoringBasis`). */
    scoringBasis: Pick<ScoringBasis, "key" | "sentence" | "warning" | "notCounted">;
  };
  /** The call's slots, from the `WeeklyCallContract`. */
  slots: {
    currentCall: string;
    actionNow: string;
    /** The condition only: every format prints it under a label that already says "Pause if". */
    pauseIf: string;
    /** Where the call itself changes. */
    callChangesIf: string;
    /** A stage's discipline for lifting its hold, printed beside `callChangesIf`, never as it. */
    resumeWhen?: string;
    doNowBullets: readonly string[];
    flipConditionLabels: readonly string[];
    whyCouldBeWrong: string;
    /** The policy layer is holding the guidance this week (`POLICY_OVERRIDE_CALL`). */
    policyOverrideActive: boolean;
  };
  readings: {
    scores: { tightness: number; riskAppetite: number };
    /** Funding pressure above its ceiling, when pinned there; the margin counts it (`resolveNearestLineMargin`). */
    tightnessPressure?: number;
    tightnessSaturated?: boolean;
    thresholds: RegimeAssessment["thresholds"];
    /** How far each score sits from its change line, with the side folded in by the reader. */
    vsThreshold: { tightness: number; riskAppetite: number };
    /** The earlier two scores and their date, when the read carries a comparison; never invented. */
    previous: PreviousReading | null;
    baseRate: number | null;
    baseRateUsed: RegimeAssessment["scores"]["baseRateUsed"];
    curveSlope: number | null;
    macros: readonly MacroSeriesReading[];
  };
  /** One row per area, with each line's distance, in the page's own derivation. */
  areaRows: readonly ActionStripItem[];
  /** The operating limits the reading sets ("What to hold"). */
  constraints: readonly string[];
  /**
   * Runway, framed for a reader who sends to many companies: what the week means
   * at every band. The other framing — one reader's own band — is the browser's
   * to supply, because the band is a cookie and the pages that build this are
   * cached: the investor update composes it on the client
   * (`formatInvestorUpdateSnippet`), and the calibrated call carries it when the
   * read path knew the band (`WeeklyCallContract.runwayBand`).
   */
  runway: {
    everyBand: readonly { phrase: string; notes: readonly string[] }[];
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readText = (source: Record<string, unknown>, key: string): string | undefined => {
  const value = source[key];
  return typeof value === "string" && value !== "" ? value : undefined;
};

const readNumber = (source: Record<string, unknown>, key: string): number | undefined => {
  const value = source[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
};

const readTextList = (source: Record<string, unknown>, key: string): string[] | undefined => {
  const value = source[key];
  if (!Array.isArray(value)) return undefined;
  return value.filter((entry): entry is string => typeof entry === "string" && entry !== "");
};

const readRevisit = (source: Record<string, unknown>): BriefArtifact["revisit"] => {
  const value = source.revisit;
  if (!Array.isArray(value)) return undefined;
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const label = readText(entry, "label");
    const recheck = readText(entry, "recheck");
    return label && recheck ? [{ label, recheck }] : [];
  });
};

/**
 * Narrows the published island back to a `BriefArtifact`.
 *
 * The island is produced by this repo's own route, so the realistic failure is a
 * stale or half-written payload after a deploy, not a hostile one. It is still
 * rebuilt field by field rather than cast: this object becomes text that people
 * paste into their own channels, and a cast would put `undefined` — or whatever
 * else a malformed island carried — into a brief someone else then acts on. A
 * missing required field returns null, and the share panel falls back to its
 * generic text, which says nothing rather than something wrong.
 */
export const parseBriefArtifact = (raw: string): BriefArtifact | null => {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(value)) return null;

  const title = readText(value, "title");
  const recordDateLabel = readText(value, "recordDateLabel");
  const call = readText(value, "call");
  const regimeLabel = readText(value, "regimeLabel");
  const source = readText(value, "source");
  const tightness = readNumber(value, "tightness");
  const riskAppetite = readNumber(value, "riskAppetite");
  const confidenceLabel = readText(value, "confidenceLabel");

  /* Both scores and the confidence are required: the slide used to stand 50
     and "MED" in for them, which printed a reading nobody took. */
  if (!title || !recordDateLabel || !call || !regimeLabel || !source || tightness === undefined
    || riskAppetite === undefined || !confidenceLabel) {
    return null;
  }

  const linesValue = value.lines;
  const lineTightness = isRecord(linesValue) ? readNumber(linesValue, "tightness") : undefined;
  const lineRiskAppetite = isRecord(linesValue) ? readNumber(linesValue, "riskAppetite") : undefined;

  return {
    title,
    recordDateLabel,
    call,
    regimeLabel,
    source,
    tightness,
    riskAppetite,
    confidenceLabel,
    actionNow: readText(value, "actionNow"),
    guardrail: readText(value, "guardrail"),
    reversal: readText(value, "reversal"),
    resumeWhen: readText(value, "resumeWhen"),
    clearsWhen: readTextList(value, "clearsWhen"),
    revisit: readRevisit(value),
    noChangeAreas: readTextList(value, "noChangeAreas"),
    permalinkPath: readText(value, "permalinkPath"),
    isFallback: value.isFallback === true,
    regime: readText(value, "regime"),
    recordDate: readText(value, "recordDate"),
    lines: lineTightness !== undefined && lineRiskAppetite !== undefined
      ? { tightness: lineTightness, riskAppetite: lineRiskAppetite }
      : undefined,
    stageLabel: readText(value, "stageLabel"),
    sourceLabel: readText(value, "sourceLabel"),
    basis: readText(value, "basis"),
  };
};

export type BriefFormatId = "slack" | "slide" | "citation" | "agenda";

export const BRIEF_FORMATS: readonly {
  id: BriefFormatId;
  label: string;
  /** What the reader is about to paste, in the place they will paste it. */
  hint: string;
}[] = [
  { id: "slack", label: "Slack", hint: "Bolded block for a channel or DM." },
  { id: "slide", label: "Slide", hint: "Markdown callout for Notion, Docs or a deck." },
  { id: "citation", label: "Citation", hint: "Dated reference with a link to the record." },
  { id: "agenda", label: "Agenda", hint: "Three-minute Monday item for Notion, Docs or a meeting doc." },
];

/**
 * The standing shape of the Monday item, independent of any one week.
 *
 * Shared by the agenda format below, which fills it with the week's call, and
 * the recurring calendar hold (`app/components/calendarButton.tsx`), which
 * cannot carry a week's numbers because the same event repeats every Monday.
 * One list, so the invite and the pasted agenda describe the same three
 * minutes.
 */
export const MONDAY_AGENDA_STEPS: readonly {
  id: "changed" | "thresholds" | "revisit";
  label: string;
  minutes: number;
  prompt: string;
}[] = [
  { id: "changed", label: "What changed", minutes: 1, prompt: "Read the guidance and what moved since last Monday." },
  { id: "thresholds", label: "Check the lines", minutes: 1, prompt: "The pause line and the restart line, against this week's scores." },
  { id: "revisit", label: "Decide what to revisit", minutes: 1, prompt: "Which active hiring, spend or raise commitment sits on the wrong side of its pause line?" },
];

export const MONDAY_AGENDA_TITLE = "Monday guidance review";

export const MONDAY_AGENDA_MINUTES = MONDAY_AGENDA_STEPS.reduce((total, step) => total + step.minutes, 0);

/**
 * The bounded conditions, as label/value pairs.
 *
 * Shared by the copy formats and the presentation frames so the slide a room is
 * looking at and the block someone pastes afterwards cannot list different
 * conditions. An absent field yields no entry rather than an empty label.
 */
export const briefConditionEntries = (
  artifact: BriefArtifact,
): { label: string; value: string }[] => [
  ...(artifact.guardrail
    ? [{ label: DECISION_CONTRACT_LABELS.threshold.pauseIf, value: artifact.guardrail }]
    : []),
  ...(artifact.reversal
    ? [{ label: DECISION_CONTRACT_LABELS.watch.postureFlips, value: artifact.reversal }]
    : []),
  ...(artifact.resumeWhen
    ? [{ label: DECISION_CONTRACT_LABELS.reversal.resumeWhen, value: artifact.resumeWhen }]
    : []),
  ...(artifact.clearsWhen && artifact.clearsWhen.length > 0
    ? [{ label: DECISION_CONTRACT_LABELS.watch.watchThisWeek, value: artifact.clearsWhen.join("; ") }]
    : []),
];

/**
 * True when the action is a restatement of the call.
 *
 * The two fields carry the same sentence on a week where the model has no
 * stage-scoped action to add, and a pasted block that says "Guidance: X"
 * and then "Do now: X" reads as a formatting bug in someone else's channel.
 * `DecisionHero` already suppresses the second line on this exact test; the
 * copy formats have to apply it too, or the screen and the paste disagree.
 */
const actionRestatesCall = (artifact: BriefArtifact) =>
  !artifact.actionNow || artifact.actionNow.trim() === artifact.call.trim();

const conditionLines = (artifact: BriefArtifact) =>
  [
    ...(actionRestatesCall(artifact)
      ? []
      : [`${DECISION_CONTRACT_LABELS.action.doNow}: ${artifact.actionNow}`]),
    ...briefConditionEntries(artifact).map((entry) => `${entry.label}: ${entry.value}`),
  ];

/**
 * One line, appended to every format. The snapshot note is part of provenance:
 * a brief pasted into a channel during an upstream outage should say so there,
 * not only on the page it came from.
 */
const provenanceLine = (artifact: BriefArtifact) =>
  [
    `Source: ${artifact.source}`,
    `data as of ${artifact.recordDateLabel}`,
    artifact.confidenceLabel ? `margin: ${formatMarginBand(artifact.confidenceLabel).toLowerCase()}` : null,
    artifact.basis ? basisClause(artifact.basis) : null,
    artifact.isFallback ? "cached snapshot, not a live read" : null,
  ]
    .filter(Boolean)
    .join(" · ");

/* Each score carries what its number means, because a pasted "64/100" reaches
   people who have never seen the scale and cannot tell which end is bad. */
const signalLine = (artifact: BriefArtifact) =>
  [
    formatSignalReading("tightness", artifact.tightness),
    typeof artifact.riskAppetite === "number" ? formatSignalReading("riskAppetite", artifact.riskAppetite) : null,
  ]
    .filter(Boolean)
    .join(" · ");

/**
 * The URL to hand a reader. The frozen weekly record when the archive has a
 * current one, because `/` re-renders every week under the same address and
 * cannot be cited; otherwise the live page, which is at least honest about
 * being the live page.
 */
export const resolveBriefUrl = (artifact: BriefArtifact, origin: string) =>
  artifact.permalinkPath ? `${origin}${artifact.permalinkPath}` : `${origin}/`;

/**
 * The `ref` value a pasted brief carries, and the query the homepage reads it
 * back from. A reader who lands on `/` with it arrived from a teammate's
 * paste, not a search or a bookmark, and is greeted as one
 * (`app/components/home/ConditionsLegend.tsx`).
 */
export const SHARE_REFERRAL_PARAM = "ref";
export const SHARE_REFERRAL_VALUE = "share";

/** True for a query string (`location.search`) a pasted brief's link carries; any other `ref` is somebody else's tag. */
export const isSharedArrivalQuery = (search: string) =>
  new URLSearchParams(search).get(SHARE_REFERRAL_PARAM) === SHARE_REFERRAL_VALUE;

/**
 * The brief URL as it is pasted into a channel: the same address, marked as a
 * share. The citation format keeps `resolveBriefUrl` — a citation names the
 * canonical address, and a tracking query on it is noise in a footnote.
 */
export const resolveSharedBriefUrl = (artifact: BriefArtifact, origin: string) => {
  const url = new URL(resolveBriefUrl(artifact, origin));
  url.searchParams.set(SHARE_REFERRAL_PARAM, SHARE_REFERRAL_VALUE);
  return url.toString();
};

const formatSlack = (artifact: BriefArtifact, origin: string) =>
  [
    `*${artifact.title} — ${artifact.recordDateLabel}*`,
    `> *Guidance:* ${artifact.call}`,
    ...conditionLines(artifact).map((line) => `> • ${line}`),
    "",
    `${signalLine(artifact)} · ${artifact.regimeLabel}`,
    `${provenanceLine(artifact)}`,
    `Full brief: ${resolveSharedBriefUrl(artifact, origin)}`,
  ].join("\n");

/**
 * The call as a meeting item, in the order a room takes it: the posture, the
 * bounded conditions to check against, and the one question the meeting is
 * for. Markdown, because the destinations are Notion, Docs and Coda, where a
 * heading and bullets survive a paste and a Slack block does not.
 */
const formatAgenda = (artifact: BriefArtifact, origin: string) =>
  [
    `### ${MONDAY_AGENDA_TITLE} (${MONDAY_AGENDA_MINUTES} min) — ${artifact.recordDateLabel}`,
    `**Guidance:** ${artifact.call} (${artifact.regimeLabel})`,
    ...(actionRestatesCall(artifact)
      ? []
      : [`**${DECISION_CONTRACT_LABELS.action.doNow}:** ${artifact.actionNow}`]),
    ...MONDAY_AGENDA_STEPS.flatMap((step, index) => [
      `${index + 1}. **${step.label}** (${step.minutes} min) — ${step.prompt}`,
      // The thresholds step carries the week's numbers under it, so the room
      // checks against the printed conditions rather than remembered ones.
      ...(step.id === "thresholds"
        ? [
            ...briefConditionEntries(artifact).map((entry) => `   - ${entry.label}: ${entry.value}`),
            `   - Scores: ${signalLine(artifact)}`,
          ]
        : []),
    ]),
    "",
    provenanceLine(artifact),
    `Full brief: ${resolveSharedBriefUrl(artifact, origin)}`,
  ].join("\n");

/**
 * The one path to the slide, from the artifact the document extends.
 *
 * The slide was built two ways: from this object in the browser (the share
 * panel's "Slide" format and `CopyMeetingSlideButton`) and from the operating
 * snapshot on the server (the SVG, PPTX and PDF routes). The browser's way stood
 * 50 in for a missing risk appetite and "MED" for a missing confidence, printed
 * the conditions label as the reader's stage, and judged both scores against
 * the engine's default lines; the server's never said the reading was a saved
 * copy. The routes now build a `BriefDocument` and come through here too.
 *
 * The flip conditions (`clearsWhen`) print under their own name, not as the
 * restart line: they are the other things that would change the guidance, and on
 * a held week they include why it is held.
 */
export const briefArtifactToSlidePayload = (
  artifact: BriefArtifact,
  origin?: string,
): MeetingSlidePayload => ({
  recordDate: artifact.recordDateLabel,
  ...(artifact.recordDate ? { recordDateIso: artifact.recordDate } : {}),
  regime: artifact.regime ?? artifact.regimeLabel,
  stageLabel: artifact.stageLabel ?? "",
  actionNow: artifact.actionNow ?? artifact.call,
  pauseIf: artifact.guardrail ?? NO_LIVE_READING_CALL.pauseIf,
  // Not a resume sentence: this slot is where the call changes, and an artifact
  // without one says so rather than borrowing a condition from another line.
  callChangesIf: artifact.reversal ?? "No change line was published with this brief.",
  ...(artifact.resumeWhen ? { resumeWhen: artifact.resumeWhen } : {}),
  tightness: artifact.tightness,
  riskAppetite: artifact.riskAppetite,
  ...(artifact.lines ? { lines: artifact.lines } : {}),
  confidence: artifact.confidenceLabel,
  provenance: artifact.sourceLabel ?? artifact.source,
  ...(artifact.basis ? { basis: artifact.basis } : {}),
  call: artifact.call,
  clearsWhen: artifact.clearsWhen,
  ...(origin ? { url: resolveBriefUrl(artifact, origin) } : {}),
  isFallback: artifact.isFallback,
});

const formatSlide = (artifact: BriefArtifact, origin: string) =>
  formatMeetingSlideMarkdown(briefArtifactToSlidePayload(artifact, origin));

/**
 * Deliberately does not invent a stable identifier when the archive has none.
 * `/` is a moving target, so a citation pointing at it says so; claiming a
 * permanent record that was never frozen is the one failure this format cannot
 * have.
 */
const formatCitation = (artifact: BriefArtifact, origin: string) => {
  const url = resolveBriefUrl(artifact, origin);
  const stability = artifact.permalinkPath
    ? "Permanent record."
    : "Live page — this address re-renders each week; no frozen record was published for it.";

  return [
    `Whether. "${artifact.title} — ${artifact.recordDateLabel}."`,
    `Guidance: ${artifact.call}`,
    ...conditionLines(artifact),
    `Conditions: ${artifact.regimeLabel}. ${signalLine(artifact)}.`,
    provenanceLine(artifact) + ".",
    `${url} — ${stability}`,
  ].join("\n");
};

export const formatBriefArtifact = (
  artifact: BriefArtifact,
  format: BriefFormatId,
  origin: string,
): string => {
  switch (format) {
    case "slide":
      return formatSlide(artifact, origin);
    case "citation":
      return formatCitation(artifact, origin);
    case "agenda":
      return formatAgenda(artifact, origin);
    default:
      return formatSlack(artifact, origin);
  }
};
