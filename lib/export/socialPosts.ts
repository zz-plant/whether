/**
 * The week as a public post: LinkedIn, X, and Bluesky.
 *
 * Every other format on /share goes to a room that already reads the brief — a
 * channel, a board, a letter. These go to the operator's own followers, most of
 * whom have never seen it, so each post leads with the conditions and the
 * guidance and ends on the link, and nothing in it needs the site to make sense.
 *
 * X and Bluesky cap a post's length, and a post cut off by the composer loses
 * its link, which is the one part that must survive. So the short posts are
 * built from a ladder of candidates, richest first, and the first that fits is
 * the post: the pause line goes before the conditions' meaning, and the
 * guidance is cut to its first sentence before it is cut mid-sentence. The link
 * is in every rung.
 *
 * The link carries `ref=share` like every chat paste (`resolveSharedBriefUrl`):
 * no campaign codes, no per-network marker.
 */
import { briefConditionEntries, resolveSharedBriefUrl, type BriefDocument } from "../report/briefArtifact";
import { decisionAreaLabel } from "../report/boundedDecisionRules";
import { operatingLeverToDecisionArea } from "../report/businessAreaMap";
import { DECISION_CONTRACT_LABELS } from "../report/reportCopy";
import { formatSignalReading } from "../report/signalTranslations";
import { formatSourceFooter } from "./exportTerms";

export type SocialNetwork = "linkedin" | "x" | "bluesky";

/** X counts any link as 23 characters and weighs most non-Latin characters double. */
const X_LIMIT = 280;
const X_LINK_WEIGHT = 23;
/** Bluesky counts graphemes and prints a pasted link in full. */
const BLUESKY_LIMIT = 300;

const LINK_PATTERN = /https?:\/\/\S+/g;

/* Conservative: every character outside ASCII counts double, which over-counts
   the dashes and middots X weighs as one rather than letting a post overrun. */
const xLength = (text: string) => {
  let total = 0;
  for (const char of text.replace(LINK_PATTERN, "x".repeat(X_LINK_WEIGHT))) {
    total += (char.codePointAt(0) ?? 0) > 0x7f ? 2 : 1;
  }
  return total;
};

const graphemeLength = (text: string) => [...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(text)].length;

/** The guidance's first sentence, for a post with no room for the rest. */
const firstSentence = (text: string) => {
  const match = /^.+?[.!?](?=\s|$)/.exec(text.trim());
  return match ? match[0] : text.trim();
};

/** Cut at a word boundary with an ellipsis, so a post never ends mid-word. */
const truncateToFit = (text: string, fits: (candidate: string) => boolean) => {
  const words = text.split(/\s+/);
  for (let count = words.length - 1; count > 0; count -= 1) {
    const candidate = `${words.slice(0, count).join(" ").replace(/[,;:.]$/, "")}…`;
    if (fits(candidate)) return candidate;
  }
  return "";
};

const headline = (document: BriefDocument, withMeaning: boolean) =>
  `Startup operating conditions, ${document.recordDateLabel}: ${withMeaning ? document.conditions.line : document.conditions.label}.`;

const pauseLine = (document: BriefDocument) =>
  document.slots.pauseIf ? `${DECISION_CONTRACT_LABELS.threshold.pauseIf}: ${document.slots.pauseIf}` : null;

const formatShortPost = (document: BriefDocument, origin: string, measure: (text: string) => number, limit: number) => {
  const url = resolveSharedBriefUrl(document, origin);
  const guidance = document.call;
  const pause = pauseLine(document);
  const compose = (...blocks: (string | null)[]) => [...blocks.filter(Boolean), url].join("\n\n");
  const fits = (text: string) => measure(text) <= limit;

  const ladder = [
    compose(headline(document, true), guidance, pause),
    compose(headline(document, false), guidance, pause),
    compose(headline(document, true), guidance),
    compose(headline(document, false), guidance),
    compose(headline(document, false), firstSentence(guidance)),
  ];
  const post = ladder.find(fits);
  if (post) return post;

  const short = headline(document, false);
  return compose(short, truncateToFit(firstSentence(guidance), (candidate) => fits(compose(short, candidate))));
};

/* One line per area, the rule in the area's own name, so a follower who runs
   hiring finds the hiring line without reading the rest. */
const areaLines = (document: BriefDocument) =>
  document.areaRows.map((item) => `• ${decisionAreaLabel(operatingLeverToDecisionArea[item.lever])}: ${item.areaActionNow}`);

/**
 * LinkedIn shows about two lines before "see more", so those two lines are the
 * conditions and the guidance; the bounded lines, the areas, and the source
 * follow for the reader who opens it.
 */
const formatLinkedInPost = (document: BriefDocument, origin: string) => {
  const areas = areaLines(document);
  return [
    headline(document, true),
    "",
    `${document.call}`,
    "",
    ...briefConditionEntries(document).map((entry) => `${entry.label}: ${entry.value}`),
    ...(areas.length > 0 ? ["", "By area:", ...areas] : []),
    "",
    [
      formatSignalReading("tightness", document.readings.scores.tightness),
      formatSignalReading("riskAppetite", document.readings.scores.riskAppetite),
    ].join(" · "),
    formatSourceFooter(document.provenance),
    "",
    `Full brief: ${resolveSharedBriefUrl(document, origin)}`,
  ].join("\n");
};

export const formatSocialPost = (document: BriefDocument, network: SocialNetwork, origin: string): string => {
  switch (network) {
    case "x":
      return formatShortPost(document, origin, xLength, X_LIMIT);
    case "bluesky":
      return formatShortPost(document, origin, graphemeLength, BLUESKY_LIMIT);
    default:
      return formatLinkedInPost(document, origin);
  }
};

/**
 * The network's own composer, opened with the post filled in. A plain link to
 * each site's public share intent: no SDK, no script, nothing the network can
 * read until the reader presses its Post button.
 */
export const buildSocialComposeUrl = (network: SocialNetwork, text: string): string => {
  const encoded = encodeURIComponent(text);
  switch (network) {
    case "x":
      return `https://x.com/intent/post?text=${encoded}`;
    case "bluesky":
      return `https://bsky.app/intent/compose?text=${encoded}`;
    default:
      return `https://www.linkedin.com/feed/?shareActive=true&text=${encoded}`;
  }
};
