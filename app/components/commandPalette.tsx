"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { Search, CornerRightUp, Maximize2, Download, Archive, Copy, Calendar, FileText, Terminal } from "lucide-react";
import { navigationLayers } from "../../lib/navigation/informationArchitecture";
import { buildMondayCalendarUrl } from "./calendarButton";

type CommandItem = {
  id: string;
  label: string;
  description?: string;
  icon: typeof Search;
  action: () => void;
  shortcut?: string;
};

/**
 * Where a free-text guidance query goes from the palette.
 *
 * Exported so the routing is testable without rendering the dialog, matching
 * `buildToolkitLibraryHref`'s shape in the same test file.
 */
export const buildGuidanceSearchHref = (query: string) =>
  `/search?q=${encodeURIComponent(query.trim())}`;

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredRef = useRef<CommandItem[]>([]);
  const selectedIndexRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleFocusMode = useCallback(() => {
    document.dispatchEvent(new CustomEvent("whether:toggle-focus-mode"));
    onClose();
  }, [onClose]);

  const navigateTo = useCallback((href: string) => {
    router.push(href);
    onClose();
  }, [router, onClose]);

  const commands: CommandItem[] = useMemo(() => {
    const actionCommands: CommandItem[] = [
      {
        id: "copy-slack",
        label: "Copy Slack brief",
        description: "Copy 60-second weekly call formatted for Slack",
        icon: Copy,
        action: () => {
          const btn = document.querySelector<HTMLButtonElement>('[data-testid="copy-slack-brief-button"]');
          if (btn) {
            btn.click();
          }
          onClose();
        },
        shortcut: "C",
      },
      {
        id: "focus",
        label: "Toggle focus / present mode",
        description: "Presentation mode for Zoom & leadership standups",
        icon: Maximize2,
        action: toggleFocusMode,
        shortcut: "F",
      },
      {
        id: "calendar-hold",
        label: "Add Monday calendar reminder",
        description: "Add recurring 9:00 AM sync to Google Calendar",
        icon: Calendar,
        action: () => {
          window.open(buildMondayCalendarUrl(), "_blank", "noopener,noreferrer");
          onClose();
        },
      },
      {
        id: "board-annex",
        label: "Export Board Governance Annex",
        description: "Copy multi-quarter stance audit memo for Directors",
        icon: FileText,
        action: () => navigateTo("/history"),
      },
      {
        id: "agent-mcp",
        label: "Agent & MCP setup",
        description: "Inspect MCP server config and developer API endpoints",
        icon: Terminal,
        action: () => navigateTo("/api-docs"),
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
        label: "View history & track record",
        description: "Browse past briefs and audited historical timeline",
        icon: Archive,
        action: () => navigateTo("/history"),
        shortcut: "H",
      },
    ];

    const navCommands: CommandItem[] = navigationLayers.map((layer) => ({
      id: `nav-${layer.key}`,
      label: layer.label,
      description: layer.description,
      icon: CornerRightUp,
      action: () => navigateTo(layer.href),
      shortcut: layer.navLabel,
    }));

    return [...actionCommands, ...navCommands];
  }, [navigateTo, toggleFocusMode, onClose]);

  /*
   * A typed query always offers guidance search, not only the fixed command list.
   *
   * The palette filtered navigation entries and actions by substring and nothing
   * else, so "hiring plan" — a guidance query, not a page name — returned "No
   * matching commands". That was survivable while the header also carried a
   * free-text field submitting to /search, and stopped being survivable when
   * that field was hidden on mobile to fix the document overflow. This is the
   * only path to /search on a phone now, so it is always present when there is
   * something to search for.
   */
  const filtered = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return commands;

    const q = trimmed.toLowerCase();
    const matches = commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q),
    );

    const searchCommand: CommandItem = {
      id: "search-guidance",
      label: `Search guidance for “${trimmed}”`,
      description: "Open full search results",
      icon: Search,
      action: () => navigateTo(buildGuidanceSearchHref(trimmed)),
    };

    // First when nothing else matched, so Enter runs it; otherwise last, so an
    // exact page match still wins the default selection.
    return matches.length ? [...matches, searchCommand] : [searchCommand];
  }, [query, commands, navigateTo]);

  // Mirrored for the keydown handler below, which is attached once and must not
  // re-subscribe on every keystroke. Assigned on commit rather than during render:
  // a render React throws away must not leave the ref mutated.
  useEffect(() => {
    filteredRef.current = filtered;
    selectedIndexRef.current = selectedIndex;
  }, [filtered, selectedIndex]);

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
        <Dialog.Popup initialFocus={inputRef} className="fixed z-50 top-[12vh] left-1/2 -translate-x-1/2 w-full max-w-lg mx-auto rounded-2xl border border-slate-800/80 bg-slate-950/95 shadow-2xl shadow-black/80 backdrop-blur-2xl overflow-hidden" aria-label="Command palette">
          <div className="flex items-center gap-3 border-b border-slate-800/80 px-4 py-3.5 bg-slate-900/40">
            <Search className="text-sky-400 shrink-0" size={18} aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages, actions, tools..."
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none font-medium"
              ref={inputRef}
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
