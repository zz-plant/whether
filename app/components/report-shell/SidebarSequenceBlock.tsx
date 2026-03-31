import type { ReportStageItem } from "../reportRevampElements";
import { InternalAwareLink } from "./InternalAwareLink";

export function SidebarSequenceBlock({
  stageRail,
}: {
  stageRail?: { title?: string; items: ReportStageItem[] };
}) {
  if (!stageRail) return null;

  return (
    <section
      className="weather-panel space-y-3 px-4 py-4 sm:px-5"
      aria-label={stageRail.title ?? "Decision flow"}
    >
      <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
        {stageRail.title ?? "Decision flow"}
      </p>
      <ol className="grid gap-2 md:grid-cols-5">
        {stageRail.items.map((item, index) => (
          <li key={item.id}>
            <InternalAwareLink
              href={item.href}
              className="weather-pill inline-flex min-h-[44px] w-full items-center gap-2 px-3 py-2 text-xs font-semibold tracking-[0.12em] text-slate-200"
              ariaCurrent={item.status === "current" ? "step" : undefined}
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-current text-[10px]">
                {index + 1}
              </span>
              <span>{item.label}</span>
            </InternalAwareLink>
          </li>
        ))}
      </ol>
    </section>
  );
}
