"use client";

import { useRouter, useSearchParams } from "next/navigation";

const CADENCES = [
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
] as const;

const VIEWS = [
  { key: "default", label: "Default" },
  { key: "sector", label: "Sector" },
  { key: "company", label: "Company" },
  { key: "financial", label: "Financial" },
  { key: "forecast", label: "Posture" },
] as const;

export function CadenceSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = (searchParams?.get("cadence") as string) ?? "weekly";

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-slate-800/60 bg-slate-950/60 p-0.5">
      {CADENCES.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => {
            const params = new URLSearchParams(searchParams?.toString() ?? "");
            if (c.key === "weekly") params.delete("cadence");
            else params.set("cadence", c.key);
            const qs = params.toString();
            router.replace(qs ? `/?${qs}` : "/", { scroll: false });
          }}
          aria-pressed={current === c.key}
          className={`rounded-full px-2.5 py-1 text-fluid-micro font-semibold transition-colors ${
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

export function ViewSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = (searchParams?.get("view") as string) ?? "default";

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-slate-800/60 bg-slate-950/60 p-0.5">
      {VIEWS.map((v) => (
        <button
          key={v.key}
          type="button"
          onClick={() => {
            const params = new URLSearchParams(searchParams?.toString() ?? "");
            if (v.key === "default") params.delete("view");
            else params.set("view", v.key);
            const qs = params.toString();
            router.replace(qs ? `/?${qs}` : "/", { scroll: false });
          }}
          aria-pressed={current === v.key}
          className={`rounded-full px-2.5 py-1 text-fluid-micro font-semibold transition-colors ${
            current === v.key
              ? "bg-sky-500/14 text-sky-100"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
