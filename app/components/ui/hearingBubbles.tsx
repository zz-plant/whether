/**
 * A question the published lines invite, and the line's answer, as one pair of
 * chat bubbles. Shared by the role panels on Guides and the homepage section, so
 * the two surfaces cannot draw the same content two ways.
 *
 * The group asks on the left, in a recessed bubble with a square bottom-left
 * corner; the answer sits right-aligned on the panel surface with a square
 * bottom-right corner, so the reply is as visible as the worry. The speaker is
 * named inside the bubble: a thread with no name over it reads as the reader's
 * own thought.
 */
type HearingBubble = {
  /** Who is speaking: the function or group, never "your <role>". */
  from: string;
  question: string;
  answer: string;
};

export function HearingBubbles({
  entries,
  className = "",
}: {
  entries: readonly HearingBubble[];
  className?: string;
}) {
  return (
    <ul className={`space-y-5 ${className}`.trim()}>
      {entries.map((entry) => (
        <li key={`${entry.from}-${entry.question}`} className="space-y-2">
          <div className="flex">
            <blockquote className="max-w-[85%] rounded-2xl rounded-bl-sm border border-[color:var(--border-default)] bg-[color:var(--bg-nested)] px-3 py-2 text-sm text-slate-200">
              <p className="text-fluid-nano font-semibold uppercase tracking-wide text-slate-400">{entry.from}</p>
              <p className="mt-0.5">{entry.question}</p>
            </blockquote>
          </div>
          <div className="flex justify-end">
            <p className="max-w-[85%] rounded-2xl rounded-br-sm border border-[color:var(--border-strong)] bg-[color:var(--bg-panel)] px-3 py-2 text-sm text-slate-100">
              <span className="sr-only">The line says: </span>
              {entry.answer}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
