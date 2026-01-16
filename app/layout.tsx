import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Whether — Regime Station",
  description:
    "Translate macro signals into operational constraints for product and engineering leaders."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
