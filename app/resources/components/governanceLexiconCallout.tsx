import { governanceLexicon, type GovernanceLexiconTerm } from "../../../lib/resourcesContent";

export function GovernanceLexiconCallout({
  termSlug,
}: {
  termSlug: GovernanceLexiconTerm["slug"];
}) {
  const term = governanceLexicon.find((entry) => entry.slug === termSlug);
  if (!term) return null;

  return (
    <aside className="weather-surface !border-sky-400/40 !bg-sky-500/10 px-4 py-4">
      <h3 className="text-base font-semibold text-slate-100">{term.term}</h3>
      <p className="mt-2 text-sm text-slate-200">{term.definition}</p>
      <p className="mt-2 text-sm text-slate-300">
        <span className="font-semibold text-slate-100">Board prompt:</span> {term.boardPrompt}
      </p>
    </aside>
  );
}
