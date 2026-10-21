"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { Search, CornerRightUp, Maximize2, Download, Archive, Copy, Calendar, FileText, Terminal, History, Columns2 } from "lucide-react";
import { navigationGroups, navigationPages, utilityLinks } from "../../lib/navigation/informationArchitecture";
import { buildMondayCalendarUrl } from "./calendarButton";
import { openShareRail } from "./globalShareRail";
import { openTimeMachine } from "./globalTimeMachine";

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
  /* The selection belongs to the query that produced it, so a new query resets
     it by not matching rather than by an effect assigning 0 after the list has
     already rendered with the old index — a second render per keystroke, and a
     frame in which the highlight sat on a row the new query does not have. */
  const [selection, setSelection] = useState({ query: "", index: 0 });
  const selectedIndex = selection.query === query ? selection.index : 0;

  const filteredRef = useRef<CommandItem[]>([]);
  const selectedIndexRef = useRef(0);
  const queryRef = useRef("");
  const searchInputRef = useRef<HTMLInputElement>(null);

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
        description: "Copy 60-second weekly guidance formatted for Slack",
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
        description: "Full-screen, one frame at a time",
        icon: Maximize2,
        action: toggleFocusMode,
        shortcut: "F",
      },
      {
        id: "calendar-hold",
        label: "Add Monday calendar reminder",
        description: "A recurring Monday reminder in Google Calendar",
        icon: Calendar,
        action: () => {
          window.open(buildMondayCalendarUrl(), "_blank", "noopener,noreferrer");
          onClose();
        },
      },
      /*
       * The two archive tools, which had no entry point outside a nested sheet and a
       * hand-typed query string. Reading any covered month is the deepest thing this
       * site does and the palette is where a reader looks for it.
       */
      {
        id: "time-machine",
        label: "Browse a past month",
        description: "Re-read the brief as it stood in any covered month",
        icon: History,
        action: () => {
          onClose();
          openTimeMachine();
        },
      },
      {
        id: "compare-periods",
        label: "Compare two months",
        description: "Two months side by side — conditions, scores, and the rules in force",
        icon: Columns2,
        action: () => navigateTo("/history/compare"),
      },
      {
        id: "board-annex",
        label: "Copy the record summary",
        description: "What the month-end record shows, as a short memo",
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
          openShareRail();
        },
        shortcut: "⇧S",
      },
      {
        id: "history",
        label: "View history & track record",
        description: "Browse past briefs and the month-end record",
        icon: Archive,
        action: () => navigateTo("/history"),
      },
      /* Deliberately here and in the footer rather than in the nav: the page is
         noindex and per-browser, so it is something a reader goes looking for
         rather than a section of the site. */
      {
        id: "decision-record",
        label: "Open your decision record",
        description: "Decisions recorded from this browser, checked against this week's reading",
        icon: Archive,
        action: () => navigateTo("/decisions"),
      },
    ];

    // The four groups with their keys, then every other page in them. A hub
    // is its group (one name per URL), so it is listed once, as the group.
    const groupHrefs = new Set<string>(navigationGroups.map((group) => group.href));
    const navCommands: CommandItem[] = [
      ...navigationGroups.map((group) => ({
        id: `nav-${group.key}`,
        label: group.label,
        description: group.description,
        icon: CornerRightUp,
        action: () => navigateTo(group.href),
        shortcut: group.shortcut.toUpperCase(),
      })),
      ...navigationPages
        .filter((page) => !groupHrefs.has(page.href))
        .map((page) => ({
          id: `nav-${page.key}`,
          label: page.label,
          description: page.description,
          icon: CornerRightUp,
          action: () => navigateTo(page.href),
        })),
    ];

    // Every destination in one list: the utility routes used to live only in
    // the footer and the More menu, so the palette could not jump to About.
    const utilityCommands: CommandItem[] = utilityLinks
      .filter((link) => link.href !== "/search")
      .map((link) => ({
        id: `util-${link.href}`,
        label: link.label,
        description: link.description,
        icon: CornerRightUp,
        action: () => navigateTo(link.href),
      }));

    return [...actionCommands, ...navCommands, ...utilityCommands];
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
    queryRef.current = query;
  }, [filtered, query, selectedIndex]);

  /*
   * Capture phase, not bubble.
   *
   * Base UI's `Dialog.Popup` installs its own `onKeyDown` that calls
   * `stopPropagation()` for every key in its COMPOSITE_KEYS set — ArrowUp,
   * ArrowDown, ArrowLeft, ArrowRight, Home, End. The palette renders inside
   * that popup, so an arrow keydown died at the popup element and never
   * reached a bubble-phase listener on `window`: ↑/↓ did nothing at all.
   *
   * Enter is not in COMPOSITE_KEYS, which is what made this hard to see —
   * Enter bubbled through and ran the selected command, so the palette looked
   * wired up while the arrows were silently inert.
   *
   * Capturing runs this before the popup's handler, so navigation works
   * without the dialog having to stop swallowing arrows for everyone else.
   * The `true` here and on `removeEventListener` must stay in sync, or the
   * listener is never removed.
   */
  /* Reads the mirrors rather than closing over the values: the listener below is
     attached once and must not re-subscribe on every keystroke. Stamping the
     query onto the selection is what keeps an arrow press from resurrecting an
     index the current query has already reset. */
  const moveSelection = useCallback((delta: number) => {
    const lastIndex = Math.max(filteredRef.current.length - 1, 0);
    setSelection({
      query: queryRef.current,
      index: Math.min(Math.max(selectedIndexRef.current + delta, 0), lastIndex),
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        moveSelection(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        moveSelection(-1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        filteredRef.current[selectedIndexRef.current]?.action();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
    // `moveSelection` closes over nothing but the mirrors, so it is stable and
    // listing it here does not re-subscribe on a keystroke.
  }, [moveSelection]);

  // The palette opens in response to an explicit command, so moving focus to
  // the query field is what the user asked for. It rides in an effect rather
  // than `autoFocus` so the focus move happens once the popup is mounted.
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  return (
    <Dialog.Root open onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        {/* A bottom sheet below md, the centered dialog above it. The palette's
            only phone entry points are the Search tab and the header's button,
            and a keyboard-driven menu pinned at 12vh with C/F/ESC badges is a
            desktop pattern occupying a phone's width. On a sheet the rows are
            the controls: touch-height, no shortcut badges, and no pre-selected
            highlight — with no hardware keyboard, index 0 never moves, and a
            permanent first-row highlight only competes with the field above. */}
        <Dialog.Popup
          className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-hidden rounded-t-2xl border-t border-[color:var(--border-strong)] bg-[color:var(--bg-panel)]/95 shadow-2xl backdrop-blur-2xl md:inset-x-auto md:bottom-auto md:left-1/2 md:top-[12vh] md:w-full md:max-w-lg md:-translate-x-1/2 md:rounded-2xl md:border"
          aria-label="Command palette"
        >
          <div className="flex items-center gap-3 border-b border-[color:var(--border-default)] px-4 py-3.5 bg-[color:var(--bg-raised)]/40">
            <Search className="text-slate-400 shrink-0" size={18} aria-hidden="true" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search or jump to…"
              className="flex-1 bg-transparent text-base sm:text-sm text-slate-100 placeholder-slate-500 outline-none font-medium"
              aria-label="Search commands"
            />
            {/* The ESC badge is a desktop affordance; `.weather-kbd` is
                unlayered CSS, so the breakpoint hides a wrapper span — the
                utility cannot override the class directly. */}
            <span className="shrink-0 hidden md:inline-flex">
              <kbd className="weather-kbd">ESC</kbd>
            </span>
          </div>
          <nav aria-label="Command results" className="max-h-[60dvh] overflow-y-auto overscroll-contain py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:max-h-80 md:pb-2">
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
                        className={`w-full flex min-h-11 items-center gap-3 px-3.5 py-2.5 rounded-lg text-left transition-colors duration-150 ${
                          isSelected
                            ? "text-slate-100 md:bg-sky-500/15 md:text-sky-100 md:font-semibold"
                            : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
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
                          <span className="shrink-0 hidden md:inline-flex">
                            <kbd className="weather-kbd">{cmd.shortcut}</kbd>
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </nav>
          <div className="hidden md:flex border-t border-[color:var(--border-default)] px-4 py-2.5 bg-[color:var(--bg-raised)]/40 items-center gap-4 text-fluid-nano text-slate-400 font-medium">
            <span className="flex items-center gap-1.5"><kbd className="weather-kbd">↑↓</kbd> navigate</span>
            <span className="flex items-center gap-1.5"><kbd className="weather-kbd">↵</kbd> select</span>
            <span className="flex items-center gap-1.5"><kbd className="weather-kbd">esc</kbd> close</span>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
