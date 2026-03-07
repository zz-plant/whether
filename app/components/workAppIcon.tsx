import {
  siConfluence,
  siJira,
  siLinear,
  siNotion,
  type SimpleIcon,
} from "simple-icons";

type WorkApp = "slack" | "jira" | "linear" | "notion" | "confluence";

const iconWrapperClass = "inline-flex h-4 w-4 items-center justify-center";

const slackIcon = {
  hex: "000000",
  path: [
    "M5.042 15.165a2.205 2.205 0 1 1-2.205 2.205v-2.205h2.205Zm1.11 0a2.205 2.205 0 0 1 4.41 0v5.518a2.205 2.205 0 1 1-4.41 0v-5.518Z",
    "M8.357 5.043a2.205 2.205 0 1 1-2.205-2.205h2.205v2.205Zm0 1.11a2.205 2.205 0 0 1 0 4.41H2.838a2.205 2.205 0 1 1 0-4.41h5.52Z",
    "M18.48 8.357a2.205 2.205 0 1 1 2.205-2.205v2.205H18.48Zm-1.11 0a2.205 2.205 0 0 1-4.41 0V2.838a2.205 2.205 0 1 1 4.41 0v5.52Z",
    "M15.165 18.48a2.205 2.205 0 1 1 2.205 2.205h-2.205V18.48Zm0-1.11a2.205 2.205 0 0 1 0-4.41h5.518a2.205 2.205 0 1 1 0 4.41h-5.518Z",
  ],
  fills: ["#E01E5A", "#36C5F0", "#2EB67D", "#ECB22E"],
};

const simpleIconByApp: Record<Exclude<WorkApp, "slack">, SimpleIcon> = {
  jira: siJira,
  linear: siLinear,
  notion: siNotion,
  confluence: siConfluence,
};

export function WorkAppIcon({ app, className }: { app: WorkApp; className?: string }) {
  if (app === "slack") {
    return (
      <span className={className ?? iconWrapperClass} aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          {slackIcon.path.map((segment, index) => (
            <path key={segment} fill={slackIcon.fills[index]} d={segment} />
          ))}
        </svg>
      </span>
    );
  }

  const icon = simpleIconByApp[app];
  return (
    <span className={className ?? iconWrapperClass} aria-hidden="true">
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path fill={`#${icon.hex}`} d={icon.path} />
      </svg>
    </span>
  );
}

export function WorkAppLabel({
  app,
  label,
  className,
}: {
  app: WorkApp;
  label: string;
  className?: string;
}) {
  return (
    <span className={className ?? "inline-flex items-center gap-2"}>
      <WorkAppIcon app={app} />
      <span>{label}</span>
    </span>
  );
}
