"use client";

import Link from "next/link";
import { ClipboardActionRow } from "../clipboardActionRow";
import { CheckIcon, CopyIcon, SpinnerIcon } from "../uiIcons";
import { useClipboardCopy } from "../useClipboardCopy";

interface ActionItem {
  id: string | number;
  text: string;
  href?: string;
}

interface ActionsThisWeekCardProps {
  actions: ActionItem[];
  operateHref?: string;
  className?: string;
}

/**
 * This week's actions, at most three, each linking to the plan step that owns it.
 *
 * Renders nothing when the model hands it no actions. It used to fill that gap
 * with three invented sentences linking to `/operate#hiring`, `#spend` and
 * `#roadmap` — ids no route renders — so a week with no actions read as a week
 * with three, and every link on it landed at the top of the page.
 */
export function ActionsThisWeekCard({
  actions,
  operateHref = "/operate",
  className = "",
}: ActionsThisWeekCardProps) {
  /*
   * The copy path was a hand-rolled `navigator.clipboard.writeText` in a
   * try/catch whose catch swallowed the failure, so the button showed "Copied!"
   * and had no failure state at all. It goes through the shared hook, which
   * separates "unavailable" from "write failed", and the shared row, which
   * draws the same control every other copy button on the site draws.
   */
  const { status, copyToClipboard } = useClipboardCopy();
  const items = actions.slice(0, 3);

  if (items.length === 0) return null;

  const handleCopyList = () => {
    const text = items.map((item, idx) => `${idx + 1}. ${item.text}`).join("\n");
    void copyToClipboard(`*Whether Actions This Week:*\n${text}`, "actions-list");
  };

  return (
    <section
      aria-labelledby="actions-this-week-heading"
      className={`weather-card flex flex-col justify-between ${className}`}
    >
      <div>
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 id="actions-this-week-heading" className="text-sm font-semibold tracking-tight text-white">
            Actions this week
          </h3>
          <ClipboardActionRow
            compact
            label="Copy list"
            state={status}
            onClick={handleCopyList}
            leadingIcon={<CopyIcon />}
            stateIcons={{ copying: <SpinnerIcon />, copied: <CheckIcon /> }}
            buttonLabels={{ error: "Copy failed" }}
            showStatus
            statusClassName="sr-only"
            statusMessages={{
              copied: "Actions list copied.",
              error: "Copy failed. Select the actions text to copy it manually.",
            }}
          />
        </div>

        {/* An ordered list with plain ordinals. Each row used to be a numbered
            well inside a bordered row inside the card — three frames around
            one sentence — where the list marker already says which is first. */}
        <ol className="list-decimal space-y-1 pl-5 marker:text-slate-500 marker:tabular-nums">
          {items.map((item) => (
            <li key={item.id} className="text-xs text-slate-200">
              <Link
                href={item.href ?? operateHref}
                className="inline-flex min-h-[44px] items-center font-medium leading-snug text-slate-200 underline decoration-white/20 underline-offset-2 hover:text-white hover:decoration-white/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              >
                {item.text}
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
