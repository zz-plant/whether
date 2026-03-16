export const sectionSpacing = "space-y-4";
export const tierOneHeading = "text-sm font-semibold tracking-[0.01em] text-slate-50";
export const tierTwoHeading = "text-sm font-semibold tracking-[0.01em] text-slate-200";
export const tierThreeHeading = "text-xs font-medium tracking-normal text-slate-400";
export const tierOnePanel = "rounded-[1.25rem] border border-slate-700/55 bg-slate-950/84 p-4 sm:p-5";
export const tierTwoPanel = "rounded-[1.15rem] border border-slate-800/45 bg-slate-950/62 p-4 sm:p-5";
export const tierThreePanel = "rounded-xl border border-slate-800/28 bg-slate-950/32 p-3";
export const tierOneInset = "rounded-xl border border-slate-800/55 bg-slate-950/62 px-3.5 py-3.5";
export const tierTwoInset = "rounded-lg border border-slate-800/38 bg-slate-950/50 px-3.5 py-3";
export const tierThreeInset = "rounded-lg border border-slate-800/24 bg-slate-950/28 px-3 py-3 text-slate-300";
export const compactSectionSpacing = "space-y-2.5";
export const compactInset = "rounded-lg border border-slate-800/32 bg-slate-950/42 px-3 py-2.5";
export const neutralLabel = "font-semibold tracking-[0.01em] text-slate-300";
export const disclosureSummaryClass =
  "flex min-h-[48px] w-full items-center justify-between gap-3 rounded-xl border border-slate-800/52 bg-slate-950/56 px-3.5 py-2.5 text-left text-xs font-semibold tracking-[0.01em] text-slate-100 transition hover:border-slate-600/60 hover:bg-slate-900/74 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300";

export const disclosurePanelClass = "mt-3";

export const compactActionCue = (text: string) =>
  text
    .replace(/^(Pause|Resume)\s+/i, "")
    .replace(/\.$/, "")
    .replace(/^when\s+/i, "")
    .trim();

export const compactRoleCue = (text: string) =>
  text
    .replace(/\s+/g, " ")
    .replace(/\.\s+/g, "; ")
    .replace(/;\s*$/, "")
    .trim();
