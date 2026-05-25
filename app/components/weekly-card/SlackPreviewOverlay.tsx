"use client";

import { useEffect, useState } from "react";

export function SlackPreviewOverlay() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const handleToggle = (e: Event) => {
      const customEvent = e as CustomEvent<{ active?: boolean }>;
      setActive((prev) => customEvent.detail?.active ?? !prev);
    };

    window.addEventListener("whether-toggle-slack-preview", handleToggle);
    return () => {
      window.removeEventListener("whether-toggle-slack-preview", handleToggle);
    };
  }, []);

  if (!active) return null;

  return (
    <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center overflow-hidden">
      {/* 1.91:1 Slack aspect ratio box centered */}
      <div className="relative w-full max-w-[1200px] aspect-[1.91/1] border-2 border-dashed border-sky-500/80 bg-sky-500/[0.02] shadow-[0_0_0_9999px_rgba(4,8,16,0.75)] rounded">
        {/* Label badge */}
        <span className="absolute top-3 left-3 rounded-full bg-sky-500/90 backdrop-blur px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-950 shadow-lg">
          Slack Preview Area (1.91:1)
        </span>
      </div>
    </div>
  );
}
