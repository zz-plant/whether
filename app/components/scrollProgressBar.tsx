/**
 * Thin scroll-progress bar pinned below the header.
 * Shows how far the user has scrolled through the page as a fraction of
 * the total scrollable height. Disappears when at the very top.
 */
"use client";

import { useEffect, useRef, useState } from "react";

export function ScrollProgressBar() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const frameRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (docHeight <= 0) {
          setProgress(0);
          setVisible(false);
          return;
        }
        const pct = Math.min(scrollTop / docHeight, 1);
        setProgress(pct);
        setVisible(scrollTop > 120);
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px]"
      role="progressbar"
      aria-valuenow={Math.round(progress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Page scroll progress"
    >
      <div
        className="h-full rounded-full bg-sky-500/70 transition-[width] duration-150 ease-out"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}
