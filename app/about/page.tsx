import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import { HubHero, HubPageShell, HubSection } from "../components/hubPageShell";

export const metadata: Metadata = buildPageMetadata({
  title: "About Whether",
  description: "Learn how Whether works, what sources it uses, and how to stay updated.",
  path: "/about",
  imageAlt: "About Whether",
});

export default function AboutPage() {
  return (
    <HubPageShell width="standard">
      <HubHero
        eyebrow="Why Whether exists"
        title="A weekly macro brief built for operating decisions, not commentary."
        description="Whether is a small independent operator tool. It compresses public macro signals into a compact weekly posture so product and engineering leaders can decide what to tighten, what to defer, and what they can safely ship forward."
        stats={[
          { label: "Core loop", value: "Evidence -> posture -> decision -> artifact" },
          { label: "Use case", value: "Weekly leadership cadence", detail: "Built to scan, decide, and share in under a minute." },
          { label: "Operating scope", value: "Independent translation layer", detail: "Not a sell-side desk or macro data vendor." },
          { label: "Trust model", value: "Fresh public-source inputs", detail: "Timestamps, confidence, and fallback state stay visible." },
        ]}
      />
      <HubSection
        title="What the product is trying to solve"
        description="The product should reduce re-litigation in weekly planning. It gives teams a shared default stance before they reopen hiring, roadmap, spending, or launch assumptions."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="weather-hub-card space-y-2 px-5 py-5 text-sm text-slate-300">
            <p className="weather-hub-section-eyebrow">Approach</p>
            <p><span className="font-semibold text-slate-100">Posture first:</span> start from the current market stance, then translate into operating constraints.</p>
            <p><span className="font-semibold text-slate-100">Bounded decisions:</span> guidance should include a concrete action, a trigger, and a reversal condition.</p>
          </div>
          <div className="weather-hub-card space-y-2 px-5 py-5 text-sm text-slate-300">
            <p className="weather-hub-section-eyebrow">Trust</p>
            <p><span className="font-semibold text-slate-100">Sources:</span> public Treasury and macro datasets with transparent timestamps and refresh cadence.</p>
            <p id="subscribe"><span className="font-semibold text-slate-100">Updates:</span> posture changes, new toolkit coverage, and confidence shifts should be easy to monitor.</p>
            <p><span className="font-semibold text-slate-100">Contact:</span> hello@whether.app</p>
          </div>
        </div>
      </HubSection>
      <HubSection
        title="What to trust here — and what not to"
        description="The product should be explicit about authority and limits so teams can use it correctly."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="weather-hub-card space-y-2 px-5 py-5 text-sm text-slate-300">
            <p className="weather-hub-section-eyebrow">What it is</p>
            <p><span className="font-semibold text-slate-100">Independent operator brief:</span> Whether is a lightweight decision product, not a large research institution with a broad public footprint.</p>
            <p><span className="font-semibold text-slate-100">Best use:</span> weekly pacing, bounded operating defaults, and share-ready meeting artifacts.</p>
            <p><span className="font-semibold text-slate-100">How to judge it:</span> by freshness, provenance, confidence, and whether the brief stays decision-complete when data degrades.</p>
          </div>
          <div className="weather-hub-card space-y-2 px-5 py-5 text-sm text-slate-300">
            <p className="weather-hub-section-eyebrow">What it is not</p>
            <p><span className="font-semibold text-slate-100">Not bespoke company advice:</span> the product translates shared macro conditions into operating posture; teams still need internal demand, pipeline, margin, and cash context.</p>
            <p><span className="font-semibold text-slate-100">Not a substitute for judgment:</span> live confidence, fallback state, and reversal conditions should determine how aggressively you act on the brief.</p>
          </div>
        </div>
      </HubSection>
    </HubPageShell>
  );
}
