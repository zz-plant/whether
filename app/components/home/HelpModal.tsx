"use client";

import { useEffect, useState } from "react";

type HelpModalProps = {
  open: boolean;
  onClose: () => void;
};

export function HelpModal({ open, onClose }: HelpModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="rounded-xl border border-slate-700/60 bg-slate-900/95 px-6 py-5 shadow-2xl max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-200">Keyboard shortcuts</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
        <div className="space-y-2 text-xs">
          {[
            ["J", "Next section"],
            ["K", "Previous section"],
            ["E", "Evidence page"],
            ["P", "Planning page"],
            ["H", "History page"],
            ["T", "Trust page"],
            ["R", "Resolve page"],
            ["/", "Search"],
            ["?", "Show this help"],
          ].map(([key, desc]) => (
            <div key={key} className="flex items-center gap-3">
              <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[11px] font-mono text-slate-300 min-w-[1.5rem] text-center">
                {key}
              </kbd>
              <span className="text-slate-500">{desc}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[10px] text-slate-600">
          Press <kbd className="rounded border border-slate-700 px-1 text-[10px] text-slate-500">Esc</kbd> to close
        </p>
      </div>
    </div>
  );
}
