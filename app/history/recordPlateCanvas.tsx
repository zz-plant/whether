"use client";

import { useEffect } from "react";
import {
  RECORD_BAND_HEIGHT,
  decodeRecordBandMonth,
  isLightField,
  recordBandLineY,
  recordBandMonthCount,
  smoothRecordSeries,
} from "../../lib/report/recordBandCodec";
import type { RegimeKey } from "../../lib/types";
import { monthsAfter } from "../../lib/monthCursor";
import { followPageMonth } from "../components/monthCursor";

/* Fourteen lines a bundle against the band's five, held to about the same depth. */
const LINES = 14;
const SPREAD = 0.42;
/* How far the engraving opens under the pointer, and over what width. */
const LENS_GAIN = 1.5;
const LENS_WIDTH = 96;
/* The gap between two lines of a bundle, in viewBox units, near enough to centre the opening. */
const NOMINAL_GAP = 19;
/* Below this the band draws its plain lines: a phone has no pointer to answer, and no room. */
const MIN_WIDTH = 736;

/**
 * History's plate (docs/design/rebuild-covenant.md): the record band, opened to the
 * page's main figure, with its engraving redrawn at nearly three times the line count
 * and opening like a lens under the pointer, so a month's two readings part from their
 * neighbours where the reader looks.
 *
 * It is an enhancement and behaves like one. The band is server-drawn and complete
 * without it; this lays a canvas over the same fields, from the same geometry
 * (`recordBandLineY`), once the page is live. It stays out on a narrow screen, draws
 * one still frame under reduced motion, and animates only while the pointer is over
 * the band or the lens is closing.
 *
 * The element it renders is the marker record-band.css keys on (`data-record-plate`)
 * to give the band its height on this route, so the height is in the first paint.
 *
 * A month read elsewhere on the page (the year grid, the room-to-move chart, `[` and
 * `]`) opens the plate at that month, as the pointer would, and lets it close when the
 * month is let go (`monthCursor.tsx`). The pointer wins while it is over the plate.
 */
export function RecordPlateCanvas() {
  useEffect(() => {
    const band = document.querySelector<HTMLElement>("[data-record-band]");
    const disclosure = band?.querySelector<HTMLDetailsElement>("[data-record-band-disclosure]");
    const plate = band?.querySelector<HTMLElement>("[data-record-band-plate]");
    const overlay = band?.querySelector<HTMLElement>("[data-record-band-overlay]");
    if (!band || !plate || !overlay) return;

    /* The band arrives open: it is drawn on History only, as the page's lead figure
       (recordBand.tsx). It was opened here, after hydration, until 2026-11-26, which
       pushed the page down 356px a moment after it painted (a layout shift of 0.22). */

    const encoded = band.dataset.months ?? "";
    const months = recordBandMonthCount(encoded);
    const readings: { regime: RegimeKey; tightness: number; riskAppetite: number }[] = [];
    for (let index = 0; index < months; index += 1) {
      const reading = decodeRecordBandMonth(encoded, index);
      if (!reading) return;
      readings.push(reading);
    }
    if (readings.length < 2) return;

    const series = {
      risk: smoothRecordSeries(readings.map((reading) => reading.riskAppetite)),
      pressure: smoothRecordSeries(readings.map((reading) => reading.tightness)),
    };
    const runs: { regime: RegimeKey; start: number; length: number }[] = [];
    readings.forEach((reading, index) => {
      const last = runs.at(-1);
      if (last && last.regime === reading.regime) last.length += 1;
      else runs.push({ regime: reading.regime, start: index, length: 1 });
    });

    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    const context = canvas.getContext("2d");
    if (!context) return;
    overlay.append(canvas);

    const styles = getComputedStyle(band);
    const inkOnLight = styles.getPropertyValue("--band-line-on-light").trim() || "currentColor";
    const inkOnDense = styles.getPropertyValue("--band-line-on-dense").trim() || "currentColor";
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let pointerX = 0;
    let lens = 0;
    let lensTarget = 0;
    let frame = 0;
    let pointing = false;

    const draw = () => {
      frame = 0;
      const { width, height } = plate.getBoundingClientRect();
      if (width < MIN_WIDTH || height < 1) {
        delete band.dataset.plateCanvas;
        context.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      band.dataset.plateCanvas = "on";
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.lineWidth = 1;
      context.lineJoin = "round";

      lens += (lensTarget - lens) * 0.18;
      const scaleY = height / RECORD_BAND_HEIGHT;
      const middle = (LINES - 1) / 2;
      for (const run of runs) {
        const left = (run.start / months) * width;
        const right = ((run.start + run.length) / months) * width;
        context.save();
        context.beginPath();
        context.rect(left, 0, right - left, height);
        context.clip();
        const light = isLightField(run.regime);
        context.strokeStyle = light ? inkOnLight : inkOnDense;
        context.globalAlpha = light ? 0.5 : 0.78;
        for (const bundle of ["risk", "pressure"] as const) {
          for (let line = 0; line < LINES; line += 1) {
            context.beginPath();
            for (let x = left - 2; x <= right + 2; x += 2) {
              const distance = x - pointerX;
              const open = lens * LENS_GAIN * Math.exp(-(distance * distance) / (2 * LENS_WIDTH * LENS_WIDTH));
              const y =
                recordBandLineY({
                  bundle,
                  line,
                  month: (x / width) * months,
                  regime: run.regime,
                  series,
                  pattern: true,
                  spread: SPREAD * (1 + open),
                }) -
                middle * SPREAD * open * NOMINAL_GAP;
              if (x === left - 2) context.moveTo(x, y * scaleY);
              else context.lineTo(x, y * scaleY);
            }
            context.stroke();
          }
        }
        context.restore();
      }
      if (!still && Math.abs(lensTarget - lens) > 0.004) frame = window.requestAnimationFrame(draw);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(draw);
    };

    const onMove = (event: PointerEvent) => {
      pointing = true;
      pointerX = event.clientX - plate.getBoundingClientRect().left;
      lensTarget = 1;
      schedule();
    };
    const onLeave = () => {
      pointing = false;
      lensTarget = 0;
      schedule();
    };
    const firstDate = band.dataset.first ?? "";
    const follow = (month: string | null) => {
      if (pointing) return;
      const index = month && firstDate ? monthsAfter(firstDate, month) : -1;
      if (index >= 0 && index < months) {
        pointerX = ((index + 0.5) / months) * plate.getBoundingClientRect().width;
        lensTarget = 1;
      } else {
        lensTarget = 0;
      }
      schedule();
    };

    const observer = new ResizeObserver(schedule);
    observer.observe(plate);
    const stopFollowing = still ? () => undefined : followPageMonth(follow);
    disclosure?.addEventListener("toggle", schedule);
    if (!still) {
      plate.addEventListener("pointermove", onMove);
      plate.addEventListener("pointerleave", onLeave);
      plate.addEventListener("pointercancel", onLeave);
    }
    schedule();

    return () => {
      stopFollowing();
      observer.disconnect();
      disclosure?.removeEventListener("toggle", schedule);
      plate.removeEventListener("pointermove", onMove);
      plate.removeEventListener("pointerleave", onLeave);
      plate.removeEventListener("pointercancel", onLeave);
      if (frame) window.cancelAnimationFrame(frame);
      canvas.remove();
      delete band.dataset.plateCanvas;
    };
  }, []);

  return <span hidden data-record-plate />;
}
