/**
 * Floating back-to-top button that appears after scrolling past a threshold.
 * Smooth-scrolls to the top on click.
 */
"use client";

import { useEffect, useRef, useState } from "react";

const SCROLL_THRESHOLD = 600;

export function BackToTop({ threshold = SCROLL_THRESHOLD }: { threshold?: number }) {
  const [visible, setVisible] = useState(false);
  const frameRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        setVisible(window.scrollY > threshold);
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(frameRef.current);
    };
  }, [threshold]);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-40 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-slate-700/70 bg-slate-950/90 text-sm font-semibold text-slate-200 shadow-lg backdrop-blur-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-sky-500/40 hover:text-sky-100 focus-visible:outline-2 focus-visible:outline-sky-400 sm:bottom-8 sm:right-8" style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1.5rem)" }}
      aria-label="Back to top"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m18 15-6-6-6 6" />
      </svg>
    </button>
  );
}
