"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export const ViewportReveal = ({
  children,
  className,
  delayMs = 0,
  priority = false,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  priority?: boolean;
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const target = ref.current;
    if (!target) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }
          setRevealed(true);
          observer.disconnect();
          break;
        }
      },
      {
        threshold: priority ? 0.14 : 0.2,
        rootMargin: priority ? "0px 0px -10% 0px" : "0px 0px -15% 0px",
      },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [priority]);

  return (
    <div
      ref={ref}
      data-revealed={revealed ? "true" : "false"}
      data-priority={priority ? "true" : "false"}
      style={{ "--section-reveal-delay": `${Math.max(0, delayMs)}ms` } as CSSProperties}
      className={["section-entry", className].filter(Boolean).join(" ")}
    >
      {children}
    </div>
  );
};
