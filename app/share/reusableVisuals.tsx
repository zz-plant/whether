import { ActionLink } from "../components/ui/actionLink";

export function ReusableVisuals() {
  return (
    <section id="reusable-visuals" className="weather-panel weather-section-stack p-0" aria-labelledby="reusable-visuals-heading">
      <h2 id="reusable-visuals-heading" className="type-section">Visuals for your own decks and docs</h2>
      <details>
        <summary className="weather-hit w-fit cursor-pointer text-fluid-sm font-semibold text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
          Reusable diagrams, charts and slide templates
        </summary>
        <div className="max-w-3xl space-y-3 pt-3">
          <p className="text-fluid-sm leading-relaxed text-slate-400">
            Editable light and dark graphics, charts, and slide templates with labeled placeholder values.
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <ActionLink href="/visual-assets/" variant="inline">Browse the visual library</ActionLink>
          </div>
        </div>
      </details>
    </section>
  );
}
