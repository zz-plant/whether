"use client";

import { useEffect, useState } from "react";
import { CommandPalette } from "./commandPalette";

export function GlobalCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handle = () => setOpen(true);
    window.addEventListener("whether-open-command-palette", handle);
    return () => window.removeEventListener("whether-open-command-palette", handle);
  }, []);

  if (!open) return null;

  return <CommandPalette onClose={() => setOpen(false)} />;
}
