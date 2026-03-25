"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const FALLBACK_ANCHOR = "#formula-reference";

export default function MethodologyPage() {
  const router = useRouter();

  useEffect(() => {
    const { hash, search } = window.location;
    const targetHash = hash || FALLBACK_ANCHOR;
    router.replace(`/method${search}${targetHash}`);
  }, [router]);

  return null;
}
