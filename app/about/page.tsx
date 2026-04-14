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
        description="Whether is an independent weekly brief. It turns public macro signals into a short weekly read so product and engineering leaders can decide what to slow down, what to defer, and what can keep moving."
        stats={[
          { label: "Core loop", value: "Signals → posture → decision → shareable brief" },
          { label: "Use case", value: "Weekly leadership cadence", detail: "Built to scan, decide, and share in under a minute." },
          { label: "Operating scope", value: "Independent weekly brief", detail: "Not a research desk or macro data vendor." },
          { label: "Trust model", value: "Fresh public-source inputs", detail: "Timestamps, confidence, and fallback state stay visible." },
        ]}
      />
      <HubSection
        title="What the product is trying to solve"
        description="Whether should cut the weekly debate loop. It gives teams a shared starting point before they reopen hiring, roadmap, spending, or launch assumptions."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="weather-hub-card space-y-2 px-5 py-5 text-sm text-slate-300">
            <p className="weather-hub-section-eyebrow">Approach</p>
            <p><span className="font-semibold text-slate-100">Start with the current read:</span> get to the operating stance first, then turn it into constraints and next steps.</p>
            <p><span className="font-semibold text-slate-100">Make decisions clear:</span> guidance should include the action, the trigger, and what would make you reverse it.</p>
          </div>
          <div className="weather-hub-card space-y-2 px-5 py-5 text-sm text-slate-300">
            <p className="weather-hub-section-eyebrow">Trust</p>
            <p><span className="font-semibold text-slate-100">Sources:</span> public Treasury and macro datasets with transparent timestamps and refresh cadence.</p>
            <p id="subscribe"><span className="font-semibold text-slate-100">Updates:</span> changes to the call, new tools, and confidence shifts should be easy to track.</p>
            <p><span className="font-semibold text-slate-100">Contact:</span> hello@whether.app</p>
          </div>
        </div>
      </HubSection>
      <HubSection
        title="What to trust here — and what not to"
        description="Whether should be explicit about what it can and cannot do so teams use it correctly."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="weather-hub-card space-y-2 px-5 py-5 text-sm text-slate-300">
            <p className="weather-hub-section-eyebrow">What it is</p>
            <p><span className="font-semibold text-slate-100">Independent weekly brief:</span> Whether is a compact operating brief, not a large research institution with a broad publishing footprint.</p>
            <p><span className="font-semibold text-slate-100">Best use:</span> weekly planning, clearer decisions, and meeting-ready summaries you can share quickly.</p>
            <p><span className="font-semibold text-slate-100">How to judge it:</span> by freshness, source quality, confidence, and whether the brief stays useful when live data degrades.</p>
          </div>
          <div className="weather-hub-card space-y-2 px-5 py-5 text-sm text-slate-300">
            <p className="weather-hub-section-eyebrow">What it is not</p>
            <p><span className="font-semibold text-slate-100">Not company-specific advice:</span> the product translates shared macro conditions into a default stance; teams still need their own demand, pipeline, margin, and cash context.</p>
            <p><span className="font-semibold text-slate-100">Not a substitute for judgment:</span> confidence, fallback state, and reversal conditions should shape how aggressively you act on the brief.</p>
          </div>
        </div>
      </HubSection>
    </HubPageShell>
  );
}
