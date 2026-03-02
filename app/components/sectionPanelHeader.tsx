import type { ReactNode } from "react";

type SectionPanelHeaderProps = {
  label: string;
  title: string;
  description: ReactNode;
  titleId: string;
  aside?: ReactNode;
};

export const SectionPanelHeader = ({
  label,
  title,
  description,
  titleId,
  aside,
}: SectionPanelHeaderProps) => (
  <div className="flex flex-wrap items-start justify-between gap-4">
    <div>
      <p className="type-label text-slate-400">{label}</p>
      <h3 id={titleId} className="type-section text-slate-100">
        {title}
      </h3>
      <p className="mt-2 type-data text-slate-300">{description}</p>
    </div>
    {aside ? <div className="flex flex-col items-end gap-2">{aside}</div> : null}
  </div>
);
