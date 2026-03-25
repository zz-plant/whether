"use client";

import { resolveGlobalHeaderTagline } from "../../lib/navigation/globalHeader";

type GlobalHeaderTaglineClientProps = {
  pathname: string;
};

export function GlobalHeaderTaglineClient({ pathname }: GlobalHeaderTaglineClientProps) {
  const tagline = resolveGlobalHeaderTagline(pathname);

  if (!tagline.description) {
    return <p className="mt-1 text-sm font-medium text-slate-300 sm:text-base">{tagline.title}</p>;
  }

  return (
    <div className="mt-1 space-y-1">
      <p className="text-base font-semibold tracking-tight text-slate-100 sm:text-lg">{tagline.title}</p>
      <p className="max-w-2xl text-sm text-slate-300">{tagline.description}</p>
    </div>
  );
}
