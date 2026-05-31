"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useScrollDirection } from "./useScrollDirection";

type GlobalHeaderScrollWrapperProps = {
  children: ReactNode;
};

export function GlobalHeaderScrollWrapper({ children }: GlobalHeaderScrollWrapperProps) {
  const { direction, isPastThreshold } = useScrollDirection();
  const [hidden, setHidden] = useState(false);
  const [atTop, setAtTop] = useState(true);

  useEffect(() => {
    if (!isPastThreshold) {
      setHidden(false);
      setAtTop(true);
      return;
    }
    setAtTop(false);
    setHidden(direction === "down");
  }, [direction, isPastThreshold]);

  return (
    <header
      className={`mx-auto sticky top-0 z-50 w-full max-w-[96rem] px-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        hidden ? "-translate-y-full" : "translate-y-0"
      } ${atTop ? "" : "shadow-[0_4px_12px_-8px_rgba(0,0,0,0.4)]"}`}
    >
      {children}
    </header>
  );
}
