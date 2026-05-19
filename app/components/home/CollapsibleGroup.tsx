"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useLocalStorageState } from "../../../lib/hooks/useLocalStorageState";

export function CollapsibleGroup({
  storageKey,
  label,
  defaultOpen = true,
  children,
}: {
  storageKey: string;
  label: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [stored, setStored] = useLocalStorageState<string>(storageKey, defaultOpen ? "1" : "0");
  const [mobile, setMobile] = useState(false);

  useEffect(() => { setMobile(window.innerWidth < 1024); }, []);

  const open = mobile ? stored === "1" : stored !== "0";
  const toggle = () => setStored(open ? "0" : "1");

  return (
    <div className={`weather-card space-y-3 ${open ? "" : "bg-slate-950/20"}`}>
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-500">
          {label}
        </span>
        <span className={`text-fluid-micro text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      {open ? children : null}
    </div>
  );
}
