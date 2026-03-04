import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import { ReturningVisitorDeltaStrip } from "../components/changeSinceLastReadPanel";
import { loadReportData } from "../../lib/report/reportData";
import { postureDefinitions, situationRouting, startSituations, toolkitDefinitions } from "../../lib/informationArchitecture";

export const metadata: Metadata = buildPageMetadata({
  title: "Start Here — Whether onboarding",
  description:
    "Command Center for the weekly operating sequence: confirm posture, choose your situation, and run one toolkit.",
  path: "/start",
  imageAlt: "Whether Start Here",
});

export default async function StartHerePage() {
  const { assessment, treasury } = await loadReportData();

  const onboardingSteps = [
    {
      id: "posture",
      label: "Posture",
      href: "#start-posture",
      state: "Now",
      icon: "🧭",
      description: "Choose your risk stance for this week.",
    },
    {
      id: "situation",
      label: "Situation",
      href: "#start-situation",
      state: "Next",
      icon: "🧩",
      description: "Pick the bottleneck worth solving first.",
    },
    {
      id: "toolkit",
      label: "Toolkit",
      href: "#start-toolkit",
      state: "Then",
      icon: "🧰",
      description: "Run one operating playbook end-to-end.",
    },
  ] as const;

  const featuredToolkitDefinitions = toolkitDefinitions.slice(0, 3);
  const additionalToolkitDefinitions = toolkitDefinitions.slice(3);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <ReturningVisitorDeltaStrip
        assessment={assessment}
        recordDate={treasury.record_date}
        impactLinks={[
          { label: "Posture shift", href: "/evidence#current-scores", metric: "tightness" },
          { label: "Top drivers", href: "/evidence#signal-diagnostics", metric: "baseRate" },
          { label: "Action guardrails", href: "/operations#ops-playbook", metric: "riskAppetite" },
        ]}
        openPanelHref="/evidence#signal-diagnostics"
      />

      <section className="weather-panel-hero space-y-4 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Command center</p>
        <h1 className="type-section text-slate-100">Run this week&apos;s operating sequence.</h1>
        <p className="text-base text-slate-200">
          Use this page when you need a single path: confirm posture, choose the situation to solve now, then run one toolkit end-to-end. Example journey: <span className="font-semibold">Safety Mode → Hiring → Commitment &amp; Rollback Toolkit</span>.
        </p>
        <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
          <span className="rounded-full border border-slate-700/70 px-3 py-2">3-step weekly workflow</span>
          <span className="rounded-full border border-slate-700/70 px-3 py-2">~5 minutes to decide</span>
          <span className="rounded-full border border-slate-700/70 px-3 py-2">Linked to live macro posture</span>
        </div>
        <div className="weather-surface weather-surface-sky grid overflow-hidden rounded-2xl sm:grid-cols-3 sm:divide-x sm:divide-slate-800/70">
          {onboardingSteps.map((step, index) => (
            <a
              key={step.id}
              href={step.href}
              className="flex min-h-[44px] items-start justify-between gap-3 px-4 py-3 text-sm text-slate-100 transition hover:bg-slate-900/55"
            >
              <span className="space-y-1">
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden="true" className="text-lg">{step.icon}</span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-600/80 text-xs font-semibold text-slate-100">
                    {index + 1}
                  </span>
                  <span className="font-semibold">{step.label}</span>
                </span>
                <span className="block text-xs text-slate-300">{step.description}</span>
              </span>
              <span className="rounded-full border border-slate-600/75 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-200">
                {step.state}
              </span>
            </a>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/operations/plan" className="weather-button-primary inline-flex items-center justify-center">Run weekly operating sequence</Link>
          <Link href="/operations#ops-export-briefs" className="weather-button inline-flex items-center justify-center">Copy weekly brief</Link>
          <details className="group">
            <summary className="weather-pill inline-flex min-h-[44px] cursor-pointer list-none items-center justify-center rounded-full border border-slate-700/80 px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-100 transition-colors hover:border-sky-400/70 hover:text-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation">
              More actions
            </summary>
            <div className="mt-2 grid gap-2 rounded-xl border border-slate-800/80 bg-slate-950/90 p-3">
              <Link href="#start-role-path" className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.12em] text-sky-200 underline decoration-slate-500 underline-offset-4 hover:text-slate-100">Choose a role-specific path</Link>
            </div>
          </details>
        </div>
      </section>

      <section id="start-role-path" className="weather-panel-quiet space-y-4 px-6 py-5">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-slate-100">Choose your path</h2>
          <p className="text-[15px] text-slate-300 sm:text-base">Use this as the role lens picker inside Command Center, not a second homepage.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/decide/use-cases" className="weather-surface min-h-[44px] space-y-2 px-4 py-3 transition hover:border-sky-400/65">
            <h3 className="text-base font-semibold text-slate-100">Role and situation paths</h3>
            <p className="text-[15px] text-slate-300 sm:text-base">Route by role or bottleneck to open the right guidance quickly.</p>
          </Link>
          <Link href="/decide" className="weather-surface min-h-[44px] space-y-2 px-4 py-3 transition hover:border-sky-400/65">
            <h3 className="text-base font-semibold text-slate-100">Open role lens library</h3>
            <p className="text-[15px] text-slate-300 sm:text-base">Browse role-specific references, team context, and ship checklists.</p>
          </Link>
        </div>
      </section>

      <section className="weather-panel px-6 py-5">
        <div id="start-posture" className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-100">🧭 Posture</h2>
            <p className="text-[15px] text-slate-300 sm:text-base">Pick the risk stance that should shape every major decision this week.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {postureDefinitions.map((posture) => (
              <Link key={posture.slug} href={`/posture/${posture.slug}`} className="weather-surface min-h-[44px] space-y-2 px-4 py-3 transition hover:border-sky-300/40 hover:bg-slate-900/75">
                <p className="text-sm font-semibold text-slate-100">{posture.title}</p>
                <p className="text-[15px] text-slate-200 sm:text-base">{posture.summary}</p>
                <p className="pt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Open posture guide →</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="weather-section-divider mt-6" aria-hidden="true" />
        <div id="start-situation" className="mt-6 space-y-4 pt-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-100">🧩 Situation</h2>
            <p className="text-[15px] text-slate-300 sm:text-base">Choose the highest-leverage problem; keep everything else parked for later.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {startSituations.map((situation) => (
              <Link
                key={situation}
                href={`/decide/${situationRouting[situation]}`}
                className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.08em] text-slate-100 transition hover:border-sky-300/45"
              >
                {situation}
              </Link>
            ))}
          </div>
        </div>

        <div className="weather-section-divider mt-6" aria-hidden="true" />
        <div id="start-toolkit" className="mt-6 space-y-4 pt-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-100">🧰 Toolkit</h2>
            <p className="text-[15px] text-slate-300 sm:text-base">Run one toolkit deeply to move from diagnosis to decision in the same session.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {featuredToolkitDefinitions.map((toolkit) => (
              <Link key={toolkit.slug} href={`/toolkits/${toolkit.slug}`} className="weather-surface min-h-[44px] space-y-2 px-4 py-3 text-sm text-slate-200 transition hover:border-sky-300/40 hover:bg-slate-900/75">
                <span className="font-semibold text-slate-100">{toolkit.title}</span>
                <p className="text-[15px] text-slate-200 sm:text-base">{toolkit.whenToUse}</p>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Run toolkit →</p>
              </Link>
            ))}
          </div>
          {additionalToolkitDefinitions.length > 0 ? (
            <details className="group rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
              <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.12em] text-sky-200">
                Show all toolkits ({additionalToolkitDefinitions.length} more)
              </summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {additionalToolkitDefinitions.map((toolkit) => (
                  <Link key={toolkit.slug} href={`/toolkits/${toolkit.slug}`} className="weather-surface min-h-[44px] space-y-2 px-4 py-3 text-sm text-slate-200 transition hover:border-sky-300/40 hover:bg-slate-900/75">
                    <span className="font-semibold text-slate-100">{toolkit.title}</span>
                    <p className="text-[15px] text-slate-200 sm:text-base">{toolkit.whenToUse}</p>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Run toolkit →</p>
                  </Link>
                ))}
              </div>
              <Link href="/toolkits" className="mt-3 inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.12em] text-sky-200 underline decoration-slate-500 underline-offset-4 hover:text-slate-100">
                Open full toolkit library
              </Link>
            </details>
          ) : null}
        </div>
      </section>
    </main>
  );
}
