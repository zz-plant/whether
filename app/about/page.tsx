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
        description="Whether compresses macro signals into a compact operating posture so product and engineering leaders can decide what to tighten, what to defer, and what they can safely ship forward."
        stats={[
          { label: "Core loop", value: "Signals -> posture -> decision -> artifact" },
          { label: "Use case", value: "Weekly leadership cadence", detail: "Built to scan, decide, and share in under a minute." },
          { label: "Trust model", value: "Fresh public-source inputs", detail: "Timestamps, confidence, and fallback state stay visible." },
        ]}
      />
      <HubSection
        title="What the product is trying to solve"
        description="The product should reduce re-litigation in weekly planning. It gives teams a shared default stance before they reopen hiring, roadmap, spending, or launch assumptions."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="weather-hub-card space-y-2 px-5 py-5 text-sm text-slate-300">
            <p className="weather-hub-section-eyebrow">Method</p>
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
    </HubPageShell>
  );
}
