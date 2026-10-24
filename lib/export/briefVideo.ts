import rawManifest from "../../data/brief_videos.json";
import { z } from "zod";
import { buildCanonicalUrl } from "../seo";
import type { PublishedBrief } from "../report/publishedBriefs";
import { publishedBriefToSlidePayload } from "./exportSnapshot";
import { formatMeetingSlideSvg, type MeetingSlidePayload } from "./meetingSlideExport";
import { OG_TEXT, OG_LINE_CROSSED } from "../image/ogTheme";

/** Increment when the rendering contract changes; old renders then lose their tags. */
const VIDEO_RENDER_VERSION = 1;

const briefVideoAssetSchema = z.object({
  slug: z.string(),
  sourceHash: z.string(),
  recordDate: z.string(),
  publishedAt: z.string(),
  video: z.string(),
  poster: z.string(),
  /** The silent clip's caption track, generated beside it. */
  captions: z.string(),
  width: z.number(),
  height: z.number(),
  duration: z.number(),
  contentType: z.literal("video/mp4"),
});

export type BriefVideoAsset = z.infer<typeof briefVideoAssetSchema>;

export const briefVideoManifestSchema = z.object({
  version: z.number(),
  assets: z.array(briefVideoAssetSchema),
});

/** Shape-checked at load: a malformed manifest fails the build, not a reader. */
const briefVideoManifest = briefVideoManifestSchema.parse(rawManifest);

/** Hash the rendered payload, including its date, evidence and scoring basis. */
export const briefVideoSourceHash = async (payload: MeetingSlidePayload): Promise<string> => {
  const source = JSON.stringify({ version: VIDEO_RENDER_VERSION, payload });
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

/**
 * Video is opt-in per frozen record. Nothing is encoded or fetched during a read,
 * and a corrected record cannot keep advertising an earlier version of its call.
 */
export const findBriefVideo = async (
  brief: PublishedBrief,
  assets: readonly BriefVideoAsset[] = briefVideoManifest.assets,
): Promise<BriefVideoAsset | undefined> => {
  if (brief.correction) return undefined;
  const asset = assets.find((candidate) => candidate.slug === brief.slug);
  if (!asset || asset.recordDate !== brief.recordDate || asset.publishedAt !== brief.publishedAt) return undefined;
  const stem = `/videos/briefs/${brief.slug}-`;
  if (
    !asset.video.startsWith(stem) || !/^\/videos\/briefs\/[a-z0-9-]+\.mp4$/.test(asset.video) ||
    !asset.poster.startsWith(stem) || !/^\/videos\/briefs\/[a-z0-9-]+\.png$/.test(asset.poster) ||
    !asset.captions.startsWith(stem) || !/^\/videos\/briefs\/[a-z0-9-]+\.vtt$/.test(asset.captions) ||
    asset.contentType !== "video/mp4" || asset.width !== 1280 || asset.height !== 720 ||
    !Number.isFinite(asset.duration) || asset.duration <= 0 || asset.duration > 60
  ) return undefined;
  const sourceHash = await briefVideoSourceHash(publishedBriefToSlidePayload(brief, null));
  return asset.sourceHash === sourceHash ? asset : undefined;
};

/** Next/Vinext emits these as og:video and its structured properties. */
export const briefVideoOpenGraph = (asset: BriefVideoAsset) => ({
  url: buildCanonicalUrl(asset.video),
  secureUrl: buildCanonicalUrl(asset.video),
  type: asset.contentType,
  width: asset.width,
  height: asset.height,
});

/**
 * The same published slide at every phase. Focus moves between its existing
 * rows; numbers never animate, and no decision or source is hidden in a frame.
 * The complete phase is also the static poster and reduced-motion alternative.
 */
export const renderBriefVideoFrame = (
  payload: MeetingSlidePayload,
  phase: "action" | "pause" | "change" | "complete",
): string => {
  const svg = formatMeetingSlideSvg(payload).replace("This week's guidance", "Published weekly guidance");
  const top = { action: 190, pause: 320, change: 450, complete: null }[phase];
  const focus = top === null ? "" :
    `<rect x="80" y="${top}" width="1040" height="110" rx="12" fill="none" stroke="${phase === "pause" ? OG_LINE_CROSSED : OG_TEXT}" stroke-width="3"/>`;
  return svg.replace("</svg>", `${focus}</svg>`);
};
