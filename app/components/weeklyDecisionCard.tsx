"use client";

import { Accordion } from "@base-ui/react/accordion";
import { Dialog } from "@base-ui/react/dialog";
import { Select } from "@base-ui/react/select";
import { Tabs } from "@base-ui/react/tabs";
import { Tooltip } from "@base-ui/react/tooltip";
import Link from "next/link";
import { useMemo, useState } from "react";

type Regime = "SCARCITY" | "DEFENSIVE" | "VOLATILE" | "EXPANSION";

type WeeklyDecisionCardProps = {
  regime: Regime;
  statusLabel: string;
  startItems: string[];
  stopItems: string[];
  recordDateLabel: string;
  fetchedAtLabel: string;
};

type EngineeringPosture = {
  posture: "Accelerate" | "Stabilize" | "Optimize";
  confidence: string;
  levers: Array<{ label: string; guidance: string }>;
  overApplyRisk: string;
  underApplyRisk: string;
  mitigationTrigger: string;
};

const engineeringPostureByRegime: Record<Regime, EngineeringPosture> = {
  EXPANSION: {
    posture: "Accelerate",
    confidence: "Medium-high",
    levers: [
      { label: "Delivery scope", guidance: "Scale validated growth bets." },
      { label: "Reliability strictness", guidance: "Keep baseline SLOs; add capacity where load rises." },
      { label: "Hiring pace", guidance: "Backfill critical roles; add targeted product-engineering capacity." },
      { label: "Platform investment", guidance: "Fund platform work that cuts next-quarter cycle time." },
    ],
    overApplyRisk: "Spend and scope outrun durable demand.",
    underApplyRisk: "Miss growth windows; force reactive scaling.",
    mitigationTrigger: "Trigger: two weaker reads in a row → switch to Stabilize.",
  },
  VOLATILE: {
    posture: "Optimize",
    confidence: "Medium",
    levers: [
      { label: "Delivery scope", guidance: "Prioritize near-term revenue and retention; gate speculation." },
      { label: "Reliability strictness", guidance: "Protect core paths; avoid over-investing low-criticality reliability." },
      { label: "Hiring pace", guidance: "Keep hiring selective and role-critical." },
      { label: "Platform investment", guidance: "Favor efficiency and instrumentation over broad rewrites." },
    ],
    overApplyRisk: "Over-tightening stalls customer progress.",
    underApplyRisk: "Optional work raises burn without return.",
    mitigationTrigger: "Trigger: confidence up 2 updates → Accelerate; down → Stabilize.",
  },
  DEFENSIVE: {
    posture: "Stabilize",
    confidence: "High",
    levers: [
      { label: "Delivery scope", guidance: "Focus commitments on revenue durability and churn prevention." },
      { label: "Reliability strictness", guidance: "Raise guardrails for incidents, defects, and release risk." },
      { label: "Hiring pace", guidance: "Pause discretionary adds; backfill critical ownership gaps." },
      { label: "Platform investment", guidance: "Shift to resilience, cost control, and simplification." },
    ],
    overApplyRisk: "Excess caution delays needed product gains.",
    underApplyRisk: "Reliability and spend controls lag conditions.",
    mitigationTrigger: "Trigger: risk recovery for 2 updates → test Optimize on non-critical lanes.",
  },
  SCARCITY: {
    posture: "Stabilize",
    confidence: "High",
    levers: [
      { label: "Delivery scope", guidance: "Constrain to must-win commitments." },
      { label: "Reliability strictness", guidance: "Enforce strict error-budget and release controls." },
      { label: "Hiring pace", guidance: "Hold net-new hiring; preserve critical coverage." },
      { label: "Platform investment", guidance: "Prioritize cost-down, reliability hardening, and run-cost visibility." },
    ],
    overApplyRisk: "Deep cuts erode morale and long-term velocity.",
    underApplyRisk: "Insufficient tightening can force harsher cuts later.",
    mitigationTrigger: "Trigger: sustained tightness + risk recovery → step up to Optimize.",
  },
};

export function WeeklyDecisionCard({
  regime,
  statusLabel,
  startItems,
  stopItems,
  recordDateLabel,
  fetchedAtLabel,
}: WeeklyDecisionCardProps) {
  const [profile, setProfile] = useState("saas-growth-plg");
  const topActions = startItems.slice(0, 3);

  const ownerKeywords: Record<string, string[]> = {
    Engineering: ["hire", "engineering", "platform", "reliability"],
    Finance: ["budget", "cash", "spend"],
    GTM: ["sales", "pipeline", "gtm", "marketing"],
  };

  const inferActionOwner = (action: string): string => {
    const normalized = action.toLowerCase();
    for (const [owner, keywords] of Object.entries(ownerKeywords)) {
      if (keywords.some((keyword) => normalized.includes(keyword))) {
        return owner;
      }
    }
    return "Product";
  };
  const guardrail = stopItems[0] ?? "Avoid irreversible commitments until confidence improves.";
  const engineeringPosture = engineeringPostureByRegime[regime];
  const profileLabel = useMemo(() => {
    switch (profile) {
      case "fintech-a-enterprise":
        return "Fintech · Series A · Enterprise";
      case "marketplace-seed-mixed":
        return "Marketplace · Seed · Mixed";
      case "hardware-growth-enterprise":
        return "Hardware · Growth · Enterprise";
      default:
        return "SaaS · Growth · PLG";
    }
  }, [profile]);

  const stakeholderActionSets = {
    product: topActions,
    gtm: topActions.filter((item) => inferActionOwner(item) === "GTM"),
    finance: topActions.filter((item) => inferActionOwner(item) === "Finance"),
    people: topActions.filter((item) => item.toLowerCase().includes("hire")),
  } as const;

  return (
    <section id="weekly-decision-card" className="weather-panel space-y-6 p-5 sm:p-6" aria-label="This week's decision card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">This week&apos;s decision card</p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-50">{statusLabel} posture</h2>
          <p className="text-sm text-slate-300">Signals through {recordDateLabel} · Refresh {fetchedAtLabel}</p>
          <p className="text-xs text-slate-400">Weekly call · monthly rollup in Action playbook</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select.Root value={profile} onValueChange={(value) => setProfile(value ?? "saas-growth-plg")}>
            <Select.Trigger className="weather-button inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]">
              <span className="sr-only">Operator profile</span>
              <Select.Value>
                {profileLabel}
              </Select.Value>
              <Select.Icon />
            </Select.Trigger>
            <Select.Portal>
              <Select.Positioner sideOffset={8}>
                <Select.Popup className="w-[320px] rounded-xl border border-slate-800/80 bg-slate-950 p-1 text-sm text-slate-200 shadow-xl">
                  <Select.Item value="saas-growth-plg" className="flex min-h-[44px] items-center rounded-lg px-3 py-2 data-[highlighted]:bg-slate-800/80">
                    <Select.ItemText>SaaS · Growth · PLG</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="fintech-a-enterprise" className="flex min-h-[44px] items-center rounded-lg px-3 py-2 data-[highlighted]:bg-slate-800/80">
                    <Select.ItemText>Fintech · Series A · Enterprise</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="marketplace-seed-mixed" className="flex min-h-[44px] items-center rounded-lg px-3 py-2 data-[highlighted]:bg-slate-800/80">
                    <Select.ItemText>Marketplace · Seed · Mixed</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="hardware-growth-enterprise" className="flex min-h-[44px] items-center rounded-lg px-3 py-2 data-[highlighted]:bg-slate-800/80">
                    <Select.ItemText>Hardware · Growth · Enterprise</Select.ItemText>
                  </Select.Item>
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select.Root>
          <Link href="#weekly-action-summary" className="weather-button-primary inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]">Run weekly operating sequence</Link>
          <Link href="/operations#ops-export-briefs" className="weather-button inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]">Generate leadership brief</Link>
          <Dialog.Root>
            <Dialog.Trigger className="weather-button inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]">
              Share snapshot
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Backdrop className="fixed inset-0 z-40 bg-slate-950/80" />
              <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(620px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-800 bg-slate-950 p-5 text-slate-100 shadow-2xl">
                <Dialog.Title className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-200">Decision card snapshot</Dialog.Title>
                <Dialog.Description className="mt-2 text-xs text-slate-400">Use this in Slack or docs for weekly alignment.</Dialog.Description>
                <div className="mt-4 rounded-xl border border-slate-800/80 bg-slate-900/70 p-4">
                  <p className="text-xs text-slate-400">{statusLabel} posture · {recordDateLabel}</p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-100">
                    {topActions.map((item) => (
                      <li key={`share-${item}`}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="mt-4 flex justify-end">
                  <Dialog.Close className="weather-button inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]">Close</Dialog.Close>
                </div>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>

      <Tabs.Root defaultValue="product" className="rounded-2xl border border-slate-700/70 bg-slate-950/45 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-300">Stakeholder lenses</p>
        <Tabs.List className="mt-3 flex flex-wrap gap-2">
          <Tabs.Tab value="product" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-200 data-[selected]:border-sky-300/80">Product</Tabs.Tab>
          <Tabs.Tab value="gtm" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-200 data-[selected]:border-sky-300/80">GTM</Tabs.Tab>
          <Tabs.Tab value="finance" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-200 data-[selected]:border-sky-300/80">Finance</Tabs.Tab>
          <Tabs.Tab value="people" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-200 data-[selected]:border-sky-300/80">People</Tabs.Tab>
        </Tabs.List>
        {(Object.keys(stakeholderActionSets) as Array<keyof typeof stakeholderActionSets>).map((lens) => (
          <Tabs.Panel key={lens} value={lens} className="mt-3 text-sm text-slate-200">
            <ul className="space-y-1">
              {(stakeholderActionSets[lens].length > 0 ? stakeholderActionSets[lens] : ["No explicit action in top 3 this week."]).map((item) => (
                <li key={`${lens}-${item}`}>• {item}</li>
              ))}
            </ul>
          </Tabs.Panel>
        ))}
      </Tabs.Root>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-700/70 bg-slate-950/45 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-200">Top 3 actions</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-100">
            {topActions.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-300" />
                <span className="flex-1">{item}</span>
                <span className="rounded-full border border-slate-600/70 bg-slate-900/70 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-slate-300">
                  {inferActionOwner(item)}
                </span>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-2xl border border-slate-700/70 bg-slate-950/45 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-200">Guardrail (do not do)</h3>
          <p className="mt-3 text-sm text-slate-100">{guardrail}</p>
        </article>

        <article className="rounded-2xl border border-slate-700/70 bg-slate-950/45 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-200">Decision basis</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-200">
            <li>
              <Tooltip.Root>
                <Tooltip.Trigger className="underline decoration-dotted underline-offset-4">Inputs: Treasury curve + regime thresholds.</Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Positioner side="top" sideOffset={8}>
                    <Tooltip.Popup className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200">
                      Inputs are refreshed from current Treasury-linked series and deterministic thresholds.
                    </Tooltip.Popup>
                  </Tooltip.Positioner>
                </Tooltip.Portal>
              </Tooltip.Root>
            </li>
            <li>Rules: Deterministic score mapping.</li>
            <li>Cadence: Weekly decision cycle.</li>
          </ul>
        </article>
      </div>

      <article className="rounded-2xl border border-slate-700/70 bg-slate-950/45 p-4" aria-label="Engineering operating posture">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-violet-200">Engineering operating posture: {engineeringPosture.posture}</h3>
          <span className="rounded-full border border-violet-400/40 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-100">Confidence: {engineeringPosture.confidence}</span>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {engineeringPosture.levers.map((lever) => (
            <div key={lever.label} className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">{lever.label}</p>
              <p className="mt-1 text-sm text-slate-100">{lever.guidance}</p>
            </div>
          ))}
        </div>
      </article>

      <Accordion.Root defaultValue={["risk"]} className="rounded-2xl border border-slate-700/70 bg-slate-950/45 p-4" aria-label="Recommendation risk framing">
        <Accordion.Item value="risk" className="border-b border-slate-800/80 pb-3">
          <Accordion.Header>
            <Accordion.Trigger className="flex min-h-[44px] w-full items-center justify-between gap-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-rose-200">
              Risk framing
              <span className="text-slate-400">⌄</span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel className="pt-3">
            <ul className="space-y-2 text-sm text-slate-200">
              <li><span className="font-semibold text-slate-100">Risk if over-applied:</span> {engineeringPosture.overApplyRisk}</li>
              <li><span className="font-semibold text-slate-100">Risk if under-applied:</span> {engineeringPosture.underApplyRisk}</li>
              <li><span className="font-semibold text-slate-100">Mitigation trigger:</span> {engineeringPosture.mitigationTrigger}</li>
            </ul>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion.Root>
    </section>
  );
}
