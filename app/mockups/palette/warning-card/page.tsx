import type { Metadata } from "next";
import { PaletteSpecimen } from "../paletteSpecimen";
import "./tokens.css";

export const metadata: Metadata = {
  title: "Mockup — Palette direction: Warning card",
  description: "Preview-only palette and type direction for Whether, drawn over the real components.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <PaletteSpecimen direction="warning-card" />;
}
