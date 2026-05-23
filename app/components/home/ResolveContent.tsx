import { DataCard } from "../DataCard";
import Link from "next/link";

export function ResolveContent() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">
        Tools to pressure-test the call, translate it for your role, and close open questions. Open the full{" "}
        <Link href="/resolve" className="text-sky-300 underline decoration-slate-600 underline-offset-4 hover:text-sky-200">
          decision tools
        </Link>{" "}
        for guided workflows.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <DataCard
          variant="narrative"
          label="Challenge the call"
          interpretation="Use the evidence above to check whether the call holds for your specific situation. Look for signals that point the other way."
        >
          <Link
            href="/resolve"
            className="mt-2 inline-flex min-h-[44px] items-center text-xs font-semibold text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-sky-100"
          >
            Open decision tools →
          </Link>
        </DataCard>

        <DataCard
          variant="narrative"
          label="Translate for your role"
          interpretation="See the same data through a CEO, CFO, or VP Engineering lens. Filter by company stage and rate sensitivity."
        >
          <Link
            href="/trust"
            className="mt-2 inline-flex min-h-[44px] items-center text-xs font-semibold text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-sky-100"
          >
            Set your context →
          </Link>
        </DataCard>
      </div>

      <DataCard
        variant="narrative"
        label="Still have a question?"
        interpretation="If one specific question remains after reviewing the brief and evidence, the decision tools can help you work through it with a guided workflow."
      />

      <DataCard
        variant="narrative"
        label="What-if simulator"
        interpretation="Drag the tightness slider to see how the call would change under different conditions. Find the simulator below in Explore scenarios."
      />
    </div>
  );
}
