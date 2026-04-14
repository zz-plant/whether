import Link from "next/link";
import { Accordion } from "@base-ui/react/accordion";
import { Collapsible } from "@base-ui/react/collapsible";
import {
  BEGINNER_GLOSSARY_ENTRIES,
  FIRST_TIME_GUIDE_HIGHLIGHTS,
  FIRST_TIME_GUIDE_NEXT_LINKS,
  FIRST_TIME_GUIDE_STEPS,
  GLOSSARY_USAGE_NOTES,
} from "../../../lib/report/reportCopy";

export const FirstTimeGuidePanel = ({
  statusLabel,
  recordDateLabel,
  fetchedAtLabel,
}: {
  statusLabel: string;
  recordDateLabel: string;
  fetchedAtLabel: string;
}) => (
  <section id="first-time-guide" aria-labelledby="first-time-guide-title" className="mt-10">
    <div className="weather-panel weather-panel-static p-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-2xl">
          <p className="type-label text-slate-400">Recommended start</p>
          <h2 id="first-time-guide-title" className="type-section text-slate-100">
            Recommended quick scan in three stops
          </h2>
          <p className="mt-2 type-data text-slate-300">
            Use this walkthrough to align on the core recommendation before you dive into deeper sections.
          </p>
        </div>
        <div className="weather-surface px-4 py-3 text-xs font-semibold tracking-[0.12em] text-slate-300">
          <p className="text-xs text-slate-500">Current snapshot</p>
          <p className="mt-2 text-xs text-slate-200">Status: {statusLabel}</p>
          <p className="mt-1 text-xs text-slate-400">Record: {recordDateLabel}</p>
          <p className="mt-1 text-xs text-slate-500">Fetched: {fetchedAtLabel}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Scan order</p>
          <ul className="space-y-3">
            {FIRST_TIME_GUIDE_STEPS.map((step, index) => (
              <li key={step.label} className="weather-surface p-4 text-sm text-slate-300">
                <Collapsible.Root className="space-y-2">
                  <Collapsible.Trigger
                    type="button"
                    className="group flex min-h-[56px] w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-slate-800/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700/70 bg-slate-950 text-xs font-semibold text-slate-300">
                        {index + 1}
                      </span>
                      <span className="text-xs font-semibold tracking-[0.12em] text-slate-200">{step.label}</span>
                    </span>
                    <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-slate-400">
                      <span>Details</span>
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-700/70 text-slate-400 transition-transform duration-200 group-data-[panel-open]:rotate-180">⌄</span>
                    </span>
                  </Collapsible.Trigger>
                  <Collapsible.Panel className="animate-collapsible-in space-y-2 text-xs text-slate-400">
                    <p>{step.detail}</p>
                    <p className="text-xs text-slate-500">{step.example}</p>
                  </Collapsible.Panel>
                </Collapsible.Root>
              </li>
            ))}
          </ul>
        </div>
        <aside className="weather-surface p-4" aria-label="Onboarding highlights">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
            Quick scan highlights
          </p>
          <ul className="mt-3 space-y-3 text-sm text-slate-300">
            {FIRST_TIME_GUIDE_HIGHLIGHTS.map((highlight) => (
              <li key={highlight.text} className="flex gap-2">
                <span className="text-slate-500">•</span>
                <span>{highlight.text}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-lg border border-sky-900/60 bg-slate-950/60 p-3 text-xs text-slate-400">
            Tip: share the selected past-snapshot URL to keep assumptions aligned.
          </div>
        </aside>
      </div>

      <div className="mt-6 space-y-3 text-sm text-slate-300">
        <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Where to go next</p>
        <ul className="grid gap-2 md:grid-cols-3">
          {FIRST_TIME_GUIDE_NEXT_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="weather-surface touch-target inline-flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100"
              >
                {link.label}
                <span aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-4 text-xs text-slate-300">
        Share the URL when you lock watch lines or past-snapshot selections so every stakeholder sees
        the same posture assumptions.
      </p>
    </div>
  </section>
);

export const BeginnerGlossaryPanel = () => (
  <section id="beginner-glossary" aria-labelledby="beginner-glossary-title" className="mt-10 scroll-mt-28">
    <div className="weather-panel weather-panel-static p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="type-label text-slate-400">Glossary</p>
          <h3 id="beginner-glossary-title" className="type-section text-slate-100">
            Translate finance terms into day-to-day product decisions
          </h3>
          <p className="mt-2 type-data text-slate-300">
            New to Treasury data? Reference this glossary as needed to translate unfamiliar terms into
            concrete product moves before you share the report.
          </p>
        </div>
        <div className="weather-surface px-4 py-3 text-xs font-semibold tracking-[0.12em] text-slate-300">
          <p className="text-xs text-slate-500">Onboarding lens</p>
          <p className="mt-2 text-xs text-slate-200">Plain English over jargon</p>
          <p className="mt-1 text-xs text-slate-400">Focus on constraints</p>
        </div>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
        <aside className="weather-surface p-4" aria-label="Glossary sidebar">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Glossary terms</p>
          <Accordion.Root multiple className="mt-3 space-y-3 text-sm text-slate-300">
            {BEGINNER_GLOSSARY_ENTRIES.map((entry) => (
              <Accordion.Item
                key={entry.value}
                value={entry.value}
                className="rounded-xl border border-slate-800/80 bg-slate-950/40 px-3 py-2"
              >
                <Accordion.Header>
                  <Accordion.Trigger className="group flex min-h-[44px] w-full items-center justify-between gap-3 py-2 text-left touch-manipulation">
                    <span>
                      <span className="text-xs font-semibold tracking-[0.12em] text-slate-200">
                        {entry.term}
                      </span>
                      <span className="mt-1 block text-xs text-slate-400">
                        {entry.summary}
                      </span>
                      <span className="mt-1 block text-[11px] uppercase tracking-[0.14em] text-slate-500">Select to expand or collapse</span>
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
                  <p className="text-xs text-slate-500">{entry.why}</p>
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
    </div>
  </section>
);
