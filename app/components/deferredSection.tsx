import { Suspense, type ReactNode } from "react";
import { RevealOnView } from "./revealOnView";

type DeferredSectionProps = {
  id: string;
  ariaLabel: string;
  fallback: ReactNode;
  children: ReactNode;
  className?: string;
};

export const DeferredSection = ({
  id,
  ariaLabel,
  fallback,
  children,
  className = "space-y-8",
}: DeferredSectionProps) => (
  <RevealOnView placeholder={fallback}>
    <Suspense fallback={fallback}>
      <section id={id} aria-label={ariaLabel} className={className}>
        {children}
      </section>
    </Suspense>
  </RevealOnView>
);
