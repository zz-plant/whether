"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

export function RevealOnView({
  children,
  placeholder,
}: {
  children: ReactNode;
  placeholder?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
        }
      },
      {
        threshold: 0.01,
        rootMargin: "420px 0px",
      },
    );

    timeoutId = setTimeout(() => {
      setVisible(true);
      observer.disconnect();
    }, 1800);

    observer.observe(node);

    return () => {
      observer.disconnect();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-[opacity,transform] duration-500 motion-reduce:transition-none ${
        visible || placeholder ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      {visible ? children : placeholder ?? null}
    </div>
  );
}
