import { ActionLink } from "../components/ui/actionLink";

/**
 * The image and file artifacts, on the page whose job is getting the brief out.
 *
 * `/api/image/brief` (PNG) was listed on `/api-docs` under developer endpoints and
 * `/api/image/slide` was listed nowhere at all — so the two formats most useful to the
 * audience this product is built for, people pasting the call into a deck or a thread,
 * were reachable only by reading API documentation.
 *
 * The slide is the one worth knowing about: `lib/export/meetingSlideExport.ts` writes
 * the SVG by hand rather than rasterizing a component, so it drops into Figma or
 * Keynote as editable vector instead of a screenshot that goes soft on a projector.
 *
 * The board slide files draw the same payload as the SVG at the same geometry
 * (`lib/export/boardSlideDeck.ts`): the PPTX is the slide as PowerPoint or Keynote
 * opens it, every box editable; the PDF is the page a director reads on a phone.
 *
 * Deliberately links rather than thumbnails. Every endpoint renders at request time —
 * the PNG through `ImageResponse` — so inlining previews would put four edge renders on
 * every view of this page to decorate a choice the labels already make.
 */

const IMAGE_ARTIFACTS = [
  {
    href: "/api/export/board-slide?format=pptx&stage=seed",
    title: "Board slide",
    meta: "PPTX · one slide · 16:9",
    description:
      "Drops into the board pack as a native slide with every box still editable. Swap ?stage= for seed, series-a, series-b, or growth.",
    download: true,
  },
  {
    href: "/api/export/board-slide?format=pdf&stage=seed",
    title: "Board slide, as PDF",
    meta: "PDF · one page · 16:9",
    description:
      "The same slide as a page, for a pre-read that goes out by email or gets opened on a phone. Takes the same ?stage= values.",
    download: true,
  },
  {
    href: "/api/image/slide?stage=seed",
    title: "Meeting slide",
    meta: "SVG · 1200×675 · 16:9",
    description:
      "Vector, so it stays sharp at projector size and every label is still editable text in Figma or Keynote. Same ?stage= values.",
    download: false,
  },
  {
    href: "/api/image/brief",
    title: "Brief card",
    meta: "PNG · 1200×800",
    description:
      "Raster card for a thread, a Slack post, or anywhere an SVG will not render. Takes the same cadence and company-context params as the brief.",
    download: false,
  },
] as const;

export function ShareImageArtifacts() {
  return (
    <section className="weather-panel space-y-3 px-5 max-sm:px-0 py-5" aria-labelledby="share-files-heading">
      <h2 id="share-files-heading" className="type-eyebrow">Files and images for a deck or a thread</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {IMAGE_ARTIFACTS.map((artifact) => (
          <div key={artifact.href} className="weather-card flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-white/90">{artifact.title}</p>
              <p className="text-fluid-micro font-medium tracking-[0.04em] text-sky-200">
                {artifact.meta}
              </p>
            </div>
            <p className="text-xs leading-relaxed text-white/60">{artifact.description}</p>
            {/* A file is served as an attachment, so it lands in the download
                tray from this tab; an image opens in a new one. */}
            <ActionLink
              href={artifact.href}
              variant="ghost"
              className="mt-auto self-start"
              {...(artifact.download ? {} : { target: "_blank", rel: "noreferrer" })}
            >
              {artifact.download ? `Download ${artifact.meta.split(" · ")[0]}` : `Open ${artifact.title.toLowerCase()}`}
            </ActionLink>
          </div>
        ))}
      </div>
    </section>
  );
}
