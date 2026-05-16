import Link from "next/link";
import type { ReactNode } from "react";

type ViewportMode = "mobile" | "tablet" | "desktop" | "full";
type DensityMode = "compact" | "comfortable";

const viewportClassName: Record<ViewportMode, string> = {
  mobile: "max-w-[430px]",
  tablet: "max-w-[820px]",
  desktop: "max-w-[1280px]",
  full: "max-w-none",
};

const densityClassName: Record<DensityMode, string> = {
  compact: "gap-6 px-3 py-6 sm:px-4 sm:py-8",
  comfortable: "gap-8 px-4 py-10 sm:px-6 sm:py-14",
};

const viewportOptions: Array<{ value: ViewportMode; label: string }> = [
  { value: "mobile", label: "Mobile" },
  { value: "tablet", label: "Tablet" },
  { value: "desktop", label: "Desktop" },
  { value: "full", label: "Full width" },
];

const densityOptions: Array<{ value: DensityMode; label: string }> = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable" },
];

const buildHref = ({
  pathname,
  viewport,
  density,
}: {
  pathname: string;
  viewport: ViewportMode;
  density: DensityMode;
}) => `${pathname}?viewport=${viewport}&density=${density}`;

export function parseViewportMode(value?: string): ViewportMode {
  return value === "mobile" || value === "tablet" || value === "desktop" || value === "full"
    ? value
    : "desktop";
}

export function parseDensityMode(value?: string): DensityMode {
  return value === "compact" || value === "comfortable" ? value : "comfortable";
}

export function MockupShell({
  pathname,
  title,
  description,
  viewport,
  density,
  children,
}: {
  pathname: string;
  title: string;
  description: string;
  viewport: ViewportMode;
  density: DensityMode;
  children: ReactNode;
}) {
  return (
    <main id="main-content" tabIndex={-1} className="weather-page-shell weather-page-shell-wide">
      <section className="weather-panel sticky top-4 z-20 rounded-lg border border-slate-700/80 px-4 py-4 shadow-[0_24px_50px_-40px_rgba(2,6,23,0.9)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
              Visual Lab
            </p>
            <div className="space-y-1">
              <h1
                className="text-2xl font-semibold text-white sm:text-3xl"
                style={{ fontFamily: "var(--weather-font-display)" }}
              >
                {title}
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-300">{description}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Viewport
              </p>
              <div className="flex flex-wrap gap-2">
                {viewportOptions.map((option) => {
                  const active = option.value === viewport;
                  return (
                    <Link
                      key={option.value}
                      href={buildHref({ pathname, viewport: option.value, density })}
                      className={`weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.12em] ${
                        active ? "border-sky-300/80 text-slate-100" : "text-slate-300"
                      }`}
                    >
                      {option.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Density
              </p>
              <div className="flex flex-wrap gap-2">
                {densityOptions.map((option) => {
                  const active = option.value === density;
                  return (
                    <Link
                      key={option.value}
                      href={buildHref({ pathname, viewport, density: option.value })}
                      className={`weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.12em] ${
                        active ? "border-sky-300/80 text-slate-100" : "text-slate-300"
                      }`}
                    >
                      {option.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Link href="/mockups" className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em]">
            All mockups
          </Link>
          <Link href={buildHref({ pathname, viewport: "desktop", density: "comfortable" })} className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.12em] text-slate-100">
            Reset view
          </Link>
        </div>

        <div className="rounded-lg border border-slate-800/80 bg-slate-950/45 p-3 sm:p-4">
          <div
            className={`mx-auto flex w-full flex-col ${viewportClassName[viewport]} ${densityClassName[density]} rounded-lg border border-slate-800/80 bg-[linear-gradient(180deg,rgba(8,15,29,0.94),rgba(3,8,18,0.98))] shadow-[0_32px_80px_-48px_rgba(2,6,23,0.95)]`}
          >
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}
