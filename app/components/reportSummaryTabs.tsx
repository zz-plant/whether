"use client";

import { Tabs } from "@base-ui/react/tabs";
import { ReportInterpretationNotes } from "./reportShellNavigation";

export const ReportSummaryTabs = ({
  statusLabel,
  recordDateLabel,
  trustStatusLabel,
  trustStatusDetail,
  trustStatusAction,
  trustToneStyles,
}: {
  statusLabel: string;
  recordDateLabel: string;
  trustStatusLabel: string;
  trustStatusDetail: string;
  trustStatusAction: string;
  trustToneStyles: string;
}) => (
  <section className="weather-panel space-y-4 px-5 py-4">
    <div className="space-y-2">
      <p className="text-xs font-semibold tracking-[0.32em] text-slate-400">Signal readout</p>
      <h2 className="text-lg font-semibold text-slate-100 sm:text-xl">Weekly signal readout</h2>
      <p className="max-w-2xl text-sm text-slate-300">
        A fast view of climate, guidance, and confidence so you can stay oriented as you move
        through the report.
      </p>
    </div>

    <Tabs.Root defaultValue="climate">
      <Tabs.List className="flex flex-wrap gap-2">
        {[
          { value: "climate", label: "Climate" },
          { value: "guidance", label: "Guidance" },
          { value: "confidence", label: "Confidence" },
        ].map((tab) => (
          <Tabs.Tab
            key={tab.value}
            value={tab.value}
            className={({ active }) =>
              `weather-tab inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold tracking-[0.14em] transition-colors sm:px-4 sm:tracking-[0.18em] ${
                active
                  ? "border-sky-400/70 bg-sky-500/20 text-sky-100"
                  : "text-slate-300 hover:border-sky-400/70 hover:text-slate-100"
              }`
            }
          >
            {tab.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>

      <Tabs.Panel value="climate" className="mt-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-300">Current operating climate</p>
            <span className="text-3xl font-semibold tracking-tight text-slate-100">
              {statusLabel}
            </span>
            <p className="text-xs text-slate-300">Signals stamped {recordDateLabel}</p>
            <p className="text-xs text-slate-300">Signal confidence: {trustStatusLabel}</p>
          </div>
          <span
            className={`rounded-full border px-3 py-2 text-xs font-semibold tracking-[0.12em] ${trustToneStyles}`}
          >
            {trustStatusLabel}
          </span>
        </div>
        <p className="text-sm text-slate-300">
          Use the climate label as a neutral, external anchor in planning conversations and keep
          delivery pacing aligned with capital conditions.
        </p>
      </Tabs.Panel>

      <Tabs.Panel value="guidance" className="mt-4 space-y-4">
        <p className="text-sm text-slate-200">
          Focus on the highest-leverage initiatives, communicate the climate change early, and keep
          leadership aligned on why priorities shift.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href="#weekly-action-summary"
            className="weather-pill inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100"
          >
            Review this week’s actions
          </a>
          <a
            href="#executive-snapshot"
            className="weather-pill inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100"
          >
            Share the leadership snapshot
          </a>
        </div>
      </Tabs.Panel>

      <Tabs.Panel value="confidence" className="mt-4 space-y-3">
        <p className="text-sm font-semibold text-slate-100">{trustStatusLabel}</p>
        <p className="text-sm text-slate-200/90">{trustStatusDetail}</p>
        <p className="text-xs text-slate-200/80">{trustStatusAction}</p>
      </Tabs.Panel>
    </Tabs.Root>

    <div className="border-t border-slate-800/70 pt-4">
      <ReportInterpretationNotes />
    </div>
  </section>
);
