"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "whether_role";
type Role = "ceo" | "cfo" | "vp-engineering" | "default";

const ROLES: { key: Role; label: string; desc: string }[] = [
  { key: "default", label: "All", desc: "Full operating brief" },
  { key: "ceo", label: "CEO", desc: "Call + board summary" },
  { key: "cfo", label: "CFO", desc: "Cash + runway" },
  { key: "vp-engineering", label: "VP Eng", desc: "Hiring + roadmap" },
];

export function RoleSelector() {
  const [role, setRole] = useState<Role>("default");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Role | null;
    if (saved && ROLES.some((r) => r.key === saved)) {
      setRole(saved);
    }
    setHydrated(true);
  }, []);

  const handleChange = (r: Role) => {
    setRole(r);
    localStorage.setItem(STORAGE_KEY, r);
  };

  if (!hydrated) return null;

  return (
    <div className="flex items-center gap-1.5 text-fluid-micro">
      <span className="text-slate-500">View as:</span>
      {ROLES.map((r) => (
        <button
          key={r.key}
          type="button"
          onClick={() => handleChange(r.key)}
          title={r.desc}
          className={`rounded-full px-2.5 py-1 font-medium transition-colors ${
            role === r.key
              ? "bg-sky-500/15 text-sky-200"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

export function getSelectedRole(): Role {
  if (typeof window === "undefined") return "default";
  const saved = localStorage.getItem(STORAGE_KEY) as Role | null;
  return saved && ROLES.some((r) => r.key === saved) ? saved : "default";
}
