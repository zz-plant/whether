"use client";

import { Button } from "@base-ui/react/button";
import { Toast } from "@base-ui/react/toast";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { DocumentIcon, DownloadIcon } from "./uiIcons";

async function generatePdf(text: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const margin = 56;
  const pageWidth = 612;
  const pageHeight = 792;
  const maxWidth = pageWidth - margin * 2;
  const lineHeight = 13;
  const sectionGap = 8;

  const lines = text.split("\n");
  let y = pageHeight - margin;
  let page = doc.addPage([pageWidth, pageHeight]);

  const drawLine = (line: string) => {
    if (y < margin) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    const isHeading = /^(BOARD NOTE|Call snapshot|WEEKLY BRIEF|BOARD SUMMARY|CITATION)$/.test(line.trim());
    const isSubheading = /^(POSTURE|TRUST|CHANGED|GUARDRAIL|FLIP|STABILITY):/.test(line.trim());

    const f = isHeading ? boldFont : font;
    const size = isHeading ? 12 : isSubheading ? 9 : 8;

    page.drawText(line, {
      x: margin,
      y,
      size,
      font: f,
      maxWidth,
    });
    y -= lineHeight + (isHeading ? sectionGap : 0);
  };

  for (const line of lines) {
    drawLine(line);
  }

  return doc.save();
}

export function DownloadBriefingPackButton({
  meetingPackText,
  recordDate,
}: {
  meetingPackText: string;
  recordDate: string;
}) {
  const { add } = Toast.useToastManager();

  const handleDownloadTxt = () => {
    const blob = new Blob([meetingPackText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `whether-briefing-pack-${recordDate}.txt`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    add({
      title: "Download started",
      description: "Briefing pack text is ready.",
      type: "success",
    });
  };

  const handleDownloadPdf = async () => {
    add({
      title: "Generating PDF",
      description: "Building your briefing pack.",
      type: "success",
    });
    try {
      const pdfBytes = await generatePdf(meetingPackText);
      const pdfArray = Array.from(pdfBytes);
      const blob = new Blob([new Uint8Array(pdfArray)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `whether-briefing-pack-${recordDate}.pdf`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      add({
        title: "PDF ready",
        description: "Briefing pack PDF is downloading.",
        type: "success",
      });
    } catch {
      add({
        title: "PDF failed",
        description: "Download the text version instead.",
        type: "error",
      });
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        onClick={handleDownloadTxt}
        className="weather-button-primary inline-flex min-h-[44px] items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-100 transition-colors hover:text-white touch-manipulation"
      >
        <DownloadIcon className="h-3.5 w-3.5" aria-hidden="true" />
        Download briefing pack (.txt)
      </Button>
      <Button
        type="button"
        onClick={handleDownloadPdf}
        className="weather-button inline-flex min-h-[44px] items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
      >
        <DocumentIcon className="h-3.5 w-3.5" aria-hidden="true" />
        Download PDF
      </Button>
    </div>
  );
}
