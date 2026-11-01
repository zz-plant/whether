/**
 * What the reader is likely to hear in the room — pushback, a take or a
 * question — and what the published line says back, as one pair of chat
 * bubbles. Shared by the role panels on Guides and the homepage section, so
 * the two surfaces cannot draw the same content two ways.
 *
 * The group speaks on the left, in a recessed bubble with a square bottom-left
 * corner; the reply sits right-aligned on the panel surface with a square
 * bottom-right corner, so the response is as visible as the pushback. Both
 * sides carry a sentence-case eyebrow (`type-eyebrow`, §XVIII) naming who is
 * speaking and what to say back.
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
            <blockquote className="max-w-[85%] rounded-2xl rounded-bl-sm border border-[color:var(--border-default)] bg-[color:var(--bg-nested)] px-3.5 py-2.5 text-sm text-slate-200">
              <p className="type-eyebrow text-slate-400">{entry.from}</p>
              <p className="mt-0.5 leading-snug">“{entry.question}”</p>
            </blockquote>
          </div>
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-sm border border-[color:var(--border-strong)] bg-[color:var(--bg-panel)] px-3.5 py-2.5 text-sm text-slate-100">
              <p className="type-eyebrow text-slate-400">What to say</p>
              <p className="mt-0.5 leading-snug">{entry.answer}</p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
