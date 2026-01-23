"use client";

import { Tabs } from "@base-ui/react/tabs";

export const ReportSummaryTabs = ({
  statusLabel,
  recordDateLabel,
  trustStatusLabel,
  trustStatusDetail,
  trustStatusAction,
  trustToneStyles,
  showOfflineBadge,
  offlineBadgeLabel,
}: {
  statusLabel: string;
  recordDateLabel: string;
  trustStatusLabel: string;
  trustStatusDetail: string;
  trustStatusAction: string;
  trustToneStyles: string;
  showOfflineBadge: boolean;
  offlineBadgeLabel: string;
}) => (
  <section className="weather-panel space-y-4 px-5 py-4">
    <div className="space-y-2">
      <p className="text-xs font-semibold tracking-[0.32em] text-slate-400">Signal console</p>
      <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">Weekly operating brief</h2>
      <p className="max-w-2xl text-sm text-slate-300">
        Toggle between the climate readout, practical guidance, and confidence notes for this
        week’s signals.
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
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-3 py-2 text-xs font-semibold tracking-[0.12em] ${trustToneStyles}`}
            >
              {trustStatusLabel}
            </span>
            {showOfflineBadge ? (
              <span className="rounded-full border border-rose-400/60 bg-rose-500/10 px-3 py-2 text-xs font-semibold tracking-[0.12em] text-rose-100">
                {offlineBadgeLabel}
              </span>
            ) : null}
          </div>
        </div>
        <p className="text-sm text-slate-300">
          Use the climate label as a neutral, external anchor in planning conversations and keep
          delivery pacing aligned with capital conditions.
        </p>
      </Tabs.Panel>

      <Tabs.Panel value="guidance" className="mt-4 space-y-4">
        <p className="text-sm text-slate-200">
          Keep the weekly plan tight: align on the posture, broadcast any changes early, and
          prioritize the smallest scope that protects retention or reliability.
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
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              title: "Confirm changes",
              detail: "Delta snapshot + alerts before approving the sprint.",
              href: "#change-since-last-read",
            },
            {
              title: "Lock a single bet",
              detail: "Choose the smallest scope that preserves outcomes.",
              href: "#weekly-action-summary",
            },
            {
              title: "Back it with evidence",
              detail: "Use the signal matrix if decisions need justification.",
              href: "#signal-matrix",
            },
          ].map((item) => (
            <a
              key={item.title}
              href={item.href}
              className="weather-surface flex min-h-[96px] flex-col gap-2 p-3 text-left transition-colors hover:border-sky-400/70 touch-manipulation"
            >
              <p className="text-xs font-semibold tracking-[0.14em] text-slate-400">{item.title}</p>
              <p className="text-xs text-slate-300">{item.detail}</p>
            </a>
          ))}
        </div>
      </Tabs.Panel>

      <Tabs.Panel value="confidence" className="mt-4 space-y-3">
        <p className="text-sm font-semibold text-slate-100">{trustStatusLabel}</p>
        <p className="text-sm text-slate-200/90">{trustStatusDetail}</p>
        <p className="text-xs text-slate-200/80">{trustStatusAction}</p>
      </Tabs.Panel>
    </Tabs.Root>
  </section>
);
