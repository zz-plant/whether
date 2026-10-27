/**
 * The one message the pipeline sends its owner: which scheduled steps failed on a run.
 *
 * Every step already writes a `cron-step` row, and `/trust` reads them back — but only where
 * the analytics read token is set, and only for someone who opens the page. Nothing pushed a
 * failure anywhere, so the pipeline could run unattended only as long as somebody checked on
 * it. The Sunday-firing weekly cron ran for five months that way.
 *
 * One email per run with failures, to `WHETHER_OPS_EMAIL`, through the same binding and shell
 * as every other send. A run where everything succeeded sends nothing: a notice that arrives
 * every day is one nobody reads.
 */
import { createCloudflareEmailAdapter, type EmailDeliveryAdapter } from "../email/emailDelivery";
import { emailTextFooter, escapeHtml, renderEmailShell } from "../email/emailShell";
import { OG_TEXT_SECONDARY } from "../image/ogTheme";
import { readSetting } from "../runtime/settings";
import { cronStepLabel } from "../telemetry/runHistory";

export type FailedStep = { step: string; error?: string };

type OpsNoticeResult = { ok: true; sent: boolean } | { ok: false; error: string };

/** An error is a message, not a log: long ones are stack-shaped and say nothing more past here. */
const ERROR_PREVIEW_CHARS = 300;

const preview = (error: string | undefined) => {
  const text = (error ?? "no reason recorded").trim();
  return text.length > ERROR_PREVIEW_CHARS ? `${text.slice(0, ERROR_PREVIEW_CHARS)}…` : text;
};

/**
 * Tells the owner what failed on one run. Never throws.
 *
 * `ok: true, sent: false` means nothing failed. A run that failed with no address configured
 * is `ok: false`: a failure nobody was told about is the state this module exists to end, so
 * it is reported as one rather than skipped.
 */
export const sendOpsFailureNotice = async (
  { run, failures }: { run: string; failures: FailedStep[] },
  adapter?: EmailDeliveryAdapter,
): Promise<OpsNoticeResult> => {
  if (failures.length === 0) return { ok: true, sent: false };

  const to = readSetting("WHETHER_OPS_EMAIL");
  if (!to) return { ok: false, error: "unconfigured: WHETHER_OPS_EMAIL is not set" };

  const lines = failures.map(({ step, error }) => ({ label: cronStepLabel(step), error: preview(error) }));
  const subject = `Whether: ${failures.length === 1 ? "1 scheduled step" : `${failures.length} scheduled steps`} failed`;
  const listHtml = lines
    .map(({ label, error }) => `<li style="margin:0 0 8px;"><strong>${escapeHtml(label)}</strong> — ${escapeHtml(error)}</li>`)
    .join("");

  try {
    const result = await (adapter ?? createCloudflareEmailAdapter()).send({
      to: { email: to },
      subject,
      html: renderEmailShell({
        title: subject,
        body: [
          `<p style="color:${OG_TEXT_SECONDARY};">${escapeHtml(run)}</p>`,
          `<ul style="padding-left:20px;">${listHtml}</ul>`,
        ].join("\n"),
      }),
      text: [subject, run, "", ...lines.map(({ label, error }) => `- ${label}: ${error}`), "", ...emailTextFooter(null)].join("\n"),
    });
    return result.ok ? { ok: true, sent: true } : { ok: false, error: result.error };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
};
