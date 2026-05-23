"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";

const STORAGE_KEY = "whether_visited";

export function OnboardingGate({ children }: { children: ReactNode }) {
  const [isReturnVisitor, setIsReturnVisitor] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const visited = localStorage.getItem(STORAGE_KEY);
    if (visited) {
      setIsReturnVisitor(true);
    } else {
      localStorage.setItem(STORAGE_KEY, "1");
    }
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return null;
  }

  if (isReturnVisitor) {
    return (
      <p className="text-center text-fluid-xs text-slate-600 pt-2">
        <Link href="/trust" className="hover:text-slate-400 transition-colors no-underline">
          How this works
        </Link>
      </p>
    );
  }

  return <>{children}</>;
}
