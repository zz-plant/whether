"use client";

import { useEffect, useState } from "react";
import { useCrossDeviceSync } from "../../../lib/hooks/useCrossDeviceSync";

const STORAGE_KEY = "whether_alerts";

type AlertPrefs = {
  tightness: boolean;
  riskAppetite: boolean;
};

function loadPrefs(): AlertPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { tightness: false, riskAppetite: false };
  } catch {
    return { tightness: false, riskAppetite: false };
  }
}

function savePrefs(prefs: AlertPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch { /* quota */ }
}

export function AlertToggle({ label, id }: { label: string; id: "tightness" | "riskAppetite" }) {
  const [active, setActive] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const { markDirty } = useCrossDeviceSync(STORAGE_KEY, { tightness: false, riskAppetite: false });

  useEffect(() => {
    const prefs = loadPrefs();
    setActive(prefs[id]);
    setHydrated(true);
  }, [id]);

  const toggle = () => {
    const next = !active;
    setActive(next);
    const prefs = loadPrefs();
    prefs[id] = next;
    savePrefs(prefs);
    markDirty(STORAGE_KEY);
  };

  if (!hydrated) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-fluid-micro font-medium transition-colors ${
        active
          ? "bg-sky-500/15 text-sky-200 border border-sky-400/30"
          : "text-slate-600 hover:text-slate-400"
      }`}
      title={active ? `Alerting on ${label} changes` : `Click to watch ${label}`}
    >
      {active ? "🔔" : "🔕"} {label}
    </button>
  );
}
