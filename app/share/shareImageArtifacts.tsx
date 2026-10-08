import Image from "next/image";
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
 * So the three are one card with one picture and three files, not three cards: the
 * page used to draw them as three cards that each described a slide and showed none.
 *
 * Thumbnails since 2026-10-07. This said "deliberately links rather than thumbnails",
 * because every endpoint renders at request time and four inline previews would put
 * four edge renders on every view to decorate a choice the labels already made. The
 * labels did not make it: a reader could not tell what any of the four looked like
 * without opening it. What changed the cost: there are two pictures, not four (the
 * three slide files share one), both routes answer with `s-maxage=3600`, so the edge
 * renders each at most once an hour however many readers look, and both load lazily,
 * below the copy formats, so a reader who never scrolls here costs nothing. Each image
 * carries its intrinsic size, so the card reserves its box before the image arrives.
 */

type ArtifactFile = {
  href: string;
  label: string;
  /** What the file is for, in the place it lands. */
  use: string;
  download: boolean;
};

type ImageArtifact = {
  title: string;
  meta: string;
  description: string;
  preview: { src: string; width: number; height: number; alt: string };
  files: readonly ArtifactFile[];
};

const IMAGE_ARTIFACTS: readonly ImageArtifact[] = [
  {
    title: "Board slide",
    meta: "PPTX · PDF · SVG",
    description:
      "One slide: the guidance, its pause line, what would change it and both scores. All three files draw it for a seed-stage company; change stage= in a file's link to series-a, series-b or growth.",
    preview: {
      src: "/api/image/slide?stage=seed",
      width: 1200,
      height: 675,
      alt: "This week's board slide: the guidance, its pause line and what would change it, with both scores under them.",
    },
    files: [
      {
        href: "/api/export/board-slide?format=pptx&stage=seed",
        label: "Download PPTX",
        use: "Drops into the board pack as a native slide with every box still editable.",
        download: true,
      },
      {
        href: "/api/export/board-slide?format=pdf&stage=seed",
        label: "Download PDF",
        use: "The slide as a page, for a pre-read that goes out by email or gets opened on a phone.",
        download: true,
      },
      {
        href: "/api/image/slide?stage=seed",
        label: "Open SVG",
        use: "Vector, so it stays sharp at projector size and every label is still editable text in Figma or Keynote.",
        download: false,
      },
    ],
  },
  {
    title: "Brief card",
    meta: "PNG · 1200×800",
    description:
      "A PNG for a thread, a Slack post, or anywhere an SVG will not render. The same stage, sector and ticker settings as the brief apply to its link.",
    preview: {
      src: "/api/image/brief",
      width: 1200,
      height: 800,
      alt: "This week's brief card: the guidance and both scores against their lines.",
    },
    files: [
      {
        href: "/api/image/brief",
        label: "Open brief card",
        use: "Opens in a new tab. Save it, or drag it straight into the thread.",
        download: false,
      },
    ],
  },
];

export function ShareImageArtifacts() {
  return (
    <section id="image-artifacts" className="weather-panel weather-section-stack p-0" aria-labelledby="share-files-heading">
      <h2 id="share-files-heading" className="text-xl font-semibold text-white sm:text-2xl">Files and images for a deck or a thread</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {IMAGE_ARTIFACTS.map((artifact) => (
          <article key={artifact.title} className="weather-card flex flex-col gap-3" data-image-artifact={artifact.title}>
            {/* The picture the files draw. Not a link: the actions below open
                it, and a second tab stop to the same URL says nothing new. */}
            {/* `unoptimized`: the worker's optimizer (`/_vinext/image`) resizes
                static assets read through ASSETS, and these two are rendered by
                routes; the slide is SVG besides. The component still sets lazy
                loading and async decoding, and the size attributes. */}
            {/* Side by side from `sm`, both pictures sit in one 3:2 frame, the
                card's shape, so the two cards' titles and descriptions line up;
                the slide letterboxes inside it rather than being cropped. On a
                phone each card stands alone and the picture keeps its own shape. */}
            <div className="flex items-center overflow-hidden rounded-md border border-[color:var(--border-default)] bg-[var(--bg-nested)] sm:aspect-[3/2]">
              <Image
                src={artifact.preview.src}
                width={artifact.preview.width}
                height={artifact.preview.height}
                alt={artifact.preview.alt}
                unoptimized
                loading="lazy"
                className="h-auto w-full"
              />
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-white/90">{artifact.title}</h3>
              <p className="text-fluid-micro font-medium tracking-[0.04em] text-sky-200">{artifact.meta}</p>
            </div>
            <p className="text-xs leading-relaxed text-white/60">{artifact.description}</p>
            <ul className="mt-auto space-y-2">
              {artifact.files.map((file) => (
                <li key={file.href} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {/* A file is served as an attachment, so it lands in the download
                      tray from this tab; an image opens in a new one. */}
                  {/* One width for the three, so the captions start on one edge. */}
                  <ActionLink
                    href={file.href}
                    variant="ghost"
                    className={file.use ? "w-[8.5rem] shrink-0" : "shrink-0"}
                    {...(file.download ? {} : { target: "_blank", rel: "noreferrer" })}
                  >
                    {file.label}
                  </ActionLink>
                  {file.use ? <span className="min-w-0 flex-1 basis-40 text-xs leading-relaxed text-white/60">{file.use}</span> : null}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
