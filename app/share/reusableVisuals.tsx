import type { BriefVideoAsset } from "../../lib/export/briefVideo";
import { BriefVideoPreview } from "../components/briefVideoPreview";
import { ActionLink } from "../components/ui/actionLink";

export function ReusableVisuals({ video, weekLabel }: { video?: BriefVideoAsset; weekLabel?: string }) {
  return (
    <section id="reusable-visuals" className="weather-panel weather-section-stack p-0" aria-labelledby="reusable-visuals-heading">
      <h2 id="reusable-visuals-heading" className="type-section">Visuals for your next brief</h2>
      {video && weekLabel ? (
        <details className="border-b border-[color:var(--border-subtle)] pb-4">
          <summary className="weather-hit w-fit cursor-pointer text-fluid-sm font-semibold text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
            Video · week of {weekLabel}
          </summary>
          <div className="pt-3">
            <BriefVideoPreview asset={video} label={`Published guidance for the week of ${weekLabel}`} />
          </div>
        </details>
      ) : null}
      <details>
        <summary className="weather-hit w-fit cursor-pointer text-fluid-sm font-semibold text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
          Reusable diagrams, charts and slide templates
        </summary>
        <div className="max-w-3xl space-y-3 pt-3">
          <p className="text-fluid-sm leading-relaxed text-slate-400">
            Download editable graphics for conditions, operating areas and decision lines, plus chart and presentation templates in both themes.
            Each example is labeled so you can replace its sample values with your own reading.
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <ActionLink href="/visual-assets/index.html" variant="inline">Browse the visual library</ActionLink>
          </div>
        </div>
      </details>
    </section>
  );
}
