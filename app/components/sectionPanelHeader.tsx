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
  <div className="weather-panel-header">
    <div className="weather-panel-header-copy">
      <p className="type-label text-slate-400">{label}</p>
      <h3 id={titleId} className="weather-panel-header-title type-section text-slate-100">
        {title}
      </h3>
      <p className="weather-panel-header-description type-data text-slate-300">{description}</p>
    </div>
    {aside ? <div className="weather-panel-header-aside">{aside}</div> : null}
  </div>
);
