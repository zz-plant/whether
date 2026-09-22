import type { Metadata } from "next";
import { ActionLink } from "../components/ui/actionLink";
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";
import { JsonLdScript } from "../components/jsonLdScript";
import {
  buildBreadcrumbList,
  buildCanonicalUrl,
  buildPageMetadata,
  organizationName,
} from "../../lib/seo";
import {
  buildPublisherSchema,
  publisherAuthor,
  publisherContactPath,
  publisherProfilePath,
} from "../../lib/publisher";
import { EditorialDeskGlyph } from "../components/illustrations/EditorialDeskGlyph";

export const metadata: Metadata = buildPageMetadata({
  title: "Contact Whether",
  description: "How to reach the editor of Whether for corrections, questions, or coverage requests.",
  path: publisherContactPath,
  imageAlt: "Contact Whether",
});

export default function ContactPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ContactPage",
        url: buildCanonicalUrl(publisherContactPath),
        name: "Contact Whether",
      },
      buildPublisherSchema(organizationName),
      buildBreadcrumbList(createBreadcrumbTrail([{ path: "/" }, { path: publisherContactPath, label: "Contact" }])),
    ],
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <JsonLdScript data={structuredData} />

      <section className="weather-panel space-y-4 px-6 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2 max-w-xl">
            <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Contact</h1>
            <p className="text-sm text-slate-300">
              Whether is written and maintained by {publisherAuthor.name} — {publisherAuthor.role}.
            </p>
            <p className="text-sm text-slate-300">
              Email:{" "}
              <a
                href={`mailto:${publisherAuthor.email}`}
                className="text-sky-300 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
              >
                {publisherAuthor.email}
              </a>
            </p>
          </div>
          <EditorialDeskGlyph size={60} className="self-start sm:self-center" />
        </div>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">What to send</h2>
        <ul className="space-y-2 text-sm text-slate-300">
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-sky-300">
              •
            </span>
            <span>
              <span className="font-semibold text-slate-100">Corrections.</span> Point at the dated brief or archive
              period. Published records get a correction note rather than a silent edit.
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-sky-300">
              •
            </span>
            <span>
              <span className="font-semibold text-slate-100">Method questions.</span> The formulas and sources are
              published on the sources page first — start there.
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-sky-300">
              •
            </span>
            <span>
              <span className="font-semibold text-slate-100">Integration questions.</span> The machine-readable
              weekly brief is documented in the API reference.
            </span>
          </li>
        </ul>
        <div className="flex flex-wrap gap-2 pt-1">
          <ActionLink href={publisherProfilePath} variant="pill">
            About Whether
          </ActionLink>
          <ActionLink href="/trust" variant="pill">
            Sources and formulas
          </ActionLink>
          <ActionLink href="/api-docs" variant="pill">
            API reference
          </ActionLink>
        </div>
      </section>
    </main>
  );
}
