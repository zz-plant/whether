import { siteUrl } from "../../lib/siteUrl";

const siteHost = new URL(siteUrl).host;

/**
 * The name and address, inside the border of a block people screenshot.
 *
 * A phone screenshot gets cropped to the interesting box before it is pasted,
 * and the header that says whose page this is does not survive the crop. A
 * card that ends in its own source is still attributable in a channel three
 * forwards later. The host resolves through `lib/siteUrl`, so a preview lane's
 * card names the preview lane.
 *
 * Hidden from assistive technology: it captions a picture of the block, and a
 * reader already on the page knows where they are.
 *
 * Two kinds of block carry it: the brief's call card, and the charts a reader
 * crops (the record's maps, the calibration chart, the signal panels, the
 * product-writing charts; 2026-10-27, ui-ux-standards §XXVIII). The interior
 * page intros printed it too until 2026-10-09, under a header that already
 * names the site; the running head names it on every frame now.
 */
export function ScreenshotCaption({ detail, className = "" }: { detail?: string; className?: string }) {
  return (
    <p
      aria-hidden="true"
      data-screenshot-caption
      className={`flex items-center gap-1.5 text-[0.75rem] leading-none text-slate-400 ${className}`.trim()}
    >
      <span className="font-semibold text-slate-300">Whether</span>
      <span aria-hidden="true">·</span>
      <span>{siteHost}</span>
      {detail ? (
        <>
          <span aria-hidden="true">·</span>
          <span>{detail}</span>
        </>
      ) : null}
    </p>
  );
}
