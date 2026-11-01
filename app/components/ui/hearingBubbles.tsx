"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

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
  const [copiedAnswer, setCopiedAnswer] = useState<string | null>(null);

  const copyScript = async (answer: string) => {
    try {
      await navigator.clipboard.writeText(answer);
      setCopiedAnswer(answer);
      setTimeout(() => setCopiedAnswer(null), 2000);
    } catch {
      // Ignore clipboard write issues
    }
  };

  return (
    <ul className={`space-y-6 ${className}`.trim()}>
      {entries.map((entry) => {
        const isCopied = copiedAnswer === entry.answer;
        return (
          <li key={`${entry.from}-${entry.question}`} className="space-y-2.5">
            {/* Stakeholder Pushback Bubble */}
            <div className="flex">
              <blockquote className="max-w-[88%] rounded-2xl rounded-bl-sm border border-[color:var(--border-default)] bg-[color:var(--bg-nested)] p-3.5 text-sm text-slate-200 shadow-sm">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="inline-block size-1.5 rounded-full bg-slate-400" aria-hidden="true" />
                  <p className="type-eyebrow text-slate-400 font-semibold">{entry.from}</p>
                </div>
                <p className="leading-snug">“{entry.question}”</p>
              </blockquote>
            </div>

            {/* Leadership Script Response Bubble */}
            <div className="flex justify-end">
              <div className="group relative max-w-[88%] rounded-2xl rounded-br-sm border border-[color:var(--border-strong)] bg-[color:var(--bg-panel)] p-3.5 text-sm text-slate-100 shadow-md">
                <div className="flex items-center justify-between gap-4 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block size-1.5 rounded-full bg-[color:var(--app-text)]" aria-hidden="true" />
                    <p className="type-eyebrow text-slate-300 font-semibold">What to say</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copyScript(entry.answer)}
                    aria-label={`Copy reply to ${entry.from}`}
                    className="inline-flex min-h-[24px] items-center gap-1 rounded border border-[color:var(--border-subtle)] bg-[color:var(--bg-nested)] px-2 py-0.5 text-fluid-nano text-slate-300 opacity-90 transition-colors hover:border-[color:var(--border-default)] hover:bg-[color:var(--bg-card)] hover:text-slate-100 focus-visible:opacity-100"
                  >
                    {isCopied ? (
                      <>
                        <Check className="size-3 text-emerald-400" aria-hidden="true" />
                        <span className="text-emerald-400 font-medium">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" aria-hidden="true" />
                        <span>Copy script</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="leading-snug text-slate-100">{entry.answer}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
