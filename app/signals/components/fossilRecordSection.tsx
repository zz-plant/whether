import { insightDatabase } from "../../../data/recommendations";
import { UrlDetails } from "../../components/ui/urlDetails";

export function FossilRecordSection({ regime, open = false }: { regime?: string; open?: boolean }) {
  const { fossilRecord } = insightDatabase;
  const isTightClimate = regime === "SCARCITY" || regime === "DEFENSIVE";

  return (
    <section
      id="fossil-record"
      aria-labelledby="fossil-record-title"
      className="weather-panel scroll-mt-28 space-y-5 p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="type-card-label text-sky-300">
            {fossilRecord.title} · {fossilRecord.subtitle}
          </p>
          <h3 id="fossil-record-title" className="mt-1 text-base font-semibold text-slate-100">
            Spotting ZIRP-Era Legacy Artifacts in Today&apos;s Climate
          </h3>
          <p className="mt-1 max-w-3xl text-fluid-xs leading-relaxed text-slate-400">
            {fossilRecord.description}
            {isTightClimate
              ? " Under current tight macro conditions, lingering ZIRP-era artifacts create unbudgeted coordination drag and drain cash."
              : " Compare your current operating architecture against historical low-rate and high-rate artifacts."}
          </p>
        </div>
        <span className="rounded border border-slate-700/70 bg-slate-900/60 px-2.5 py-1 text-fluid-nano font-mono text-slate-300">
          Current: {regime ?? "TIGHT"} CLIMATE
        </span>
      </div>

      {/* Collapsed by default. This is architecture reference on the evidence
          page, and a six-row, four-column table of prose is unreadable at phone
          width; the header above states what it is, the disclosure carries the
          table. URL-carried so a shared link opens it. */}
      <UrlDetails
        queryKey="fossil"
        initialOpen={open}
        className="weather-auto-chevron"
        summaryClassName="cursor-pointer select-none rounded-lg border border-slate-800/60 bg-slate-950/30 px-3 py-2 text-fluid-xs font-medium text-slate-300"
        summary={<span>Show the artifact table ({fossilRecord.rows.length} domains)</span>}
      >
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
                <td className="py-3 text-slate-300 align-top leading-relaxed text-fluid-nano italic">
                  &ldquo;{row.insight}&rdquo;
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-fluid-nano text-slate-500">
        Source: Whether Insight Database · Precedents from 2001, 2008, and 2022 regime shifts.
      </p>
      </UrlDetails>
    </section>
  );
}
