import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../lib/seo";
import { LegacyRouteBridge } from "../components/legacyRouteBridge";

export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: "Start Here — Weekly decision routing",
  description:
    "Start with what changed since your last review, then execute this week’s bounded decision call.",
  path: "/start",
  imageAlt: "Whether Start Here decision routing",
  imagePath: "/social/start-here.svg",
});

export default async function StartHerePage() {
  return (
    <>
      <main className="weather-page-shell weather-page-shell-narrow">
        <section className="weather-panel grid gap-4 px-5 py-5 sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Start Here</p>
            <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Weekly Brief is the canonical entry</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-300">Use the homepage for the live weekly call, the current guardrail, and the flip condition. This route remains a bridge for older links and quick handoffs.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/" className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em]">
                Open Weekly Brief
              </Link>
              <Link href="/operations" className="weather-pill inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold text-slate-100">
                Open Operations
              </Link>
            </div>
          </div>
          <div className="weather-route-card space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-200">Use this route when</p>
            <ul className="space-y-2 text-sm text-slate-200">
              <li>1. A shared link or old bookmark lands you here.</li>
              <li>2. You need a fast redirect to the live weekly brief.</li>
              <li>3. You want execution detail after the call is already clear.</li>
            </ul>
          </div>
        </section>
      </main>
      <LegacyRouteBridge
        eyebrow="Legacy route bridge"
        title="Weekly Brief is now the default start point"
        description="Open Weekly Brief for the live call, then jump to Operations only when you need deeper execution guardrails. This bridge remains for legacy links."
        primaryHref="/"
        primaryLabel="Go to Weekly Brief"
        secondaryHref="/operations"
        secondaryLabel="Go to Operations"
        autoForwardSeconds={5}
        moreActionsLabel="More actions"
      />
    </>
  );
}
