"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { REGIME_LABELS } from "../../lib/regimePresentation";
import { decodeRecordBandMonth, recordBandMonthAt, recordBandMonthCount } from "../../lib/report/recordBandCodec";

const MONTH = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

/**
 * The band's month readout (docs/design/rebuild-covenant.md): move along the band
 * and the caption under it names that month, its conditions and its two scores;
 * a click or Enter opens the brief as it read that month.
 *
 * It renders nothing. The band is server-drawn and complete without it; this adds
 * the slider's role, its keys and its pointer handling once the page is live, so a
 * reader with scripts off meets a picture and a link, not a control that does nothing.
 *
 * Pointer handling follows the history timeline's, the one drag surface that was
 * already whole: vertical touch still scrolls the page (`touch-action: pan-y` in
 * record-band.css), and leaving, cancelling or blurring puts the caption back.
 */
export function RecordBandReadout() {
  const anchor = useRef<HTMLSpanElement>(null);
  const router = useRouter();

  useEffect(() => {
    const band = anchor.current?.closest<HTMLElement>("[data-record-band]");
    const plate = band?.querySelector<HTMLElement>("[data-record-band-plate]");
    const readout = band?.querySelector<HTMLElement>("[data-record-band-readout]");
    const cursor = band?.querySelector<HTMLElement>("[data-record-band-cursor]");
    const encoded = band?.dataset.months ?? "";
    const firstDate = band?.dataset.first ?? "";
    const months = recordBandMonthCount(encoded);
    if (!band || !plate || !readout || !cursor || months === 0 || !firstDate) return;

    const defaultText = readout.dataset.default ?? readout.textContent ?? "";
    let current = months - 1;

    const describe = (index: number) => {
      const reading = decodeRecordBandMonth(encoded, index);
      const { year, month } = recordBandMonthAt(firstDate, index);
      const label = MONTH.format(new Date(Date.UTC(year, month - 1, 1)));
      return reading
        ? `${label} · ${REGIME_LABELS[reading.regime]} · funding pressure ${reading.tightness}, risk appetite ${reading.riskAppetite}`
        : label;
    };
    const show = (index: number) => {
      current = Math.min(Math.max(index, 0), months - 1);
      const text = describe(current);
      readout.textContent = text;
      cursor.hidden = false;
      cursor.style.left = `${((current + 0.5) / months) * 100}%`;
      plate.setAttribute("aria-valuenow", String(current + 1));
      plate.setAttribute("aria-valuetext", text);
    };
    const clear = () => {
      readout.textContent = defaultText;
      cursor.hidden = true;
    };
    const indexAt = (clientX: number) => {
      const box = plate.getBoundingClientRect();
      return Math.floor(((clientX - box.left) / Math.max(box.width, 1)) * months);
    };
    const open = () => {
      const { year, month } = recordBandMonthAt(firstDate, current);
      router.push(`/?month=${month}&year=${year}`);
    };

    plate.setAttribute("role", "slider");
    plate.setAttribute("tabindex", "0");
    plate.setAttribute("aria-label", "Month on the record");
    plate.setAttribute("aria-valuemin", "1");
    plate.setAttribute("aria-valuemax", String(months));
    plate.setAttribute("aria-valuenow", String(months));
    plate.setAttribute("aria-valuetext", describe(months - 1));

    const onMove = (event: PointerEvent) => show(indexAt(event.clientX));
    const onClick = (event: MouseEvent) => {
      show(indexAt(event.clientX));
      open();
    };
    const onKey = (event: KeyboardEvent) => {
      const step = event.shiftKey ? 12 : 1;
      if (event.key === "ArrowLeft" || event.key === "ArrowDown") show(current - step);
      else if (event.key === "ArrowRight" || event.key === "ArrowUp") show(current + step);
      else if (event.key === "Home") show(0);
      else if (event.key === "End") show(months - 1);
      else if (event.key === "Enter" || event.key === " ") open();
      else if (event.key === "Escape") clear();
      else return;
      event.preventDefault();
    };
    const onFocus = () => show(current);

    plate.addEventListener("pointermove", onMove);
    plate.addEventListener("pointerdown", onMove);
    plate.addEventListener("pointerleave", clear);
    plate.addEventListener("pointercancel", clear);
    plate.addEventListener("click", onClick);
    plate.addEventListener("keydown", onKey);
    plate.addEventListener("focus", onFocus);
    plate.addEventListener("blur", clear);
    return () => {
      plate.removeEventListener("pointermove", onMove);
      plate.removeEventListener("pointerdown", onMove);
      plate.removeEventListener("pointerleave", clear);
      plate.removeEventListener("pointercancel", clear);
      plate.removeEventListener("click", onClick);
      plate.removeEventListener("keydown", onKey);
      plate.removeEventListener("focus", onFocus);
      plate.removeEventListener("blur", clear);
      for (const name of ["role", "tabindex", "aria-label", "aria-valuemin", "aria-valuemax", "aria-valuenow", "aria-valuetext"]) {
        plate.removeAttribute(name);
      }
      clear();
    };
  }, [router]);

  return <span ref={anchor} hidden />;
}
