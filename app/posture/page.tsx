import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../lib/seo";
import { postureDefinitions } from "../../lib/informationArchitecture";

export const metadata: Metadata = buildPageMetadata({
  title: "Posture — operating mode selection",
  description: "Choose Risk-On, Safety Mode, or Transition based on signal confidence and reversibility.",
  path: "/posture",
  imageAlt: "Whether posture",
});

export default function PosturePage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Posture</h1>
        <p className="text-sm text-slate-300">Think of posture as your operating stance for the next cycle. Pick the one that matches today&apos;s reality so decisions stay consistent across teams.</p>
      </section>
      <section className="grid gap-3 sm:grid-cols-3">
        {postureDefinitions.map((posture) => (
          <Link key={posture.slug} href={`/posture/${posture.slug}`} className="weather-panel space-y-2 px-4 py-4">
            <h2 className="text-lg font-semibold text-slate-100">{posture.title}</h2>
            <p className="text-sm text-slate-300">{posture.summary}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
