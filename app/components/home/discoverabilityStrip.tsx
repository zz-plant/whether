"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const LINKS = [
  { href: "/threshold", label: "Decision Framework", desc: "How bounded decisions work" },
  { href: "/template", label: "Decision Template", desc: "Printable one-pager" },
  { href: "/resources", label: "Resources", desc: "Guides and references" },
  { href: "/about", label: "About", desc: "What Whether is and who it's for" },
  { href: "/search", label: "Search", desc: "Find signals and posts" },
  { href: "/feed.xml", label: "RSS Feed", desc: "Subscribe in your feed reader" },
];

const STORAGE_KEY = "whether_explore_open";

export function DiscoverabilityStrip() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setOpen(stored !== "0");
    } catch {
      setOpen(true);
    }
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {}
  };

  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-950/40 px-4 py-3">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-500">Explore</span>
        <span className={`text-fluid-micro text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open ? (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
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
      ) : null}
    </div>
  );
}
