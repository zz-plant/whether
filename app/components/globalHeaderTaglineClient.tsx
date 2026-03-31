"use client";

import { usePathname } from "next/navigation";
import { resolveGlobalHeaderTagline } from "../../lib/navigation/globalHeader";

type GlobalHeaderTaglineClientProps = {
  pathname?: string;
};

export function GlobalHeaderTaglineClient({ pathname }: GlobalHeaderTaglineClientProps) {
  const currentPathname = usePathname() ?? "/";
  const tagline = resolveGlobalHeaderTagline(pathname ?? currentPathname);

  if (!tagline.description) {
    return <p className="mt-1 text-sm font-medium text-slate-300">{tagline.title}</p>;
  }

  return (
    <div className="mt-1 space-y-1">
      <p className="text-sm font-semibold tracking-tight text-slate-100 sm:text-base">{tagline.title}</p>
      <p className="max-w-2xl text-sm leading-relaxed text-slate-300">{tagline.description}</p>
    </div>
  );
}
