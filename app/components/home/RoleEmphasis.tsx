"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "whether_role";
type Role = "ceo" | "cfo" | "vp-engineering" | "default";

const ROLE_EMPHASIS: Record<Role, string> = {
  default: "",
  ceo: "Focus: board-ready call and flip conditions. Scroll down for the framework card.",
  cfo: "Focus: cash position, burn rate, and runway. Your numbers are in the section below.",
  "vp-engineering": "Focus: hiring guidance and roadmap impact. Check team-specific thresholds.",
};

export function RoleEmphasis() {
  const [role, setRole] = useState<Role>("default");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Role | null;
    if (saved) setRole(saved);
    setHydrated(true);
  }, []);

  if (!hydrated || role === "default" || !ROLE_EMPHASIS[role]) return null;

  return (
    <p className="text-fluid-xs text-sky-200/70 italic text-center max-w-xl mx-auto">
      {ROLE_EMPHASIS[role]}
    </p>
  );
}
