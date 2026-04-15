import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import { HubHero, HubPageShell, HubSection } from "../components/hubPageShell";

export const metadata: Metadata = buildPageMetadata({
  title: "About Whether",
  description: "Learn what Whether does, which sources it uses, and how to stay updated.",
  path: "/about",
  imageAlt: "About Whether",
});

export default function AboutPage() {
  return (
    <HubPageShell width="standard">
      <HubHero
        eyebrow="Why Whether exists"
        title="A weekly planning brief for changing market conditions."
        description="Whether turns public macro signals into a short weekly brief so leadership teams can decide what to slow down, what to fund, and what to revisit before the conversation spreads across the org."
        stats={[
          { label: "Core loop", value: "Signals → recommendation → decision → shareable brief" },
          { label: "Use case", value: "Weekly leadership planning", detail: "Built to scan, decide, and share in under a minute." },
          { label: "Operating scope", value: "Independent weekly brief", detail: "Not a research desk or macro data vendor." },
          { label: "Trust model", value: "Fresh public-source inputs", detail: "Timestamps, confidence, and fallback state stay visible." },
        ]}
      />
      <HubSection
        title="What it helps teams do"
        description="Use one weekly brief to align hiring, roadmap, spending, and launch decisions before the discussion sprawls."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="weather-hub-card space-y-2 px-5 py-5 text-sm text-slate-300">
            <p className="weather-hub-section-eyebrow">Approach</p>
            <p><span className="font-semibold text-slate-100">Start with the recommendation:</span> read the main recommendation first, then turn it into constraints and next steps.</p>
            <p><span className="font-semibold text-slate-100">Keep decisions clear:</span> each recommendation should say what to do, what would stop it, and what would make you reopen it.</p>
          </div>
          <div className="weather-hub-card space-y-2 px-5 py-5 text-sm text-slate-300">
            <p className="weather-hub-section-eyebrow">Trust</p>
            <p><span className="font-semibold text-slate-100">Sources:</span> public Treasury and macro datasets with visible timestamps and refresh cadence.</p>
            <p id="subscribe"><span className="font-semibold text-slate-100">Updates:</span> recommendation changes, confidence shifts, and new tools should be easy to track.</p>
            <p><span className="font-semibold text-slate-100">Contact:</span> hello@whether.app</p>
          </div>
        </div>
      </HubSection>
      <HubSection
        title="What to trust here — and what not to"
        description="Whether should be explicit about what it can and cannot do so teams use it with the right amount of confidence."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="weather-hub-card space-y-2 px-5 py-5 text-sm text-slate-300">
            <p className="weather-hub-section-eyebrow">What it is</p>
            <p><span className="font-semibold text-slate-100">Independent weekly brief:</span> Whether is a compact weekly brief, not a broad macro publishing product.</p>
            <p><span className="font-semibold text-slate-100">Best use:</span> weekly planning, faster decisions, and meeting-ready summaries you can share quickly.</p>
            <p><span className="font-semibold text-slate-100">How to judge it:</span> by freshness, source quality, confidence, and whether it stays useful when live data degrades.</p>
          </div>
          <div className="weather-hub-card space-y-2 px-5 py-5 text-sm text-slate-300">
            <p className="weather-hub-section-eyebrow">What it is not</p>
            <p><span className="font-semibold text-slate-100">Not company-specific advice:</span> the product turns shared market conditions into a default starting point; teams still need their own demand, pipeline, margin, and cash context.</p>
            <p><span className="font-semibold text-slate-100">Not a substitute for judgment:</span> confidence, fallback state, and reversal conditions should shape how aggressively you act on the brief.</p>
          </div>
        </div>
      </HubSection>
    </HubPageShell>
  );
}
