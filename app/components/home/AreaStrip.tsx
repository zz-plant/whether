import Link from "next/link";
import { decisionAreaLabel } from "../../../lib/report/boundedDecisionRules";
import type { AreaStripModel } from "../../../lib/report/home/homeSectionModel";
import { AreaIcon, LineStateIcon } from "../ui/conceptIcons";

/**
 * The five areas across the card, read the way a weather app's forecast row is read
 * (2026-11-05): a name and a state per column, so the card answers "which decisions does
 * this bind?" at a glance and in a crop. Columns and no boxes: a card inside the card is a
 * list (§XXV). Each column goes to that area's rule below.
 */
export function AreaStrip({ model }: { model: AreaStripModel }) {
  return (
    <div data-area-strip className="border-t border-[color:var(--border-faint)] pt-2">
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(6rem,1fr))] gap-x-1 gap-y-1">
        {model.cells.map((cell) => (
          <li key={cell.area} className="min-w-0">
            <Link
              href={cell.href}
              data-line-state={cell.state}
              className="group flex min-h-11 flex-col justify-center gap-0.5 rounded-lg text-sm leading-tight"
            >
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-100 group-hover:underline group-hover:underline-offset-4">
                <AreaIcon area={cell.area} />
                {decisionAreaLabel(cell.area)}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 ${cell.state === "clear" ? "text-line-clear-fg" : "text-line-crossed-fg"}`}
              >
                <LineStateIcon state={cell.state} />
                {cell.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {model.restart ? <p className="mt-1 text-sm leading-snug text-slate-300">{model.restart}</p> : null}
    </div>
  );
}
