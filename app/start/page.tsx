import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import { postureDefinitions, situationRouting, startSituations, toolkitDefinitions } from "../../lib/informationArchitecture";

export const metadata: Metadata = buildPageMetadata({
  title: "Start Here — Whether onboarding",
  description:
    "Command Center for the weekly operating sequence: confirm posture, choose your situation, and run one toolkit.",
  path: "/start",
  imageAlt: "Whether Start Here",
});

export default function StartHerePage() {
  const onboardingSteps = [
    { id: "posture", label: "Posture", href: "#start-posture", state: "Now", icon: "🧭" },
    { id: "situation", label: "Situation", href: "#start-situation", state: "Next", icon: "🧩" },
    { id: "toolkit", label: "Toolkit", href: "#start-toolkit", state: "Then", icon: "🧰" },
  ] as const;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Command center</p>
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Run this week&apos;s operating sequence.</h1>
        <p className="text-base text-slate-200">
          Use this page when you need a single path: confirm posture, choose the situation to solve now, then run one toolkit end-to-end. Example journey: <span className="font-semibold">Safety Mode → Hiring → Commitment &amp; Rollback Toolkit</span>.
        </p>
        <div className="grid gap-3 rounded-2xl border border-slate-700/85 bg-slate-950/55 p-3 sm:grid-cols-3">
          {onboardingSteps.map((step, index) => (
            <a
              key={step.id}
              href={step.href}
              className="weather-surface flex min-h-[44px] items-center justify-between gap-3 px-3 py-3 text-sm text-slate-100"
            >
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="text-lg">{step.icon}</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-600/80 text-xs font-semibold text-slate-100">
                  {index + 1}
                </span>
                <span className="font-semibold">{step.label}</span>
              </span>
              <span className="rounded-full border border-slate-600/75 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-200">
                {step.state}
              </span>
            </a>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/operations/plan" className="weather-button-primary inline-flex items-center justify-center">Run weekly operating sequence</Link>
          <Link href="/decide" className="weather-button inline-flex items-center justify-center">Need role-specific guidance?</Link>
        </div>
      </section>

      <section id="start-posture" className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">🧭 Posture</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {postureDefinitions.map((posture) => (
            <Link key={posture.slug} href={`/posture/${posture.slug}`} className="weather-surface min-h-[44px] space-y-2 px-4 py-4">
              <p className="text-sm font-semibold text-slate-100">{posture.title}</p>
              <p className="text-sm text-slate-200">{posture.summary}</p>
            </Link>
          ))}
        </div>
      </section>

      <section id="start-situation" className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">🧩 Situation</h2>
        <div className="flex flex-wrap gap-2">
          {startSituations.map((situation) => (
            <Link
              key={situation}
              href={`/decide/${situationRouting[situation]}`}
              className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.08em] text-slate-100"
            >
              {situation}
            </Link>
          ))}
        </div>
      </section>

      <section id="start-toolkit" className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">🧰 Toolkit</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {toolkitDefinitions.map((toolkit) => (
            <Link key={toolkit.slug} href={`/toolkits/${toolkit.slug}`} className="weather-surface min-h-[44px] px-4 py-4 text-sm text-slate-200">
              <span className="font-semibold text-slate-100">{toolkit.title}</span>
              <p className="mt-2 text-sm text-slate-200">{toolkit.whenToUse}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
