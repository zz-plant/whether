"use client";

import { type ReactNode } from "react";
import { useScrollDirection } from "./useScrollDirection";

type GlobalHeaderScrollWrapperProps = {
  children: ReactNode;
};

export function GlobalHeaderScrollWrapper({ children }: GlobalHeaderScrollWrapperProps) {
  const { direction, isPastThreshold } = useScrollDirection();
  /* Both were state assigned from an effect on every scroll frame, which is a
     render per frame to reach a value this render already has: the hook's own
     state is the only input either one reads. Its initial state is `up` and not
     past the threshold, so the first render still comes out shown and at top. */
  const atTop = !isPastThreshold;
  const hidden = isPastThreshold && direction === "down";

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
