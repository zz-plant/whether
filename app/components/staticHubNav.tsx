import Link from "next/link";
import { primaryNavigation } from "../../lib/navigation/primaryNavigation";
import { pathMatchesLink } from "../../lib/navigation/pathMatching";

export function StaticHubNav({ currentPath }: { currentPath: string }) {
  const hubLinks = primaryNavigation.filter((link) => link.staticHub !== false);

  return (
    <nav className="weather-panel-quiet px-4 py-3" aria-label="Static content hubs">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Navigate hubs</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {hubLinks.map((link) => {
          const isActive = pathMatchesLink(link.href, currentPath);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={`weather-panel-quiet flex min-h-[72px] flex-col justify-between rounded-xl border px-3 py-2.5 text-xs transition-colors ${
                  isActive
                    ? "border-sky-400/70 bg-sky-500/15 text-sky-100 shadow-[inset_3px_0_0_rgba(56,189,248,0.7)]"
                    : "border-slate-800/80 text-slate-200 hover:border-sky-400/70"
                }`}
              >
                <span className="text-sm font-semibold tracking-[0.06em]">{link.label}</span>
                <span className="text-xs leading-relaxed text-slate-300">{link.description}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
