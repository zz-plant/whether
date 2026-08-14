"use client";

import { useState, useRef, useEffect, useId } from "react";
import { useClipboardCopy } from "../useClipboardCopy";
import { CheckIcon, CopyIcon, DocumentIcon, ChevronDownIcon, AuditIcon } from "../uiIcons";

type ShareMenuDropdownProps = {
  recordDate?: string;
  postureLabel?: string;
  confidenceLabel?: string;
  operatingStance?: string;
  actionNow?: string;
  guardrail?: string;
  flipConditions?: string[];
  citation?: string;

  weeklyCallSnapshotText?: string;
  weeklyOperatorBriefText?: string;
  deltaOnlyBriefText?: string;
  boardSummary?: string;
  meetingPackText?: string;
};

export function ShareMenuDropdown({
  recordDate = "",
  postureLabel = "",
  confidenceLabel = "",
  operatingStance = "",
  actionNow = "",
  guardrail = "",
  flipConditions = [],
  citation = "",
  weeklyCallSnapshotText = "",
  weeklyOperatorBriefText = "",
  deltaOnlyBriefText = "",
  boardSummary = "",
  meetingPackText = "",
}: ShareMenuDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [slackOverlayActive, setSlackOverlayActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();
  const { status, activeTarget, copyToClipboard } = useClipboardCopy();

  const handleToggleDropdown = () => setIsOpen((prev) => !prev);

  const focusItem = (index: number) => {
    itemRefs.current[index]?.focus();
  };

  useEffect(() => {
    if (!isOpen) return;

    window.setTimeout(() => focusItem(0), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        return;
      }

      const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const currentIndex = itemRefs.current.findIndex((el) => el === activeElement);
      if (currentIndex === -1) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        focusItem((currentIndex + 1) % itemRefs.current.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        focusItem((currentIndex - 1 + itemRefs.current.length) % itemRefs.current.length);
      } else if (event.key === "Home") {
        event.preventDefault();
        focusItem(0);
      } else if (event.key === "End") {
        event.preventDefault();
        focusItem(itemRefs.current.length - 1);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Listen to changes from other components toggling it (e.g. if we hide it via key press)
    const handleExternalToggle = (e: Event) => {
      const customEvent = e as CustomEvent<{ active?: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.active === "boolean") {
        setSlackOverlayActive(customEvent.detail.active);
      }
    };
    window.addEventListener("whether-slack-preview-changed", handleExternalToggle);
    return () => {
      window.removeEventListener("whether-slack-preview-changed", handleExternalToggle);
    };
  }, []);

  const handleToggleSlackOverlay = () => {
    const nextActive = !slackOverlayActive;
    setSlackOverlayActive(nextActive);
    window.dispatchEvent(
      new CustomEvent("whether-toggle-slack-preview", {
        detail: { active: nextActive },
      })
    );
    setIsOpen(false);
  };

  const cleanMarkdownText = `
# Whether Weekly Brief — ${recordDate}
**Operating Posture**: ${postureLabel} (${confidenceLabel} Confidence)

> ${operatingStance}

## Bounded Decision Rules
* **Action Now**: ${actionNow}
* **Pause Trigger**: ${guardrail ? `Pause if tightness crosses ${guardrail}` : "N/A"}
* **Flip Trigger**: ${flipConditions.length ? `Flip if ${flipConditions.join(" or ")}` : "N/A"}

## Citation
\`\`\`
${citation}
\`\`\`
  `.trim();

  const handleCopy = async (text: string, label: string) => {
    await copyToClipboard(text, label);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggleDropdown}
        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-slate-700/50 bg-slate-950/40 px-3 py-2 text-center text-xs font-semibold tracking-[0.05em] text-slate-300 hover:border-sky-400/50 hover:text-slate-100 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
      >
        <span>Share brief</span>
        <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div id={menuId} className="absolute right-0 z-50 mt-2 w-64 origin-top-right rounded-md border border-slate-800 bg-slate-950/95 p-1 shadow-xl backdrop-blur-md">
          <div className="py-1" role="menu" aria-orientation="vertical">
            <button
              ref={(el) => { itemRefs.current[0] = el; }}
              type="button"
              onClick={() => handleCopy(weeklyCallSnapshotText || cleanMarkdownText, "Slack Text")}
              className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/[0.06] hover:text-slate-100"
              role="menuitem"
            >
              <span className="flex items-center gap-2">
                <CopyIcon className="h-3.5 w-3.5 text-slate-400" />
                <span>Copy Slack Brief (Text)</span>
              </span>
              {status === "copied" && activeTarget === "Slack Text" && (
                <CheckIcon className="h-3.5 w-3.5 text-emerald-400" />
              )}
            </button>

            <button
              ref={(el) => { itemRefs.current[1] = el; }}
              type="button"
              onClick={() => handleCopy(cleanMarkdownText, "Markdown")}
              className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/[0.06] hover:text-slate-100"
              role="menuitem"
            >
              <span className="flex items-center gap-2">
                <DocumentIcon className="h-3.5 w-3.5 text-slate-400" />
                <span>Copy Markdown Brief</span>
              </span>
              {status === "copied" && activeTarget === "Markdown" && (
                <CheckIcon className="h-3.5 w-3.5 text-emerald-400" />
              )}
            </button>

            <button
              ref={(el) => { itemRefs.current[2] = el; }}
              type="button"
              onClick={() => handleCopy(weeklyOperatorBriefText || cleanMarkdownText, "Leadership Brief")}
              className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/[0.06] hover:text-slate-100"
              role="menuitem"
            >
              <span className="flex items-center gap-2">
                <CopyIcon className="h-3.5 w-3.5 text-slate-400" />
                <span>Copy Leadership Brief</span>
              </span>
              {status === "copied" && activeTarget === "Leadership Brief" && (
                <CheckIcon className="h-3.5 w-3.5 text-emerald-400" />
              )}
            </button>

            <button
              ref={(el) => { itemRefs.current[3] = el; }}
              type="button"
              onClick={() => handleCopy(deltaOnlyBriefText || cleanMarkdownText, "Delta Brief")}
              className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/[0.06] hover:text-slate-100"
              role="menuitem"
            >
              <span className="flex items-center gap-2">
                <CopyIcon className="h-3.5 w-3.5 text-slate-400" />
                <span>Copy Delta-Only Brief</span>
              </span>
              {status === "copied" && activeTarget === "Delta Brief" && (
                <CheckIcon className="h-3.5 w-3.5 text-emerald-400" />
              )}
            </button>

            <div className="my-1 border-t border-slate-800" />

            <button
              ref={(el) => { itemRefs.current[4] = el; }}
              type="button"
              onClick={handleToggleSlackOverlay}
              className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/[0.06] hover:text-slate-100"
              role="menuitem"
            >
              <span className="flex items-center gap-2">
                <AuditIcon className="h-3.5 w-3.5 text-slate-400" />
                <span>{slackOverlayActive ? "Hide Slack Overlay" : "Show Slack Overlay"}</span>
              </span>
              {slackOverlayActive && <span className="h-2 w-2 rounded-full bg-sky-400" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
