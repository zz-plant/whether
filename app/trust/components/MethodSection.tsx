import type { ReactNode } from "react";

type MethodSectionProps = {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
};

export function MethodSection({
  id,
  title,
  description,
  children,
}: MethodSectionProps) {
  const headingId = `method-${id}-heading`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="weather-panel space-y-5 px-5 py-5 scroll-mt-28"
    >
      <div>
        <h2 id={headingId} className="text-xl font-semibold text-white sm:text-2xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
