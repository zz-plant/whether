"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { shortcutNavigationLayers } from "../../../lib/navigation/informationArchitecture";

type HelpModalProps = {
  open: boolean;
  onClose: () => void;
};

const SHORTCUTS: Array<[string, string]> = [
  ["C", "Copy Slack brief"],
  ["⇧S", "Share brief"],
  ["F", "Toggle presentation / focus mode"],
  ["J", "Next section"],
  ["K", "Previous section"],
  ...shortcutNavigationLayers.map((layer): [string, string] => [layer.shortcut.toUpperCase(), layer.description]),
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
