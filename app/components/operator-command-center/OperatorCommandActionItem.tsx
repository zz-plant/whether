import type { ReactNode } from "react";
import { ArrowRightIcon, BoltIcon, CircleTargetIcon, SectionJumpIcon } from "../uiIcons";

export type OperatorCommandAction = {
  href: string;
  label: string;
  description: string;
  group: "Playbook" | "Pages" | "Sections";
  tags?: Array<"Playbook" | "Pages" | "Sections">;
  keywords?: string[];
  copyText?: string;
  copyTarget?: string;
};

type OperatorCommandActionItemProps = {
  action: OperatorCommandAction;
  variant: "popup" | "grid";
  renderRoot: (args: {
    ariaLabel: string;
    children: ReactNode;
    className: string;
    title: string;
  }) => ReactNode;
};

const groupGlyph = {
  Playbook: BoltIcon,
  Pages: CircleTargetIcon,
  Sections: SectionJumpIcon,
} as const;

const tagLabelMap: Record<OperatorCommandAction["group"], string> = {
  Playbook: "ACTION",
  Pages: "PAGE",
  Sections: "OPEN SECTION",
};

const isInPageLink = (href: string) => href.startsWith("#") || href.includes("/#");

export const OperatorCommandActionItem = ({
  action,
  variant,
  renderRoot,
}: OperatorCommandActionItemProps) => {
  const GroupIcon = groupGlyph[action.group];
  const ariaLabel = action.copyText
    ? `${action.label} (copy action)`
    : `${action.label} (${isInPageLink(action.href) ? "section jump" : "page navigation"})`;

  const content = (
    <>
      <span className="inline-flex min-w-0 items-center gap-2 text-xs font-semibold tracking-[0.12em] text-slate-100">
        <span aria-hidden="true" className="text-slate-400">
          <GroupIcon className="h-3.5 w-3.5" />
        </span>
        {action.label}
      </span>
      <span className="inline-flex items-center gap-2">
        {variant === "popup" ? (
          <span className="hidden text-fluid-xs text-slate-400 sm:inline">{action.description}</span>
        ) : (
          <span className="flex flex-wrap justify-end gap-1">
            {(action.tags ?? [action.group]).map((tag) => (
              <span
                key={`${action.href}-${tag}`}
                className="weather-pill text-fluid-nano font-semibold tracking-[0.06em] text-slate-400"
              >
                {tagLabelMap[tag]}
              </span>
            ))}
          </span>
        )}
        <ArrowRightIcon className="h-3.5 w-3.5 text-slate-400" />
      </span>
    </>
  );

  return renderRoot({
    ariaLabel,
    children: content,
    className:
      variant === "popup"
        ? "flex min-h-[44px] cursor-pointer items-center justify-between gap-3 rounded-md border border-slate-800/70 px-3 py-2 text-left text-slate-200 outline-none transition-colors data-[highlighted]:border-sky-400/70 data-[highlighted]:text-slate-100"
        : "weather-pill inline-flex min-h-[44px] w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300",
    title: action.description,
  });
};
