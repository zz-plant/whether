import Link from "next/link";
import { Accordion } from "@base-ui/react/accordion";
import {
  BEGINNER_GLOSSARY_ENTRIES,
  GLOSSARY_USAGE_NOTES,
} from "../../../lib/report/reportCopy";

export const BeginnerGlossaryPanel = () => (
  <section id="beginner-glossary" aria-labelledby="beginner-glossary-title" className="mt-10">
    <div className="weather-panel weather-panel-static p-6">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_16rem] sm:items-start">
        <div>
          <p className="type-label text-slate-400">Glossary</p>
          <h3 id="beginner-glossary-title" className="type-section text-slate-100">
            Translate finance terms into day-to-day product decisions
          </h3>
          <p className="mt-2 type-data text-slate-300">
            New to Treasury data? Reference this glossary as needed to translate unfamiliar U.S. market terms into
            concrete product moves before you share the report.
          </p>
        </div>
        <div className="weather-surface min-w-0 px-4 py-3 text-xs font-semibold tracking-[0.12em] text-slate-300">
          <p className="text-xs text-slate-400">Onboarding lens</p>
          <p className="mt-2 text-xs text-slate-200">Plain English over jargon</p>
          <p className="mt-1 text-xs text-slate-400">U.S. market terms, then constraints</p>
        </div>
      </div>
      {/* Collapsed by default. This is reference — you look one term up, you do
          not read 26 — and expanded it was 4,888px, two-fifths of /trust on a
          phone. §XII collapses the evidence behind a claim and never the claim,
          and nothing here is needed to judge this week's call. The six links
          that point at #beginner-glossary still open it: AnchorFeedback expands
          a disclosure containing the anchor before scrolling to it. */}
      <details className="weather-auto-chevron mt-6 group">
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 rounded-md text-sm text-slate-200">
          <span>
            Open the glossary
            <span className="ml-2 text-xs text-slate-400">
              {BEGINNER_GLOSSARY_ENTRIES.length} terms, each with what it changes for you
            </span>
          </span>
        </summary>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
        <aside className="weather-surface p-4" aria-label="Glossary sidebar">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Glossary terms</p>
          <Accordion.Root multiple className="mt-3 space-y-3 text-sm text-slate-300">
            {BEGINNER_GLOSSARY_ENTRIES.map((entry) => (
              <Accordion.Item
                key={entry.value}
                value={entry.value}
                className="rounded-md border border-slate-800/80 bg-slate-950/40 px-3 py-2"
              >
                <Accordion.Header>
                  <Accordion.Trigger className="group flex min-h-[44px] w-full items-center justify-between gap-3 py-2 text-left">
                    <span>
                      <span className="text-xs font-semibold tracking-[0.12em] text-slate-200">
                        {entry.term}
                      </span>
                      <span className="mt-1 block text-xs text-slate-400">
                        {entry.summary}
                      </span>
                    </span>
                    <span className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-slate-700/70 text-slate-300 transition-transform group-data-[panel-open]:rotate-180" aria-hidden="true">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                        <path
                          d="M7 10l5 5 5-5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Panel className="mt-3 space-y-2 text-sm text-slate-400">
                  <p className="text-xs text-slate-400">{entry.why}</p>
                  <p className="text-xs text-slate-400">
                    Used in:{" "}
                    <Link
                      href={entry.usedInHref}
                      className="touch-target inline-flex min-h-[44px] items-center text-xs text-slate-300 underline decoration-slate-500 underline-offset-4 hover:text-slate-100"
                    >
                      {entry.usedInLabel}
                    </Link>
                  </p>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </aside>
        <div className="space-y-4">
          {GLOSSARY_USAGE_NOTES.map((note) => (
            <div key={note.title} className="weather-surface p-4 text-sm text-slate-300">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-200">{note.title}</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-400">
                {note.bullets.map((bullet) => (
                  <li key={bullet.emphasis}>
                    <span className="text-slate-200">{bullet.emphasis}</span>{" "}
                    {bullet.detail}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        </div>
      </details>
    </div>
  </section>
);
