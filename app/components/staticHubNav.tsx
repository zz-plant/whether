import Link from "next/link";
import {
  resolveNavigationRouteCue,
  resolvePrimaryNavigationSurfaceCue,
} from "../../lib/navigation/informationArchitecture";
import { primaryNavigation } from "../../lib/navigation/primaryNavigation";
import { pathMatchesLink } from "../../lib/navigation/pathMatching";

export function StaticHubNav({ currentPath }: { currentPath: string }) {
  const hubLinks = primaryNavigation.filter((link) => link.href !== "/");

  return (
    <nav className="weather-hub-section" aria-label="Primary workflow hubs">
      <div className="space-y-2">
        <p className="weather-hub-section-eyebrow">Support layers</p>
        <h2 className="text-xl font-semibold text-white">Proof, planning, translation, and trust</h2>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {hubLinks.map((link) => {
          const isActive = pathMatchesLink(link.href, currentPath);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={`weather-hub-link-card flex min-h-[120px] flex-col justify-between gap-4 text-xs ${
                  isActive
                    ? "border-amber-300/50 bg-amber-500/10 text-white"
                    : "text-slate-200"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="weather-hub-chip w-fit">{isActive ? "Current surface" : "Workflow surface"}</span>
                  <span className="rounded-full border border-slate-700/80 bg-slate-950/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {resolvePrimaryNavigationSurfaceCue(link.href)}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <span className="text-base font-semibold tracking-[0.02em]">{link.label}</span>
                  <span className="block text-[12px] leading-5 text-slate-300">{link.description}</span>
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Route {resolveNavigationRouteCue(link.href)}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
