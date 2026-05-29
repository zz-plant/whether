import type { ReactNode } from "react";
import { Collapsible } from "@base-ui/react/collapsible";

export const CollapsibleDeepDive = ({
  label,
  children,
  panelClassName = "mt-4",
}: {
  label: ReactNode;
  children: ReactNode;
  panelClassName?: string;
}) => (
  <Collapsible.Root className="mt-4">
    <Collapsible.Trigger
      type="button"
      className="group flex min-h-[44px] w-full items-center justify-between gap-3 text-left text-xs font-semibold tracking-[0.12em] text-slate-300 transition-colors hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
    >
      <span>{label}</span>
      <span className="weather-pill inline-flex min-h-[44px] items-center gap-2 px-3 text-fluid-micro font-semibold tracking-[0.06em] text-slate-200">
        <span aria-hidden="true" className="weather-disclosure-trigger-indicator text-fluid-sm group-data-[panel-open]:rotate-180">▾</span>
        <span className="group-data-[panel-open]:hidden">Expand section</span>
        <span className="hidden group-data-[panel-open]:inline">Collapse section</span>
      </span>
    </Collapsible.Trigger>
    <Collapsible.Panel className={`weather-disclosure-panel animate-collapsible-in ${panelClassName}`}>{children}</Collapsible.Panel>
  </Collapsible.Root>
);
