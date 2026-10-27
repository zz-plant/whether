"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { navigationGroups } from "../../../lib/navigation/informationArchitecture";

type HelpModalProps = {
  open: boolean;
  onClose: () => void;
};

/* C and F press controls only the brief renders (Copy Brief, and the main focus
   mode narrows), so they say where they work; the list opens on every route. */
const SHORTCUTS: Array<[string, string]> = [
  ["C", "On the brief: copy the Slack brief"],
  ["⇧S", "Share this page"],
  ["F", "On the brief: presentation / focus mode"],
  ["J", "Next section"],
  ["K", "Previous section"],
  ...navigationGroups.map((group): [string, string] => [group.shortcut.toUpperCase(), `${group.label}: ${group.description}`]),
  ["⌘K", "Search or jump to a page"],
  ["/", "Search"],
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
              <kbd className="weather-kbd">{key}</kbd>
              <span className="text-slate-400">{desc}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
