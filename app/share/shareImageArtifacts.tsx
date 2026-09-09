import { ActionLink } from "../components/ui/actionLink";

/**
 * The two image artifacts, on the page whose job is getting the brief out.
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
 * Deliberately links rather than thumbnails. Both endpoints render at request time —
 * the PNG through `ImageResponse` — so inlining previews would put two edge renders on
 * every view of this page to decorate a choice the labels already make.
 */

const IMAGE_ARTIFACTS = [
  {
    href: "/api/image/slide?stage=seed",
    title: "Meeting slide",
    meta: "SVG · 1200×675 · 16:9",
    description:
      "Vector, so it stays sharp at projector size and every label is still editable text. Swap ?stage= for seed, series-a, series-b, or growth.",
  },
  {
    href: "/api/image/brief",
    title: "Brief card",
    meta: "PNG · 1200×800",
    description:
      "Raster card for a thread, a Slack post, or anywhere an SVG will not render. Takes the same cadence and company-context params as the brief.",
  },
] as const;

export function ShareImageArtifacts() {
  return (
    <div className="space-y-3">
      <h2 className="type-eyebrow">Images for a deck or a thread</h2>
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
            <ActionLink
              href={artifact.href}
              variant="ghost"
              className="mt-auto self-start"
              target="_blank"
              rel="noreferrer"
            >
              Open {artifact.title.toLowerCase()}
            </ActionLink>
          </div>
        ))}
      </div>
    </div>
  );
}
