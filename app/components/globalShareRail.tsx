"use client";

import { useEffect, useState } from "react";
import { ShareRail } from "./shareRail";

export function GlobalShareRail() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handle = () => setOpen(true);
    window.addEventListener("whether-open-share-rail", handle);
    return () => window.removeEventListener("whether-open-share-rail", handle);
  }, []);

  if (!open) return null;

  return <ShareRail onClose={() => setOpen(false)} />;
}
