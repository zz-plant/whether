import { insightDatabase } from "../../../data/recommendations";
import { UrlDetails } from "../../components/ui/urlDetails";
import { describeFossilSummary } from "../../../lib/report/evidenceInstrumentSummaries";
import { InstrumentQuestion } from "./instrumentQuestion";

/**
 * The last of the evidence page's instruments: a disclosure titled with the
 * question it answers. It was a heading block with a second, boxed "Show the
 * table" disclosure inside the instruments list, the only item that opened
 * twice. One disclosure now, URL-carried so a shared link opens it.
 */
export function FossilRecordSection({
  regime,
  open = false,
  className,
  summaryClassName,
}: {
  regime?: string;
  open?: boolean;
  className?: string;
  summaryClassName?: string;
}) {
  const { fossilRecord } = insightDatabase;
  const isTightClimate = regime === "SCARCITY" || regime === "DEFENSIVE";

  return (
    <UrlDetails
      id="fossil-record"
      queryKey="fossil"
      initialOpen={open}
      className={className}
      summaryClassName={summaryClassName}
      summary={
        <InstrumentQuestion
          question="Which habits from the zero-rate years still shape your company?"
          answer={describeFossilSummary(fossilRecord.rows)}
        />
      }
    >
      {/* The header used to carry a mono chip reading "Now: {regime}", which
          restated the page's status line one screen up, and the table ended
          on a "Source: Whether Insight Database" footer — the product citing
          itself. Both are gone; the regime still shapes the sentence below. */}
      <div>
        <p className="type-eyebrow">
          {fossilRecord.title} · {fossilRecord.subtitle}
        </p>
        <p className="mt-1 max-w-3xl text-fluid-xs leading-relaxed text-slate-400">
          {fossilRecord.description}
          {isTightClimate
            ? " With money this expensive, worth checking whether any of these still shape your budget."
            : " A way to check how your company is set up against habits from low-rate and high-rate years."}
        </p>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] table-fixed border-collapse text-left text-fluid-xs">
          <colgroup>
            <col className="w-1/6" />
            <col className="w-1/4" />
            <col className="w-1/4" />
            <col className="w-1/3" />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-800 text-slate-400">
              <th scope="col" className="py-2.5 pr-3 font-medium">
                {fossilRecord.columns.domain}
              </th>
              <th scope="col" className="py-2.5 pr-3 font-medium">
                <span className="inline-flex items-center gap-1.5 text-amber-300/90">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden="true" />
                  {fossilRecord.columns.lowRateArtifact}
                </span>
              </th>
              <th scope="col" className="py-2.5 pr-3 font-medium">
                <span className="inline-flex items-center gap-1.5 text-sky-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400" aria-hidden="true" />
                  {fossilRecord.columns.highRateArtifact}
                </span>
              </th>
              <th scope="col" className="py-2.5 font-medium text-slate-300">
                {fossilRecord.columns.insight}
              </th>
            </tr>
          </thead>
          <tbody>
            {fossilRecord.rows.map((row) => (
              <tr
                key={row.domain}
                className="border-b border-slate-800/40 last:border-0 hover:bg-slate-900/30 transition-colors"
              >
                <td className="py-3 pr-3 font-semibold text-slate-200 align-top">
                  {row.domain}
                </td>
                <td className="py-3 pr-3 text-slate-400 align-top leading-relaxed">
                  <span className="line-through decoration-slate-600/80">
                    {row.lowRateArtifact}
                  </span>
                </td>
                <td className="py-3 pr-3 text-slate-100 font-medium align-top leading-relaxed">
                  {row.highRateArtifact}
                </td>
                <td className="py-3 text-slate-300 align-top leading-relaxed text-fluid-nano">
                  &ldquo;{row.insight}&rdquo;
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </UrlDetails>
  );
}
