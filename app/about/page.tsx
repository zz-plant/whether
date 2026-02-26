import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "About Whether",
  description: "Learn how Whether works, what sources it uses, and how to stay updated.",
  path: "/about",
  imageAlt: "About Whether",
});

export default function AboutPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">About</h1>
        <p className="text-sm text-slate-300">Whether helps product and engineering leaders make clearer calls in uncertain market conditions.</p>
      </section>
      <section className="weather-panel space-y-2 px-6 py-6 text-sm text-slate-300">
        <p><span className="font-semibold text-slate-100">Method:</span> we use a posture-first workflow so teams can move from signal to decision without guesswork.</p>
        <p><span className="font-semibold text-slate-100">Sources:</span> public Treasury and macro datasets with transparent timestamps and refresh cadence.</p>
        <p><span className="font-semibold text-slate-100">FAQ:</span> how to read posture, confidence, and when to use each toolkit.</p>
        <p id="subscribe"><span className="font-semibold text-slate-100">Subscribe:</span> get updates when posture changes or new toolkit guidance is published.</p>
        <p><span className="font-semibold text-slate-100">Contact:</span> hello@whether.app</p>
      </section>
    </main>
  );
}
