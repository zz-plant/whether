import { ReportSection } from "../components/reportSection";

/**
 * The one number the product was built to move: whether anyone came back.
 *
 * `lib/activationFunnel.ts` fires `returned` on a reader who opens the brief in a later ISO
 * week than the one they last read. Every surface dispatched it and, until this section,
 * nothing read it back — so `ROADMAP.md`'s "fix the funnel leak before adding surface" could
 * not be answered without a credentialed script run by hand.
 *
 * ## It reads KV, not Analytics Engine
 *
 * The number is stored by the Monday cron step (`recordActivationFunnel`), and this section
 * reads that stored record. The obvious alternative — calling `loadActivationFunnelReport`
 * from the page — would put a paged, multi-query read of a third-party SQL API on the render
 * path of a page that already has a 10s report deadline, for a figure that changes once a
 * week. This way the page does one KV get, the external read happens on a schedule where a
 * failure is a logged cron step rather than a slow page, and the number survives a run that
 * could not reach Analytics Engine instead of disappearing.
 *
 * ## The copy is the reporter's, not this file's
 *
 * `formatActivationFunnelLine` owns the sentence, so the line here and the line the cron
 * logs are the same claim. What this file adds is the sentence around it: what a return is,
 * that the count is events and not people, and when the figure was taken. On a page whose
 * subject is how much to trust the numbers, an undated count is the one number on it that
 * cannot be trusted.
 */

// Date only, and in UTC: the record is written by a scheduled run, so it has no reader's
// timezone to speak for. Formatting it in the viewer's zone would move the stamp a day
// either side of the run that produced it.
const recordDateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  year: "numeric",
  month: "short",
  day: "numeric",
});

type ReaderReturnsProps = {
  /** Null when no weekly run has ever written a record. */
  line: string | null;
  /** When the stored record was written, for the stamp. */
  generatedAt: string;
};

export function ReaderReturnsSection({ line, generatedAt }: ReaderReturnsProps) {
  /*
   * No stored record yet, or a record whose two weeks both held nothing. Same rule as
   * `RunHistorySection` on an unconfigured read: a section that would say "0" when the
   * truth is "we have not measured" is worse than no section, so it renders nothing and
   * the rail's index entry goes with it.
   */
  if (!line) return null;

  return (
    <ReportSection
      id="reader-returns"
      title="Reader returns"
      description="How many browsers opened the brief in a later week than the one they last had it."
    >
      <p className="text-sm text-slate-100">{line}</p>
      <p className="mt-2 text-xs leading-5 text-slate-400">
        Counting stops once a browser has been counted in a week, so a week holds at most one
        return per browser. It is not a headcount: a reader with a laptop and a phone counts
        twice, which is why this is a count and not a rate. Recorded{" "}
        {recordDateFormat.format(new Date(generatedAt))} by the weekly run.
      </p>
    </ReportSection>
  );
}
