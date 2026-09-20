import type { Metadata } from "next";
import Link from "next/link";
import { Accordion } from "@base-ui/react/accordion";

import { buildPageMetadata } from "../../lib/seo";
import {
  SecondaryPageHeader,
  SecondaryPageSection,
  SecondaryPageShell,
} from "../components/secondaryPageShell";
import { BEGINNER_GLOSSARY_ENTRIES, GLOSSARY_USAGE_NOTES } from "../../lib/report/reportCopy";
import { GlossaryCompassGlyph } from "../components/illustrations/GlossaryCompassGlyph";

export const runtime = "edge";

/**
 * The glossary, on its own route.
 *
 * It lived at `/trust#beginner-glossary`, so every "unfamiliar with a term?"
 * link on the site — the hero's, the answer pages', the signal cards' — sent a
 * reader who did not know what funding pressure meant to a page named **Trust**,
 * whose subject is freshness, source coverage and confidence. A definition is
 * not a trust artifact, and the reader arriving at one is the reader least able
 * to work out why they are on the page they landed on.
 *
 * It was also collapsed there, behind a disclosure, for a reason that was real
 * on that page and does not apply here: expanded, 26 terms ran 4,888px, which is
 * two-fifths of `/trust` on a phone. A page whose only job is the glossary has
 * nothing to bury it under, so the terms are open.
 */
export const metadata: Metadata = buildPageMetadata({
  title: "Glossary",
  description:
    "Plain-English definitions of every term Whether uses — funding pressure, risk appetite, the short-term borrowing rate — and what each one changes for an operator.",
  path: "/glossary",
  imageAlt: "Whether glossary of macro terms",
});

export default function GlossaryPage() {
  return (
    <SecondaryPageShell width="standard">
      <SecondaryPageHeader
        eyebrow="Reference"
        title="Glossary"
        description="Every term this site uses, in plain English, with what it changes for the company you run."
        aside={<GlossaryCompassGlyph size={64} />}
      />

      <SecondaryPageSection
        title={`${BEGINNER_GLOSSARY_ENTRIES.length} terms`}
        description="Each entry says what the term measures, why it matters to an operating decision, and where on the site it is used."
      >
        <Accordion.Root multiple className="space-y-3 text-sm text-slate-300">
          {BEGINNER_GLOSSARY_ENTRIES.map((entry) => (
            <Accordion.Item
              key={entry.value}
              value={entry.value}
              /* The id is the term's own slug, so a link can land on one
                 definition rather than on the top of a list of 26. */
              id={entry.value}
              className="rounded-md border border-slate-800/80 bg-slate-950/40 px-3 py-2"
            >
              <Accordion.Header>
                <Accordion.Trigger className="group flex min-h-[44px] w-full items-center justify-between gap-3 py-2 text-left">
                  <span>
                    <span className="text-sm font-semibold text-slate-100">{entry.term}</span>
                    <span className="mt-1 block text-xs text-slate-400">{entry.summary}</span>
                  </span>
                  <span
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-slate-700/70 text-slate-300 transition-transform group-data-[panel-open]:rotate-180"
                    aria-hidden="true"
                  >
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
      </SecondaryPageSection>

      <SecondaryPageSection
        title="How to read the numbers"
        description="Two habits that make the weekly call quicker to act on."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {GLOSSARY_USAGE_NOTES.map((note) => (
            <div key={note.title} className="weather-surface p-4 text-sm text-slate-300">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-200">{note.title}</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-400">
                {note.bullets.map((bullet) => (
                  <li key={bullet.emphasis}>
                    <span className="text-slate-200">{bullet.emphasis}</span> {bullet.detail}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </SecondaryPageSection>
    </SecondaryPageShell>
  );
}
