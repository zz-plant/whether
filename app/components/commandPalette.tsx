"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { Search, CornerRightUp, Maximize2, Download, Archive } from "lucide-react";
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

  const filteredRef = useRef<CommandItem[]>([]);
  const selectedIndexRef = useRef(0);

  const toggleFocusMode = useCallback(() => {
    document.dispatchEvent(new CustomEvent("whether:toggle-focus-mode"));
    onClose();
  }, [onClose]);

  const navigateTo = useCallback((href: string) => {
    router.push(href);
    onClose();
  }, [router, onClose]);

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
        icon: Archive,
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

  filteredRef.current = filtered;
  selectedIndexRef.current = selectedIndex;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredRef.current.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        filteredRef.current[selectedIndexRef.current]?.action();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <Dialog.Root open onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Popup className="fixed z-50 top-[12vh] left-1/2 -translate-x-1/2 w-full max-w-lg mx-auto rounded-2xl border border-slate-800/80 bg-slate-950/95 shadow-2xl shadow-black/80 backdrop-blur-2xl overflow-hidden" aria-label="Command palette">
          <div className="flex items-center gap-3 border-b border-slate-800/80 px-4 py-3.5 bg-slate-900/40">
            <Search className="text-sky-400 shrink-0" size={18} aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages, actions, tools..."
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none font-medium"
              autoFocus
              aria-label="Search commands"
            />
            <kbd className="text-[10px] text-slate-400 font-mono border border-slate-800 bg-slate-900 rounded-md px-2 py-0.5 shadow-inner">ESC</kbd>
          </div>
          <nav aria-label="Command results" className="max-h-80 overflow-y-auto py-2">
            {filtered.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500 font-medium">No matching commands</p>
            ) : (
              <ul className="space-y-1 px-1.5">
                {filtered.map((cmd, i) => {
                  const Icon = cmd.icon;
                  const isSelected = i === selectedIndex;
                  return (
                    <li key={cmd.id}>
                      <button
                        type="button"
                        onClick={cmd.action}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all duration-150 ${
                          isSelected
                            ? "bg-sky-500/15 text-sky-100 border border-sky-500/30 shadow-[0_0_12px_rgba(56,189,248,0.12)] font-semibold"
                            : "text-slate-300 border border-transparent hover:bg-slate-800/50 hover:text-white"
                        }`}
                        aria-current={isSelected ? "true" : undefined}
                      >
                        <Icon size={16} className={`shrink-0 ${isSelected ? "text-sky-400" : "text-slate-400"}`} aria-hidden="true" />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium truncate">{cmd.label}</span>
                          {cmd.description ? (
                            <span className="block text-xs text-slate-400/80 truncate font-normal">{cmd.description}</span>
                          ) : null}
                        </span>
                        {cmd.shortcut ? (
                          <kbd className="text-[10px] text-slate-400 font-mono border border-slate-800 bg-slate-900/80 rounded-md px-2 py-0.5 shrink-0 shadow-inner">
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
          <div className="border-t border-slate-800/80 px-4 py-2.5 bg-slate-900/40 flex items-center gap-4 text-[10px] text-slate-400 font-medium">
            <span className="flex items-center gap-1.5"><kbd className="font-mono border border-slate-800 bg-slate-900 rounded px-1.5 py-0.5 text-slate-300">↑↓</kbd> navigate</span>
            <span className="flex items-center gap-1.5"><kbd className="font-mono border border-slate-800 bg-slate-900 rounded px-1.5 py-0.5 text-slate-300">↵</kbd> select</span>
            <span className="flex items-center gap-1.5"><kbd className="font-mono border border-slate-800 bg-slate-900 rounded px-1.5 py-0.5 text-slate-300">esc</kbd> close</span>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
