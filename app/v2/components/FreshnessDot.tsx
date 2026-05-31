"use client";

import { useEffect, useState } from "react";

export function FreshnessDot({ label }: { label: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="lg:hidden flex items-center justify-center gap-2 py-1.5 text-fluid-nano text-white/40">
      <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400/60" aria-hidden="true" />
      <span>Updated {label}</span>
    </div>
  );
}
