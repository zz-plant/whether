"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

export function RevealOnView({
  children,
  placeholder,
  className = "",
}: {
  children: ReactNode;
  placeholder?: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.01,
        rootMargin: "240px 0px",
      },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`
        transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
        motion-reduce:transition-none
        ${visible || placeholder ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}
        ${className}
      `}
    >
      {visible ? children : placeholder ?? null}
    </div>
  );
}
