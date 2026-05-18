"use client";

import Link from "next/link";

const LINKS = [
  { href: "/threshold", label: "Decision Framework", desc: "How bounded decisions work" },
  { href: "/template", label: "Decision Template", desc: "Printable one-pager" },
  { href: "/resources", label: "Resources", desc: "Guides and references" },
  { href: "/about", label: "About", desc: "What Whether is and who it's for" },
  { href: "/search", label: "Search", desc: "Find signals and posts" },
  { href: "/feed.xml", label: "RSS Feed", desc: "Subscribe in your feed reader" },
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
