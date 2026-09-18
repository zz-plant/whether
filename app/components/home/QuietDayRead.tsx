/**
 * The quiet-day read: one compact line under the call telling a returning
 * reader on a non-Monday that the call still stands and how far it is from
 * flipping. Server-rendered from the same snapshot the hero uses — nothing to
 * fetch, nothing stored. Renders nothing when the call moved or when no flip
 * axis is reachable (`buildQuietDayRead` returns null).
 */
export function QuietDayRead({ line }: { line: string | null }) {
  if (!line) return null;

  return (
    <p
      data-testid="quiet-day-read"
      className="rounded-lg border border-slate-800/60 bg-slate-950/30 px-4 py-2.5 text-fluid-xs leading-5 text-slate-300"
    >
      <span className="font-semibold text-white">Call unchanged.</span>{" "}
      {line.replace(/^Call unchanged —\s*/, "")}
    </p>
  );
}