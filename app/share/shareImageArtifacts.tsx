"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { DEFAULT_OPERATOR_STAGE, operatorStageLabel, type OperatorStage } from "../../lib/report/operatorStage";
import { parseBriefImageVariant, type BriefImageLayout, type BriefImageTheme } from "../../lib/image/briefImageTemplate";
import { buildSupportedImageBriefSearchParams } from "../../lib/report/imageBriefSearchParams";
import { useOperatorStage } from "../components/useOperatorStage";
import { locationSearchSource, useBrowserSource } from "../components/browserSource";
import { ActionLink } from "../components/ui/actionLink";
import { SegmentedControl, type SegmentedOption } from "../components/ui/segmentedControl";
import { CopyMeetingSlideButton } from "../components/CopyMeetingSlideButton";
import { CopyImageCardButton } from "../components/CopyImageCardButton";
import { SharePortraitCardButton } from "./sharePortraitCardButton";

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
 *
 * Card variants since 2026-10-24. The card was drawn once, 1200×800, while the places
 * it lands wanted their own shapes: a wide banner for a deck, a square for a post, a
 * portrait for a phone screen. `layout=` and `theme=` on the route reflow the same
 * payload rather than cropping it (`lib/image/briefImageTemplate.tsx`), and the card's
 * pickers rewrite its links with the choice, so what a reader downloads is the picture
 * they were looking at. The default options are left out of the link: the route falls
 * back to them, and a link that only carries what differs stays readable.
 */

type ArtifactFile = {
  href: string;
  label: string;
  /** What the file is for, in the place it lands. */
  use: string;
  download: boolean;
  /** What the browser names the saved file; the export routes name their own. */
  filename?: string;
};

/** The variant pickers a card offers. The options and the state live with the component. */
type ArtifactPicker = {
  /** Which brief-image option this picker sets. */
  param: "layout" | "theme";
  /** The control's name, beside it and in its legend: "Card shape". */
  label: string;
};

type ImageArtifact = {
  title: string;
  /** What the file is, where its buttons do not already say: "PNG · 1200×800". */
  meta?: string;
  description: string;
  preview: { src: string; width: number; height: number; alt: string };
  files: readonly ArtifactFile[];
  pickers?: readonly ArtifactPicker[];
};

/* The slide files follow the stage the reader chose on the brief (2026-10-14).
   They were fixed to seed, and the card told the reader to edit `stage=` in
   the link by hand. The page is cached, so the stage is read in the browser. */
export const buildShareImageArtifacts = (
  stage: OperatorStage,
  /** The brief context in the address, normalized to the keys the card route reads. */
  source: { get(name: string): string | null },
  layout: BriefImageLayout = "standard",
  theme: BriefImageTheme = "dark",
): readonly ImageArtifact[] => {
  const variant = parseBriefImageVariant(new URLSearchParams({ layout, theme }));
  const params = buildSupportedImageBriefSearchParams(source);
  /* The stage set on this page wins over a stale `stage=` in the arrival link:
     it is the same choice the slide beside the card is drawn for. */
  params.set("stage", stage);
  if (layout !== "standard") params.set("layout", layout);
  if (theme !== "dark") params.set("theme", theme);
  const briefCardSrc = `/api/image/brief?${params.toString()}`;

  return [
    {
      /* No format line: "PPTX · PDF · SVG" named the three buttons under it
         (2026-10-09). */
      title: "Board slide",
      description:
        `One slide: the guidance, its pause line, its change lines and both scores, drawn for a ${operatorStageLabel(stage)} company (the stage you picked on the brief).`,
      preview: {
        src: `/api/image/slide?stage=${stage}`,
        width: 1200,
        height: 675,
        alt: "This week's board slide: the guidance, its pause line and what would change it, with both scores under them.",
      },
      files: [
        {
          href: `/api/export/board-slide?format=pptx&stage=${stage}`,
          label: "Download PPTX",
          use: "Drops into the board pack as a native slide with every box still editable.",
          download: true,
        },
        {
          href: `/api/export/board-slide?format=pdf&stage=${stage}`,
          label: "Download PDF",
          use: "The slide as a page, for a pre-read that goes out by email or gets opened on a phone.",
          download: true,
        },
        {
          href: `/api/image/slide?stage=${stage}`,
          label: "Open SVG",
          use: "Vector, so it stays sharp at projector size and every label is still editable text in Figma or Keynote.",
          download: false,
        },
      ],
    },
    {
      title: "Brief card",
      meta: `PNG · ${variant.width}×${variant.height}`,
      description:
        "A PNG for a thread, a Slack post, or anywhere an SVG will not render. The same stage, sector and ticker settings as the brief apply to its link.",
      preview: {
        src: briefCardSrc,
        width: variant.width,
        height: variant.height,
        alt: "This week's brief card: the guidance and both scores against their lines.",
      },
      files: [
        {
          href: briefCardSrc,
          label: "Download PNG",
          use: "Saves the picture, in the shape and theme shown above.",
          download: true,
          filename: "whether-brief.png",
        },
        {
          href: briefCardSrc,
          label: "Open brief card",
          use: "Opens in a new tab.",
          download: false,
        },
      ],
      pickers: [
        { param: "layout", label: "Card shape" },
        { param: "theme", label: "Card theme" },
      ],
    },
  ];
};

const BRIEF_SHAPE_OPTIONS: readonly SegmentedOption<BriefImageLayout>[] = [
  { key: "standard", label: "Standard" },
  { key: "landscape", label: "Landscape" },
  { key: "square", label: "Square" },
  { key: "portrait", label: "Portrait" },
];

const BRIEF_THEME_OPTIONS: readonly SegmentedOption<BriefImageTheme>[] = [
  { key: "dark", label: "Dark" },
  { key: "light", label: "Light" },
];

export function ShareImageArtifacts() {
  const { stage } = useOperatorStage();
  /* The brief context rides in the address the visitor arrived with; empty
     until hydration, like every browser value this page reads. */
  const search = useBrowserSource(locationSearchSource);
  const source = useMemo(() => new URLSearchParams(search), [search]);
  const [layout, setLayout] = useState<BriefImageLayout>("standard");
  const [theme, setTheme] = useState<BriefImageTheme>("dark");
  const artifacts = buildShareImageArtifacts(stage ?? DEFAULT_OPERATOR_STAGE, source, layout, theme);
  return (
    <section id="image-artifacts" className="weather-panel weather-section-stack p-0" aria-labelledby="share-files-heading">
      <h2 id="share-files-heading" className="text-[1.375rem] leading-tight font-semibold text-white sm:text-2xl">Files and images for a deck or a thread</h2>
      {/* The slide and the card straight onto the clipboard. These two buttons
          sat in the brief's "Do and share" until 2026-10-08, one of five places
          the site offered the same week; the brief links here instead. Both read
          the island this page publishes (`BriefArtifactScript`). */}
      <div className="flex flex-wrap items-center gap-2">
        <CopyMeetingSlideButton />
        <CopyImageCardButton />
        <SharePortraitCardButton />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {artifacts.map((artifact) => (
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
              {artifact.meta ? <p className="text-fluid-micro font-medium tracking-[0.04em] text-slate-300">{artifact.meta}</p> : null}
            </div>
            <p className="text-xs leading-relaxed text-white/60">{artifact.description}</p>
            {artifact.pickers?.length ? (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                {artifact.pickers.map((picker) => (
                  <div key={picker.param} className="flex flex-wrap items-center gap-1.5">
                    <span className="type-eyebrow mr-1">{picker.label}</span>
                    {picker.param === "layout" ? (
                      <SegmentedControl ariaLabel={picker.label} options={BRIEF_SHAPE_OPTIONS} value={layout} onSelect={setLayout} />
                    ) : (
                      <SegmentedControl ariaLabel={picker.label} options={BRIEF_THEME_OPTIONS} value={theme} onSelect={setTheme} />
                    )}
                  </div>
                ))}
              </div>
            ) : null}
            <ul className="mt-auto space-y-2">
              {artifact.files.map((file) => (
                <li key={file.label} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {/* A file is served as an attachment, so it lands in the download
                      tray from this tab; an image opens in a new one. The card's
                      PNG has no Content-Disposition of its own, so the anchor's
                      `download` attribute is what makes it save (and what tells
                      the router not to navigate). */}
                  {/* One width for the three, so the captions start on one edge. */}
                  <ActionLink
                    href={file.href}
                    variant="ghost"
                    className={file.use ? "w-[8.5rem] shrink-0" : "shrink-0"}
                    {...(file.download ? { download: file.filename ?? "" } : { target: "_blank", rel: "noreferrer" })}
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
