"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type HelpModalProps = {
  open: boolean;
  onClose: () => void;
};

const SHORTCUTS = [
  ["C", "Copy Slack brief"],
  ["F", "Toggle presentation / focus mode"],
  ["J", "Next section"],
  ["K", "Previous section"],
  ["E", "Evidence & signals"],
  ["P", "Planning & operations"],
  ["H", "History & track record"],
  ["T", "Trust & provenance"],
  ["R", "Resolve & methodology"],
  ["/", "Search & command palette"],
  ["?", "Show this help"],
];

export function HelpModal({ open, onClose }: HelpModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          {SHORTCUTS.map(([key, desc]) => (
            <div key={key} className="flex items-center gap-3 text-xs">
              <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-slate-300 font-mono text-fluid-nano min-w-[1.5rem] text-center">
                {key}
              </kbd>
              <span className="text-slate-400">{desc}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
