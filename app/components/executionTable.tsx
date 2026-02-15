import type { Route } from "next";
import Link from "next/link";

export type ExecutionTableRow = {
  horizon: string;
  owner: string;
  due: string;
  impact: string;
  href: string;
  ctaLabel: string;
};

export const ExecutionTable = ({
  title,
  rows,
}: {
  title: string;
  rows: ExecutionTableRow[];
}) => (
  <section className="weather-surface overflow-x-auto p-4" aria-label={title}>
    <p className="text-xs font-semibold tracking-[0.16em] text-slate-400">{title}</p>
    <table className="mt-3 min-w-full border-collapse text-left text-sm text-slate-200">
      <thead>
        <tr className="border-b border-slate-800/80 text-xs uppercase tracking-[0.14em] text-slate-500">
          <th className="px-2 py-2 font-semibold">Horizon</th>
          <th className="px-2 py-2 font-semibold">Owner</th>
          <th className="px-2 py-2 font-semibold">Due</th>
          <th className="px-2 py-2 font-semibold">Expected impact</th>
          <th className="px-2 py-2 font-semibold">Action</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.horizon} className="border-b border-slate-900/80 align-top">
            <td className="px-2 py-3 font-semibold text-slate-100">{row.horizon}</td>
            <td className="px-2 py-3">{row.owner}</td>
            <td className="px-2 py-3">{row.due}</td>
            <td className="px-2 py-3">{row.impact}</td>
            <td className="px-2 py-3">
              <Link
                href={row.href as Route}
                className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.12em] text-sky-200 underline decoration-slate-500 underline-offset-4 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
              >
                {row.ctaLabel}
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
);
