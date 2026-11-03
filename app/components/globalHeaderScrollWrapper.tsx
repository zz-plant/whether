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

  /* The bare `transition` utility, not `transition-transform`: the shadow below
     toggled at the threshold in one frame while the slide eased over 300ms, so
     the header popped a shadow on the way out. The named list covers both what
     moves here — transform and box-shadow — and nothing else changes on the
     element (§XXIII: name what moves; the every-property utility is banned and
     tested against). `motion-reduce:transition-none` is the standard's required
     reduced-motion end state: the header shows and hides instantly. */
  return (
    <header
      className={`mx-auto sticky top-0 z-[var(--z-chrome)] w-full max-w-[96rem] px-4 transition motion-reduce:transition-none duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        hidden ? "-translate-y-full" : "translate-y-0"
      } ${atTop ? "" : "shadow-[0_4px_12px_-8px_rgba(0,0,0,0.4)]"}`}
    >
      {children}
    </header>
  );
}
