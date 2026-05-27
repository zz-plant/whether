import Link from "next/link";

export function ResolveContent() {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/resolve"
          className="weather-surface-secondary px-4 py-3 no-underline hover:border-sky-500/30 transition-colors group"
        >
          <p className="text-xs font-semibold text-slate-200 group-hover:text-sky-200">Challenge the call</p>
          <p className="mt-1 text-fluid-micro text-slate-500">Pressure-test against your situation</p>
        </Link>

        <Link
          href="/trust"
          className="weather-surface-secondary px-4 py-3 no-underline hover:border-sky-500/30 transition-colors group"
        >
          <p className="text-xs font-semibold text-slate-200 group-hover:text-sky-200">Set your context</p>
          <p className="mt-1 text-fluid-micro text-slate-500">Company stage, rate sensitivity</p>
        </Link>
      </div>
    </div>
  );
}
