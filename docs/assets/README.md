# docs/assets

Images for the repository and for posts that link to Whether. Nothing on the site reads this
folder: the site's icons live in `public/`, and its share cards render at `/api/og`.

## screens/

Captures of the live site, used by the root README.

| File | Route | Capture target |
| --- | --- | --- |
| `weekly-brief-dark.png`, `weekly-brief-light.png` | `/` | `home-desktop`, cropped to the first 1230px |
| `weekly-brief-mobile-dark.png`, `weekly-brief-mobile-light.png` | `/` | `home-mobile`, first screen, resized to 430px |
| `decide.png` | `/operate` | `planning-desktop`, first 1120px |
| `why-it-changed.png` | `/signals` | `evidence-desktop`, first 1120px |
| `trust.png` | `/trust` | `trust-desktop`, first 1120px |
| `record.png` | `/history` | `history-desktop`, first 1120px |
| `share.png` | `/share` | `share-desktop`, first 1120px |

To recapture, shoot production in both themes, then crop and quantise with ImageMagick:

```bash
bun run ui:shots -- --base-url https://whether.work --theme dark --out-dir "$TMPDIR/shots-dark" --only home-desktop,home-mobile,planning-desktop,evidence-desktop,trust-desktop,history-desktop,share-desktop
```

```bash
magick "$TMPDIR/shots-dark/planning-desktop.png" -crop 1600x1120+0+0 +repage -strip -colors 256 PNG8:docs/assets/screens/decide.png
```

Repeat the first command with `--theme light` for the two light files. The mobile files come from
`home-mobile-screen.png`, resized with `-resize 430x`. Update the capture date under the README's
tour when the screens change. The week on screen is whatever production shows that day, so the
README's example table should name the same week.

## The brand kit

`whether-*.png` and `source.svg` are drawn by `bun run assets:generate`
(`scripts/generate-scenes.ts`) and checked by `bun run assets:check`, which runs in `bun run check`.
Each file's size comes from the spec table in `scripts/check-assets.ts`; the checker rejects a wrong
size, an indexed palette or a missing type.

The generator uses the site's own parts: the header mark and its colour, the share cards' palette
from `lib/image/ogTheme.ts` and `lib/regimePhaseSpace.ts`, and Archivo from `public/fonts/og`. It
needs `rsvg-convert` (`brew install librsvg`). The mark itself is the owner's call
(`docs/feature-specs-current.md` §1.1.69), so the generator copies it rather than redrawing it.

## palette-directions/

The before-and-after captures from the October 2026 palette decision, cited by
`docs/design/palette-directions.md` and `docs/feature-specs-current.md`. They record what was chosen
and are not refreshed.
