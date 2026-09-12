"use client";

import { useEffect, useState } from "react";
import { X, Copy, Check, Presentation, Maximize2 } from "lucide-react";
import { useRouter } from "next/navigation";

export interface MeetingSlideModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordDate: string;
  postureLabel: string;
  weeklyCall: string;
  actions: Array<{ id: string | number; text: string }>;
  boldnessScore: number;
}

export function MeetingSlideModal({
  isOpen,
  onClose,
  recordDate,
  postureLabel,
  weeklyCall,
  actions,
  boldnessScore,
}: MeetingSlideModalProps) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyMarkdown = async () => {
    const text = [
      `# Whether Leadership Brief — Week of ${recordDate}`,
      `**Posture:** ${postureLabel} | **Operating Latitude:** ${boldnessScore}/100`,
      `**Operating Call:** ${weeklyCall}`,
      "",
      "### Approved Decisions This Week:",
      ...actions.map((a, i) => `${i + 1}. ${a.text}`),
      "",
      "_Source: whether.work · Weekly Operating Call for Startup Leaders_",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div
      aria-modal="true"
      aria-label="Meeting Slide Preview"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <Presentation size={18} className="text-teal-400" />
            <h3 className="text-sm font-semibold text-white">
              Meeting Slide Preview (16:9)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* 16:9 Ratio Container */}
        <div className="aspect-[16/9] w-full rounded-xl border border-slate-800 bg-slate-950 p-8 flex flex-col justify-between shadow-inner relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-start justify-between relative z-10">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-teal-400">
                Weekly Operating Brief
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
                Week of {recordDate}
              </h2>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-teal-500/30 bg-teal-500/15 px-3 py-1 text-xs font-semibold text-teal-300">
                {postureLabel}
              </span>
              <p className="text-xs text-slate-400 mt-1 tabular-nums">
                Latitude: <strong className="text-white">{boldnessScore}</strong> / 100
              </p>
            </div>
          </div>

          {/* Core Call & Actions */}
          <div className="space-y-4 relative z-10 my-auto">
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                The Call
              </span>
              <p className="text-base sm:text-lg font-medium text-white mt-0.5 leading-snug">
                “{weeklyCall}”
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {actions.slice(0, 3).map((action, i) => (
                <div
                  key={action.id}
                  className="rounded-lg border border-white/[0.06] bg-slate-900/60 p-3 flex flex-col justify-between"
                >
                  <span className="text-xs font-bold text-teal-400">
                    Action 0{i + 1}
                  </span>
                  <p className="text-xs font-medium text-slate-200 mt-1 leading-snug">
                    {action.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-white/[0.08] text-[11px] text-slate-500 relative z-10">
            <span>Whether · whether.work</span>
            <span>U.S. Treasury Par · St. Louis Fed FRED</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleCopyMarkdown}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check size={14} className="text-teal-400" />
                <span>Copied Markdown!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>{"Copy as Markdown"}</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push("/present");
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-400 px-5 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-300 transition-colors cursor-pointer"
          >
            <Maximize2 size={14} />
            <span>Full Screen Presentation</span>
          </button>
        </div>
      </div>
    </div>
  );
}
