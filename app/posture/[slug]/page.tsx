import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../../../lib/seo";
import { postureDefinitions } from "../../../lib/informationArchitecture";

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const posture = postureDefinitions.find((entry) => entry.slug === slug);

  if (!posture) {
    return {};
  }

  return buildPageMetadata({
    title: `${posture.title} posture`,
    description: posture.summary,
    path: `/posture/${posture.slug}`,
    imageAlt: `${posture.title} posture`,
  });
}

export default async function PostureDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const posture = postureDefinitions.find((entry) => entry.slug === slug);

  if (!posture) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-4 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">{posture.title}</h1>
        <p className="text-sm text-slate-300">{posture.summary}</p>
        <p className="text-sm text-slate-200"><span className="font-semibold">Trigger:</span> {posture.trigger}</p>
      </section>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">What to do by default</h2>
        <ul className="space-y-2 text-sm text-slate-300">
          {posture.defaults.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
