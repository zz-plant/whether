import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mockup — Operator-First Weekly Brief",
  description: "Concept mockups for a simpler operator-first Whether experience.",
  robots: {
    index: false,
    follow: false,
  },
};

const roleOptions = [
  { label: "Product / Eng", active: true },
  { label: "Finance", active: false },
  { label: "Company Planning", active: false },
] as const;

const decisionRows = [
  {
    label: "What changed",
    value: "Funding conditions are still selective, but the read is more stable than last week.",
    tone: "border-amber-300/30 bg-amber-300/10 text-amber-50",
  },
  {
    label: "Do now",
    value: "Reopen selective hiring for revenue-linked product and platform work.",
    tone: "border-emerald-300/30 bg-emerald-300/10 text-emerald-50",
  },
  {
    label: "Do not do this",
    value: "Do not add long-payback bets that require 12+ months of uninterrupted funding confidence.",
    tone: "border-rose-300/30 bg-rose-300/10 text-rose-50",
  },
  {
    label: "Recheck if",
    value: "Confidence falls or funding conditions tighten again next week.",
    tone: "border-sky-300/30 bg-sky-300/10 text-sky-50",
  },
] as const;

const proofItems = [
  {
    label: "Why we believe this",
    value: "Rates are not easing fast, but the latest read no longer argues for broad retrenchment.",
  },
  {
    label: "Safe to use?",
    value: "Yes. Good enough for weekly planning, but keep new fixed cost reversible.",
  },
  {
    label: "Explain it in plain English",
    value: "Money is still expensive, but not worsening fast enough to justify freezing every forward move.",
  },
] as const;

const artifactBullets = [
  "Add only hires tied to shipped roadmap or near-term revenue.",
  "Keep payback expectations tight on new roadmap bets.",
  "Wait on category expansions until the stability read improves again.",
] as const;

function MockupFrame({
  eyebrow,
  title,
  summary,
  children,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <section className="weather-panel relative overflow-hidden rounded-[2rem] border border-slate-700/70 p-5 sm:p-7">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-80"
        style={{
          background:
            "radial-gradient(60% 100% at 12% 0%, rgba(251, 191, 36, 0.18), transparent 72%), radial-gradient(56% 120% at 88% 0%, rgba(45, 212, 191, 0.14), transparent 74%)",
        }}
      />
      <div className="relative space-y-5">
        <header className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">{eyebrow}</p>
          <h2
            className="text-2xl font-semibold text-white sm:text-3xl"
            style={{ fontFamily: "var(--weather-font-display)" }}
          >
            {title}
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">{summary}</p>
        </header>
        {children}
      </div>
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
      {children}
    </p>
  );
}

export default function OperatorBriefMockupPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14"
    >
      <section className="relative overflow-hidden rounded-[2.25rem] border border-cyan-300/20 bg-slate-950/80 px-5 py-8 sm:px-8 sm:py-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(46rem 26rem at 0% 0%, rgba(34, 211, 238, 0.16), transparent 62%), radial-gradient(30rem 18rem at 100% 0%, rgba(251, 191, 36, 0.14), transparent 58%), linear-gradient(180deg, rgba(15, 23, 42, 0.86), rgba(2, 6, 23, 0.96))",
          }}
        />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.85fr)] lg:items-end">
          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
              Mockups · Operator-First Direction
            </p>
            <h1
              className="max-w-4xl text-4xl font-semibold text-white sm:text-5xl"
              style={{ fontFamily: "var(--weather-font-display)" }}
            >
              Whether without the macro prerequisite.
            </h1>
            <p className="max-w-3xl text-base leading-7 text-slate-200">
              These concepts assume the user wants a weekly operating call, not a lesson in rates,
              curves, or capital markets. The recommendation, hold line, and proof verdict stay
              visible. The economics move behind translation and proof layers.
            </p>
          </div>

          <aside className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <SectionLabel>Direction</SectionLabel>
            <ul className="mt-3 space-y-3 text-sm text-slate-200">
              <li>Default to plain operating language.</li>
              <li>Put one weekly call above every other surface.</li>
              <li>Move proof and methodology behind explicit reveals.</li>
              <li>Make the share artifact a first-class output.</li>
            </ul>
          </aside>
        </div>
      </section>

      <MockupFrame
        eyebrow="Mockup 01"
        title="Role-First Weekly Brief"
        summary="The primary experience becomes one role-aware operating card. No route choice, no macro vocabulary, and no trust workflow before the user understands the call."
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
          <article className="space-y-5 rounded-[1.75rem] border border-slate-700/70 bg-slate-950/65 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              {roleOptions.map((role) => (
                <span
                  key={role.label}
                  className={`inline-flex min-h-[44px] items-center rounded-full border px-4 py-2 text-xs font-semibold tracking-[0.12em] ${
                    role.active
                      ? "border-cyan-300/45 bg-cyan-300/12 text-cyan-50"
                      : "border-slate-700/80 bg-slate-900/70 text-slate-300"
                  }`}
                >
                  {role.label}
                </span>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(15rem,0.85fr)]">
              <div className="rounded-[1.5rem] border border-slate-700/70 bg-slate-900/70 p-5">
                <SectionLabel>This Week&apos;s Call</SectionLabel>
                <p
                  className="mt-3 text-3xl font-semibold text-white"
                  style={{ fontFamily: "var(--weather-font-display)" }}
                >
                  Move carefully forward.
                </p>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
                  Conditions still favor discipline, but this week no longer supports a broad freeze.
                  Reopen targeted moves tied to near-term product delivery and revenue.
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-300/25 bg-emerald-300/10 p-4">
                    <SectionLabel>Safe To Use</SectionLabel>
                    <p className="mt-2 text-xl font-semibold text-emerald-50">Yes, with guardrails</p>
                    <p className="mt-2 text-sm leading-6 text-emerald-100/90">
                      Good enough for weekly planning. Keep new fixed-cost commitments reversible.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4">
                    <SectionLabel>Shareable Line</SectionLabel>
                    <p className="mt-2 text-xl font-semibold text-white">
                      Reopen selective hiring, not broad expansion.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-700/70 bg-slate-900/70 p-5">
                <SectionLabel>Plain-English Read</SectionLabel>
                <div className="mt-3 space-y-3">
                  {proofItems.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-slate-700/70 bg-slate-950/60 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        {item.label}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-200">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {decisionRows.map((row) => (
                <article key={row.label} className={`rounded-[1.35rem] border p-4 ${row.tone}`}>
                  <SectionLabel>{row.label}</SectionLabel>
                  <p className="mt-2 text-sm font-medium leading-6">{row.value}</p>
                </article>
              ))}
            </div>
          </article>

          <aside className="rounded-[1.75rem] border border-slate-700/70 bg-slate-950/65 p-4 sm:p-5">
            <SectionLabel>What Changed Vs Today</SectionLabel>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
              <li>Default language is operational, not financial.</li>
              <li>The role toggle changes the translation, not the model.</li>
              <li>Trust is a verdict, not a destination.</li>
              <li>Users never have to choose Evidence or Trust before they understand the call.</li>
            </ul>
          </aside>
        </div>
      </MockupFrame>

      <MockupFrame
        eyebrow="Mockup 02"
        title="Recommendation + Proof Drawer"
        summary="The second concept assumes the product should feel like a decision memo first. Supporting evidence appears as a compact drawer tied to the active recommendation, not as a separate analytical route."
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <article className="rounded-[1.75rem] border border-slate-700/70 bg-slate-950/65 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <SectionLabel>Recommendation</SectionLabel>
                <h3
                  className="mt-2 text-3xl font-semibold text-white"
                  style={{ fontFamily: "var(--weather-font-display)" }}
                >
                  Resume the pipeline, not the spree.
                </h3>
              </div>
              <span className="inline-flex min-h-[44px] items-center rounded-full border border-amber-300/30 bg-amber-300/12 px-4 py-2 text-xs font-semibold tracking-[0.14em] text-amber-50">
                Stability improving
              </span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-emerald-300/25 bg-emerald-300/10 p-4">
                <SectionLabel>Approve</SectionLabel>
                <p className="mt-2 text-sm leading-6 text-emerald-50">
                  Backfills for shipped roadmap, platform reliability, and near-term GTM enablement.
                </p>
              </div>
              <div className="rounded-2xl border border-rose-300/25 bg-rose-300/10 p-4">
                <SectionLabel>Hold</SectionLabel>
                <p className="mt-2 text-sm leading-6 text-rose-50">
                  New incubation teams, speculative market entries, and category-expansion hiring.
                </p>
              </div>
              <div className="rounded-2xl border border-sky-300/25 bg-sky-300/10 p-4">
                <SectionLabel>Reopen If</SectionLabel>
                <p className="mt-2 text-sm leading-6 text-sky-50">
                  The next read confirms improving stability and the caution signal does not re-fire.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-slate-700/70 bg-slate-900/75 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <SectionLabel>Proof Drawer</SectionLabel>
                  <p className="mt-2 text-lg font-semibold text-white">Why this recommendation exists</p>
                </div>
                <span className="inline-flex min-h-[44px] items-center rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs font-semibold tracking-[0.12em] text-cyan-50">
                  Expanded
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-700/70 bg-slate-950/65 p-4">
                  <SectionLabel>Signal</SectionLabel>
                  <p className="mt-2 text-sm leading-6 text-slate-200">
                    Funding conditions remain selective, but the slope and stability read no longer argue for a fresh clampdown.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-700/70 bg-slate-950/65 p-4">
                  <SectionLabel>Operator Meaning</SectionLabel>
                  <p className="mt-2 text-sm leading-6 text-slate-200">
                    You can add targeted capacity when it improves near-term execution, but broad fixed-cost expansion is still premature.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-700/70 bg-slate-950/65 p-4">
                  <SectionLabel>Proof Verdict</SectionLabel>
                  <p className="mt-2 text-sm leading-6 text-slate-200">
                    Good enough to act. If the next read weakens, roll back to strict hiring controls.
                  </p>
                </div>
              </div>
            </div>
          </article>

          <aside className="rounded-[1.75rem] border border-slate-700/70 bg-slate-950/65 p-5">
            <SectionLabel>Why This Helps Non-Experts</SectionLabel>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
              <li>It teaches the implication, not the model.</li>
              <li>The evidence is attached to the action instead of living on another route.</li>
              <li>`Approve`, `Hold`, and `Reopen if` are easier to scan than regime-heavy language.</li>
            </ul>
          </aside>
        </div>
      </MockupFrame>

      <MockupFrame
        eyebrow="Mockup 03"
        title="Share Artifact First"
        summary="The third concept assumes the product’s job is complete only when the user can send the weekly call to leadership without translating it themselves."
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)]">
          <article className="rounded-[1.75rem] border border-slate-700/70 bg-slate-950/65 p-5">
            <SectionLabel>Leadership Snapshot</SectionLabel>
            <div className="mt-4 rounded-[1.6rem] border border-cyan-300/20 bg-[linear-gradient(180deg,rgba(14,23,42,0.88),rgba(2,6,23,0.94))] p-5 shadow-[0_24px_60px_-42px_rgba(34,211,238,0.45)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
                Weekly Operating Call
              </p>
              <h3
                className="mt-3 text-3xl font-semibold text-white"
                style={{ fontFamily: "var(--weather-font-display)" }}
              >
                Reopen selective hiring. Keep expansion bets reversible.
              </h3>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-200">
                This week supports targeted forward motion, not a full loosen. Add capacity only
                where it improves near-term delivery or revenue. Keep long-payback bets on hold.
              </p>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-emerald-300/25 bg-emerald-300/10 p-4">
                  <SectionLabel>Do Now</SectionLabel>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-emerald-50">
                    {artifactBullets.slice(0, 2).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4">
                  <SectionLabel>Use Caution</SectionLabel>
                  <p className="mt-2 text-sm leading-6 text-amber-50">
                    Treat this as stable enough for weekly approvals, not stable enough for broad
                    irreversible expansion.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="inline-flex min-h-[44px] items-center rounded-full border border-slate-700/80 bg-slate-900/80 px-4 py-2 text-xs font-semibold tracking-[0.14em] text-slate-100">
                  Operator brief
                </span>
                <span className="inline-flex min-h-[44px] items-center rounded-full border border-slate-700/80 bg-slate-900/80 px-4 py-2 text-xs font-semibold tracking-[0.14em] text-slate-300">
                  Explainer brief
                </span>
                <span className="inline-flex min-h-[44px] items-center rounded-full border border-slate-700/80 bg-slate-900/80 px-4 py-2 text-xs font-semibold tracking-[0.14em] text-slate-300">
                  Board note
                </span>
              </div>
            </div>
          </article>

          <aside className="rounded-[1.75rem] border border-slate-700/70 bg-slate-950/65 p-5">
            <SectionLabel>Mockup Notes</SectionLabel>
            <div className="mt-4 space-y-4 text-sm leading-6 text-slate-200">
              <p>
                The artifact is no longer an export afterthought. It becomes part of the main
                product surface.
              </p>
              <p>
                The explainer mode should preserve the same recommendation while lightly translating
                the logic for mixed-literacy rooms.
              </p>
              <p>
                A user without macro background should be able to copy this as-is and still sound
                authoritative in a leadership sync.
              </p>
            </div>
          </aside>
        </div>
      </MockupFrame>
    </main>
  );
}
