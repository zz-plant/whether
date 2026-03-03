import Link from "next/link";
import { primaryNavigation } from "../../lib/navigation/primaryNavigation";
import { ThemeToggleButton } from "./themeToggleButton";

export function GlobalHeader() {
  const navLinks = primaryNavigation.filter((link) => link.staticHub !== false);

  return (
    <header className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6">
      <div className="weather-appbar px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-slate-200 hover:border-sky-400/70 hover:text-sky-100"
            >
              Whether
            </Link>
            <p className="mt-1 truncate text-base font-semibold tracking-tight text-slate-100 sm:text-lg">
              Weekly Capital Posture Brief
            </p>
          </div>
          <ThemeToggleButton />
        </div>

        <nav
          aria-label="Global navigation"
          className="mt-3 -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="weather-pill inline-flex min-h-[44px] shrink-0 items-center px-4 py-2 text-sm font-semibold tracking-[0.06em] text-slate-100 hover:border-sky-400/70"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
