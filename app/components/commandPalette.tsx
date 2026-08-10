"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { Search, CornerRightUp, Maximize2, Download, History as HistoryIcon } from "lucide-react";
import { primaryNavigationLayers, navigationLayers } from "../../lib/navigation/informationArchitecture";

type CommandItem = {
  id: string;
  label: string;
  description?: string;
  icon: typeof Search;
  action: () => void;
  shortcut?: string;
};

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const toggleFocusMode = () => {
    document.dispatchEvent(new CustomEvent("whether:toggle-focus-mode"));
    onClose();
  };

  const navigateTo = (href: string) => {
    router.push(href);
    onClose();
  };

  const commands: CommandItem[] = useMemo(() => {
    const navCommands: CommandItem[] = navigationLayers.map((layer) => ({
      id: `nav-${layer.key}`,
      label: layer.label,
      description: layer.description,
      icon: CornerRightUp,
      action: () => navigateTo(layer.href),
      shortcut: layer.navLabel,
    }));

    const actionCommands: CommandItem[] = [
      {
        id: "focus",
        label: "Toggle focus mode",
        description: "Presentation mode for meetings",
        icon: Maximize2,
        action: toggleFocusMode,
        shortcut: "F",
      },
      {
        id: "export",
        label: "Share brief",
        description: "Open share panel with presets",
        icon: Download,
        action: () => {
          onClose();
          document.dispatchEvent(new CustomEvent("whether-open-share-rail"));
        },
        shortcut: "⇧S",
      },
      {
        id: "history",
        label: "View history",
        description: "Browse past briefs and compare epochs",
        icon: HistoryIcon,
        action: () => navigateTo("/history"),
        shortcut: "H",
      },
    ];

    return [...navCommands, ...actionCommands];
  }, [navigateTo, toggleFocusMode, onClose]);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q),
    );
  }, [query, commands]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        filtered[selectedIndex]?.action();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filtered, selectedIndex]);

  return (
    <Dialog.Root open onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Popup className="fixed z-50 top-[15vh] left-1/2 -translate-x-1/2 w-full max-w-lg mx-auto rounded-xl border border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-xl overflow-hidden" aria-label="Command palette">
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
            <Search className="text-slate-400 shrink-0" size={18} aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages, actions..."
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
              autoFocus
              aria-label="Search commands"
            />
            <kbd className="text-[10px] text-slate-500 font-mono border border-slate-700 rounded px-1.5 py-0.5">ESC</kbd>
          </div>
          <nav aria-label="Command results" className="max-h-80 overflow-y-auto py-2">
            {filtered.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">No results</p>
            ) : (
              <ul className="space-y-0.5">
                {filtered.map((cmd, i) => {
                  const Icon = cmd.icon;
                  return (
                    <li key={cmd.id}>
                      <button
                        type="button"
                        onClick={cmd.action}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          i === selectedIndex
                            ? "bg-sky-500/14 text-sky-100"
                            : "text-slate-300 hover:bg-white/[0.06]"
                        }`}
                        aria-current={i === selectedIndex ? "true" : undefined}
                      >
                        <Icon size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium truncate">{cmd.label}</span>
                          {cmd.description ? (
                            <span className="block text-xs text-slate-500 truncate">{cmd.description}</span>
                          ) : null}
                        </span>
                        {cmd.shortcut ? (
                          <kbd className="text-[10px] text-slate-500 font-mono border border-slate-700/60 rounded px-1.5 py-0.5 shrink-0">
                            {cmd.shortcut}
                          </kbd>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </nav>
          <div className="border-t border-white/10 px-4 py-2 flex items-center gap-4 text-[10px] text-slate-500">
            <span className="flex items-center gap-1"><kbd className="font-mono border border-slate-700 rounded px-1">↑↓</kbd> navigate</span>
            <span className="flex items-center gap-1"><kbd className="font-mono border border-slate-700 rounded px-1">↵</kbd> select</span>
            <span className="flex items-center gap-1"><kbd className="font-mono border border-slate-700 rounded px-1">esc</kbd> close</span>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
