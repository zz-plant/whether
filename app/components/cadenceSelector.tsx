"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const CADENCES = [
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
] as const;

export function CadenceSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = (searchParams?.get("cadence") as string) ?? "weekly";

  if (pathname !== "/") return null;

  return (
    <div className="flex items-center gap-1 rounded-full border border-slate-800/60 bg-slate-950/60 p-0.5">
      {CADENCES.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => {
            const params = new URLSearchParams(searchParams?.toString() ?? "");
            if (c.key === "weekly") params.delete("cadence");
            else params.set("cadence", c.key);
            const qs = params.toString();
            router.push(qs ? `/?${qs}` : "/");
          }}
          className={`rounded-full px-3 py-1 text-fluid-micro font-semibold transition-colors ${
            current === c.key
              ? "bg-sky-500/14 text-sky-100"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
