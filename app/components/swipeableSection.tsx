"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type SectionItem = {
  key: string;
  content: ReactNode;
};

type SwipeableSectionProps = {
  sections: SectionItem[];
  className?: string;
};

const SWIPE_THRESHOLD = 60;

export function SwipeableSection({ sections, className = "" }: SwipeableSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const touchStart = useRef<number | null>(null);

  useEffect(() => {
    setIsMobile(window.matchMedia("(max-width: 639px)").matches);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStart.current === null) return;
      const delta = e.changedTouches[0].clientX - touchStart.current;
      touchStart.current = null;

      if (Math.abs(delta) < SWIPE_THRESHOLD) return;

      if (delta < 0 && activeIndex < sections.length - 1) {
        setActiveIndex((i) => i + 1);
      } else if (delta > 0 && activeIndex > 0) {
        setActiveIndex((i) => i - 1);
      }
    },
    [activeIndex, sections.length],
  );

  if (sections.length === 0) return null;

  if (!isMobile) {
    return (
      <div className={className}>
        {sections.map((section, index) => (
          <div key={section.key} className={index === 0 ? "" : "border-t border-white/[0.04] pt-6 lg:pt-8"}>
            {section.content}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className={className}>
      <div key={sections[activeIndex].key} className="transition-opacity duration-200">
        {sections[activeIndex].content}
      </div>

      {sections.length > 1 ? (
        <div className="mt-5 flex justify-center gap-2" role="tablist" aria-label="Section navigation">
          {sections.map((section, index) => (
            <button
              key={section.key}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              onClick={() => setActiveIndex(index)}
              className={`h-2 rounded-full transition-all duration-200 ${
                index === activeIndex ? "w-6 bg-sky-400" : "w-2 bg-slate-700 hover:bg-slate-500"
              }`}
              aria-label={`Go to section ${index + 1}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
