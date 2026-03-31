import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mockups",
  description: "Visual mockups and UI experiments for Whether.",
  robots: {
    index: false,
    follow: false,
  },
};

const mockups = [
  {
    href: "/mockups/operator-brief",
    title: "Operator-First Weekly Brief",
    summary:
      "A simpler weekly-call concept that assumes the user wants an operating recommendation, not a macro lesson.",
    tags: ["weekly call", "operator-first", "proof-on-demand"],
  },
] as const;

const starterViews = [
  { label: "Mobile", suffix: "?viewport=mobile&density=compact" },
  { label: "Tablet", suffix: "?viewport=tablet&density=comfortable" },
  { label: "Desktop", suffix: "?viewport=desktop&density=comfortable" },
] as const;

export default function MockupsIndexPage() {
  return (
    <main id="main-content" tabIndex={-1} className="weather-page-shell weather-page-shell-wide">
      <section className="weather-panel rounded-[2.2rem] border border-slate-700/70 px-5 py-8 sm:px-8 sm:py-10">
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
            Visual Lab
          </p>
          <h1
            className="max-w-4xl text-4xl font-semibold text-white sm:text-5xl"
            style={{ fontFamily: "var(--weather-font-display)" }}
          >
            Faster UI iteration, without touching the main product flow.
          </h1>
          <p className="max-w-3xl text-base leading-7 text-slate-200">
            Use this area for concept pages, focused visual experiments, and role-specific drafts.
            Mockups here are isolated, noindexed, and optimized for quick comparison across
            viewport sizes.
          </p>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <div className="space-y-5">
          {mockups.map((mockup) => (
            <article key={mockup.href} className="weather-panel rounded-[1.9rem] border border-slate-700/70 px-5 py-5">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {mockup.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex min-h-[36px] items-center rounded-full border border-slate-700/80 bg-slate-950/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div>
                  <h2
                    className="text-2xl font-semibold text-white"
                    style={{ fontFamily: "var(--weather-font-display)" }}
                  >
                    {mockup.title}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{mockup.summary}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={mockup.href} className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em]">
                    Open mockup
                  </Link>
                  {starterViews.map((view) => (
                    <Link
                      key={view.label}
                      href={`${mockup.href}${view.suffix}`}
                      className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.12em] text-slate-100"
                    >
                      {view.label}
                    </Link>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>

        <aside className="weather-panel rounded-[1.9rem] border border-slate-700/70 px-5 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Working Rules
          </p>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
            <li>Build new UI directions here before rewriting primary routes.</li>
            <li>Put viewport and density in the URL so visual state is shareable.</li>
            <li>Keep each mockup scoped to one strong idea, not a whole redesign kitchen sink.</li>
            <li>Use these pages for screenshot review and comparison, not final copy judgment.</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
