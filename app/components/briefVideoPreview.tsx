import type { BriefVideoAsset } from "../../lib/export/briefVideo";
import { ActionLink } from "./ui/actionLink";

/** Playback is reader initiated; the complete poster is the default still. */
export function BriefVideoPreview({ asset, label }: { asset: BriefVideoAsset; label: string }) {
  return (
    <div className="max-w-4xl space-y-3" data-brief-video={asset.slug}>
      <video
        controls
        playsInline
        preload="none"
        poster={asset.poster}
        width={asset.width}
        height={asset.height}
        aria-label={label}
        className="h-auto w-full rounded-md border border-[color:var(--border-default)]"
      >
        <source src={asset.video} type={asset.contentType} />
        {/* The clip is silent; the track describes its focus sequence. */}
        <track kind="captions" srcLang="en" src={asset.captions} label="What the clip shows" />
        <a href={asset.video}>Download the brief video</a>.
      </video>
      <p className="text-fluid-xs leading-relaxed text-slate-400">
        A {asset.duration}-second clip of the published brief. All guidance and source notes stay visible throughout.
      </p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
        <ActionLink href={asset.video} variant="inline" download>Download MP4</ActionLink>
        <ActionLink href={asset.poster} variant="inline" download>Download poster</ActionLink>
        <ActionLink href={`/brief/${asset.slug}`} variant="inline">Read the published brief</ActionLink>
      </div>
    </div>
  );
}
