"use client";

import Link from "next/link";

const LINKS = [
  { href: "/current-regime", label: "Current Regime", desc: "Full page" },
  { href: "/comps", label: "SaaS Multiples", desc: "Live valuation data" },
  { href: "/regime-changes", label: "Regime Changes", desc: "Historical transitions" },
  { href: "/threshold", label: "Decision Framework", desc: "How bounded decisions work" },
  { href: "/template", label: "Decision Template", desc: "Printable one-pager" },
  { href: "/api-docs", label: "API & Agents", desc: "Tools for developers and AI" },
];

export function DiscoverabilityStrip() {
  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-950/30 px-4 py-3">
      <p className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">Explore</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-fluid-micro text-slate-400 hover:text-sky-200 transition-colors no-underline"
          >
            {link.label}
            <span className="text-slate-600 ml-1">— {link.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
