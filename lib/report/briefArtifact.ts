import { DECISION_CONTRACT_LABELS } from "./reportCopy";
import {
  formatMeetingSlideMarkdown,
  type MeetingSlidePayload,
} from "../export/meetingSlideExport";

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
  reversal?: string;
  clearsWhen?: readonly string[];
  regimeLabel: string;
  postureLabel?: string;
  tightness: number;
  riskAppetite?: number;
  confidenceLabel?: string;
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

  if (!title || !recordDateLabel || !call || !regimeLabel || !source || tightness === undefined) {
    return null;
  }

  return {
    title,
    recordDateLabel,
    call,
    regimeLabel,
    source,
    tightness,
    actionNow: readText(value, "actionNow"),
    guardrail: readText(value, "guardrail"),
    reversal: readText(value, "reversal"),
    clearsWhen: readTextList(value, "clearsWhen"),
    postureLabel: readText(value, "postureLabel"),
    riskAppetite: readNumber(value, "riskAppetite"),
    confidenceLabel: readText(value, "confidenceLabel"),
    revisit: readRevisit(value),
    noChangeAreas: readTextList(value, "noChangeAreas"),
    permalinkPath: readText(value, "permalinkPath"),
    isFallback: value.isFallback === true,
  };
};

export type BriefFormatId = "slack" | "slide" | "citation";

export const BRIEF_FORMATS: readonly {
  id: BriefFormatId;
  label: string;
  /** What the reader is about to paste, in the place they will paste it. */
  hint: string;
}[] = [
  { id: "slack", label: "Slack", hint: "Bolded block for a channel or DM." },
  { id: "slide", label: "Slide", hint: "Markdown callout for Notion, Docs or a deck." },
  { id: "citation", label: "Citation", hint: "Dated reference with a link to the record." },
];

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
    ? [{ label: DECISION_CONTRACT_LABELS.threshold.guardrail, value: artifact.guardrail }]
    : []),
  ...(artifact.reversal
    ? [{ label: DECISION_CONTRACT_LABELS.reversal.reversal, value: artifact.reversal }]
    : []),
  ...(artifact.clearsWhen && artifact.clearsWhen.length > 0
    ? [{ label: DECISION_CONTRACT_LABELS.reversal.clearsWhen, value: artifact.clearsWhen.join("; ") }]
    : []),
];

/**
 * True when the action is a restatement of the call.
 *
 * The two fields carry the same sentence on a week where the model has no
 * stage-scoped action to add, and a pasted block that says "Operating call: X"
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
    artifact.confidenceLabel ? `confidence ${artifact.confidenceLabel}` : null,
    artifact.isFallback ? "cached snapshot, not a live read" : null,
  ]
    .filter(Boolean)
    .join(" · ");

const signalLine = (artifact: BriefArtifact) =>
  [
    `Funding pressure ${artifact.tightness}/100`,
    typeof artifact.riskAppetite === "number" ? `risk appetite ${artifact.riskAppetite}/100` : null,
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

const formatSlack = (artifact: BriefArtifact, origin: string) =>
  [
    `*${artifact.title} — ${artifact.recordDateLabel}*`,
    `> *Operating call:* ${artifact.call}`,
    ...conditionLines(artifact).map((line) => `> • ${line}`),
    "",
    `${signalLine(artifact)} · ${artifact.regimeLabel}`,
    `${provenanceLine(artifact)}`,
    `Full brief: ${resolveBriefUrl(artifact, origin)}`,
  ].join("\n");

/**
 * The one adapter from the presentation model to the slide model.
 *
 * This format used to build its own markdown block, which meant the share
 * panel's "Slide" and `CopyMeetingSlideButton` produced two different slides
 * from the same week — the panel's carried the resume thresholds and a link,
 * the button's carried neither. One builder now serves both.
 */
export const briefArtifactToSlidePayload = (
  artifact: BriefArtifact,
  origin: string,
): MeetingSlidePayload => ({
  recordDate: artifact.recordDateLabel,
  regime: artifact.regimeLabel,
  stageLabel: artifact.postureLabel ?? "Startup",
  actionNow: artifact.actionNow ?? artifact.call,
  pauseIf: artifact.guardrail ?? "Hold irreversible commitments until threshold pressure clears.",
  changeCourseIf: artifact.reversal ?? "Resume staged approvals when conditions ease.",
  tightness: artifact.tightness,
  riskAppetite: artifact.riskAppetite ?? 50,
  confidence: artifact.confidenceLabel ?? "MED",
  provenance: artifact.source,
  call: artifact.call,
  clearsWhen: artifact.clearsWhen,
  url: resolveBriefUrl(artifact, origin),
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
    `Call: ${artifact.call}`,
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
    default:
      return formatSlack(artifact, origin);
  }
};
