import Link from "next/link";
import { primaryNavigation } from "../../lib/navigation/primaryNavigation";
import { pathMatchesLink } from "../../lib/navigation/pathMatching";

export function StaticHubNav({ currentPath }: { currentPath: string }) {
  const hubLinks = primaryNavigation.filter((link) => link.href !== "/");

  return (
    <nav className="weather-hub-section" aria-label="Primary workflow hubs">
      <div className="space-y-2">
        <p className="weather-hub-section-eyebrow">Primary workflow</p>
        <h2 className="text-xl font-semibold text-white">Move across the operating system without losing the weekly brief thread</h2>
        <p className="max-w-3xl text-sm leading-7 text-slate-300">
          Non-report pages should sharpen a decision or trust question, not become a parallel workspace.
        </p>
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
                <span className="weather-hub-chip w-fit">{isActive ? "Current hub" : "Workflow hub"}</span>
                <div className="space-y-1.5">
                  <span className="text-base font-semibold tracking-[0.02em]">{link.label}</span>
                  <span className="block text-[12px] leading-5 text-slate-300">{link.description}</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
