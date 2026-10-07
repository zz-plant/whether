import { buildSlackBrief } from "../export/briefBuilders";
import {
  assessReadingReadiness,
  assessSnapshotReadiness,
  resolveOperatingSnapshot,
  type OperatingReading,
} from "../operatingState/resolveSnapshot";
import { briefSourceFromSnapshot, buildBriefDocument, buildBriefDocumentFromReport } from "../report/briefDocument";
import type { OperatingSnapshot } from "../operatingState/types";
import { siteUrl } from "../siteUrl";
import { slackChannel } from "../delivery/slack";
import { onceFor, weeklyPeriodKey } from "../delivery/onceFor";

/**
 * Slack delivery for the weekly brief.
 *
 * The previous implementation lived inline in sendWeeklyBrief and posted a
 * two-line message (regime + action) while the full buildSlackBrief text —
 * posture, scores, signal check, bounded decisions, citations — sat unused in
 * lib/export/briefBuilders. It also conflated "no webhook configured" with
 * "post failed". This module posts the real brief and reports which of the
 * three outcomes actually happened.
 */

type SlackDeliveryStatus =
  | "posted"
  | "partial"
  | "skipped_unconfigured"
  /** Every target already had this week's post; nothing was posted again. */
  | "skipped_already_posted"
  | "refused_unpublishable"
  | "failed";

type SlackDeliveryResult = {
  /** True when every configured webhook accepted the post, or none are configured. */
  ok: boolean;
  status: SlackDeliveryStatus;
  attempted: number;
  delivered: number;
  recordDate?: string;
  error?: string;
  /** Targets that already had this week's post and were not posted to again. Absent when none. */
  skipped?: number;
};

export const isSlackWebhookUrl = (value: string): boolean =>
  value.startsWith("https://hooks.slack.com/");

/* Slack caps a section's mrkdwn text at 3000 characters, and a message at 50 blocks. */
const SECTION_TEXT_LIMIT = 2900;
const MAX_SECTIONS = 40;

/**
 * The brief as consecutive sections, each under Slack's limit, split between lines.
 * It was one section cut at the limit, and the Monday post outgrew it: the ordinary
 * week stopped at "Put a payback figure on every discretionar… (truncated — full
 * brief on the site)" and the held week lost its "What to hold" list. A line longer
 * than a section is split inside it; past MAX_SECTIONS the rest is cut, as before.
 */
const splitSectionText = (text: string): string[] => {
  const sections: string[] = [];
  let current = "";
  for (const line of text.split("\n")) {
    const pieces = line.length > SECTION_TEXT_LIMIT
      ? Array.from({ length: Math.ceil(line.length / SECTION_TEXT_LIMIT) }, (_, index) =>
          line.slice(index * SECTION_TEXT_LIMIT, (index + 1) * SECTION_TEXT_LIMIT))
      : [line];
    for (const piece of pieces) {
      const next = current ? `${current}\n${piece}` : piece;
      if (next.length > SECTION_TEXT_LIMIT && current) {
        sections.push(current);
        current = piece;
      } else {
        current = next;
      }
    }
  }
  if (current) sections.push(current);
  if (sections.length <= MAX_SECTIONS) return sections;
  const kept = sections.slice(0, MAX_SECTIONS);
  kept[MAX_SECTIONS - 1] = `${kept[MAX_SECTIONS - 1]}\n… (truncated — full brief on the site)`;
  return kept;
};

export const buildSlackBriefBlocks = (
  briefText: string,
  recordDate: string,
  options: { imageUrl?: string } = {},
) => {
  const sections = splitSectionText(briefText);

  return [
    { type: "header", text: { type: "plain_text", text: `Whether Weekly Brief — ${recordDate}` } },
    /* The weekly call as rendered, when the Monday cron captured one (lib/export/briefScreenshot.ts).
       Slack fetches the URL once and proxies it, so the block costs one read of the stored PNG. */
    ...(options.imageUrl
      ? [{ type: "image", image_url: options.imageUrl, alt_text: `Whether weekly guidance card for ${recordDate}` }]
      : []),
    ...sections.map((text) => ({ type: "section", text: { type: "mrkdwn", text } })),
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Open the brief" },
          url: siteUrl,
          action_id: "open_brief",
        },
      ],
    },
  ];
};

/**
 * Same data path as GET /api/brief/slack, so both surfaces say the same thing —
 * and, since 2026-09-17, the same readiness judgement.
 *
 * This function already computed a `degraded` flag and the one caller
 * destructured `{ text, recordDate }` and dropped it, so the Monday post went
 * out identically whether the reading was live or a bundled snapshot. The read
 * endpoint published the flag; the artifact people actually read did not.
 *
 * `degraded` was also the wrong flag to have carried: it is `!reportResult.ok`,
 * which stays false through a total upstream outage, because falling back is a
 * success for this loader. That is the exact reading `briefPublishGuard` exists
 * to correct, so readiness is judged there, on the flags that move.
 */
const buildSlackBriefPayload = async (
  reading: Extract<OperatingReading, { source: "report" }>,
  now: Date,
): Promise<{
  text: string;
  recordDate: string;
  readiness: ReturnType<typeof assessReadingReadiness>;
}> => {
  const { treasury } = reading.report;
  const text = buildSlackBrief(await buildBriefDocumentFromReport(reading.report, { degraded: reading.degraded }));
  return {
    text,
    recordDate: treasury.record_date,
    readiness: assessReadingReadiness(reading, now),
  };
};

/**
 * The weekly brief from the operating snapshot the cron just materialized,
 * with no second report read.
 *
 * The cron's `refreshOperatingState` already assembled the snapshot from this
 * run's fresh ingest; the email brief is built from it, and until now the Slack
 * brief re-assembled the whole report (`loadReportDataSafe`) on a second read.
 * Two reads mean two chances to disagree about the same Monday, and a second
 * assembly under the cron step deadline. The snapshot carries assessment,
 * treasury and macro series; the sensors and report dynamics it lacks are
 * derived from the same treasury the snapshot already holds, so the post below
 * is the email's call in Slack's blocks.
 */
const buildSlackBriefPayloadFromSnapshot = async (
  snapshot: OperatingSnapshot,
  now: Date,
): Promise<{
  text: string;
  recordDate: string;
  readiness: ReturnType<typeof assessSnapshotReadiness>;
}> => {
  const { treasury } = snapshot;
  /* The snapshot holds no previous week, so this post prints no last week —
     the builder's rule, rather than a zero move. The call is the snapshot's own
     contract, the one the email reads. */
  const text = buildSlackBrief(buildBriefDocument(briefSourceFromSnapshot(snapshot), snapshot.weeklyCall));
  return {
    text,
    recordDate: treasury.record_date,
    readiness: assessSnapshotReadiness(snapshot, now),
  };
};

export const deliverSlackBrief = async (options?: {
  webhookUrls?: string[];
  fetchImpl?: typeof fetch;
  payload?: { text: string; recordDate: string };
  /** Public URL of this week's stored screenshot, omitted, the post is text blocks as before. */
  imageUrl?: string;
  /** The operating snapshot the caller just materialized; when present the brief
   *  is built from it instead of a second report read. */
  snapshot?: OperatingSnapshot;
  now?: Date;
  /** Post to channels that already had this week's post. The manual route's explicit opt-in; the cron never passes it. */
  force?: boolean;
}): Promise<SlackDeliveryResult> => {
  const now = options?.now ?? new Date();
  const urls = options?.webhookUrls ?? (await slackChannel.listTargets());
  if (urls.length === 0) {
    /* Nothing configured is a real state, not a failure — but it must never be
       reported as "posted". */
    return { ok: true, status: "skipped_unconfigured", attempted: 0, delivered: 0 };
  }

  let payload = options?.payload;
  if (!payload) {
    try {
      /* The cron's snapshot when it passed one. Otherwise the report read, which
         is GET /api/brief/slack's path, so a manual post and the read endpoint
         say the same thing; the store is not read here because the report
         loader already projects the stored snapshot. Either way, readiness is
         the email's check (lib/operatingState/resolveSnapshot.ts). */
      const reading = await resolveOperatingSnapshot({
        given: { snapshot: options?.snapshot },
        onMiss: "report",
        consultStore: false,
        route: "slack/deliver-brief",
      });
      const built = reading.source === "report"
        ? await buildSlackBriefPayload(reading, now)
        : await buildSlackBriefPayloadFromSnapshot(reading.snapshot, now);
      if (!built.readiness.ok) {
        /* Not a failure of this dispatcher, and not a post either. A channel
           that is told nothing this Monday can ask; a channel handed a stale
           reading under this week's heading cannot tell. */
        return {
          ok: false,
          status: "refused_unpublishable",
          attempted: 0,
          delivered: 0,
          recordDate: built.recordDate,
          error: `refused_unpublishable: ${built.readiness.reason}`,
        };
      }
      payload = { text: built.text, recordDate: built.recordDate };
    } catch (error) {
      return {
        ok: false,
        status: "failed",
        attempted: urls.length,
        delivered: 0,
        error: `brief build failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  const { text, recordDate } = payload;
  const blocks = buildSlackBriefBlocks(text, recordDate, { imageUrl: options?.imageUrl });
  /* The top-level text is the notification-preview fallback. A webhook Slack
     has revoked (404/410) is retired inside the fan-out, awaited, so the next
     Monday does not count it as a target. Once per webhook per ISO week, so a
     manual run after the Monday cron does not post the brief twice, and a run
     that failed part-way reaches only the channels it missed. */
  const tally = await slackChannel.deliver(
    urls,
    { blocks, text: `Whether Weekly Brief — ${recordDate}` },
    {
      fetchImpl: options?.fetchImpl,
      once: onceFor(weeklyPeriodKey("weekly-slack", now), { force: options?.force }),
    },
  );

  const skipped = tally.skipped > 0 ? { skipped: tally.skipped } : {};
  const attempted = urls.length - tally.skipped;
  if (attempted === 0) {
    return { ok: true, status: "skipped_already_posted", attempted: 0, delivered: 0, recordDate, ...skipped };
  }

  const delivered = tally.sent;
  /* A retired webhook still missed this week's post, so it counts as failed here. */
  const failed = tally.failed + tally.retired;
  const status: SlackDeliveryStatus = delivered === 0 ? "failed" : failed > 0 ? "partial" : "posted";

  return {
    ok: failed === 0,
    status,
    attempted,
    delivered,
    recordDate,
    ...(failed > 0 ? { error: `${failed}/${attempted} Slack webhooks failed` } : {}),
    ...skipped,
  };
};
