"use client";

import type { ReactNode } from "react";
import { Toast } from "@base-ui/react/toast";

const toneClassByType: Record<string, string> = {
  success: "border-emerald-400/60 bg-emerald-500/10",
  error: "border-rose-400/70 bg-rose-500/10",
  warning: "border-amber-300/70 bg-amber-300/10",
};

const iconByType: Record<string, string> = {
  success: "✓",
  error: "!",
  warning: "⚠",
};

const ToastList = () => {
  const { toasts } = Toast.useToastManager();

  return (
    <>
      {toasts.map((toast) => {
        const toneClassName = toast.type ? toneClassByType[toast.type] : "";
        const icon = toast.type ? iconByType[toast.type] : null;

        return (
          <Toast.Root
            key={toast.id}
            toast={toast}
            className={`flex w-full flex-col gap-2 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-raised)]/95 px-4 py-3 text-slate-100 shadow-2xl backdrop-blur-lg data-[limited]:opacity-0 ${toneClassName}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                {toast.title ? (
                  <Toast.Title className="text-xs font-semibold tracking-[0.12em] text-slate-200">
                    {icon ? <span className="mr-1 inline-block">{icon}</span> : null}
                    {toast.title}
                  </Toast.Title>
                ) : null}
                {toast.description ? (
                  <Toast.Description className="text-xs text-slate-300">
                    {toast.description}
                  </Toast.Description>
                ) : null}
              </div>
              <Toast.Close
                className="inline-flex min-h-11 min-w-11 items-center justify-center -mr-2 -mt-1 rounded-lg text-xs text-slate-400 transition-colors hover:text-slate-200 weather-focus-ring"
                aria-label="Dismiss notification"
              >
                ✕
              </Toast.Close>
            </div>
            {toast.actionProps ? (
              <Toast.Action
                {...toast.actionProps}
                className={`inline-flex min-h-11 items-center justify-center rounded-lg border border-[color:var(--border-strong)] px-3 text-xs font-medium text-slate-200 transition-colors hover:border-sky-400/50 hover:text-white weather-focus-ring weather-press-scale ${
                  toast.actionProps.className ?? ""
                }`}
              />
            ) : null}
          </Toast.Root>
        );
      })}
    </>
  );
};

export const ToastProviderRoot = ({ children }: { children: ReactNode }) => (
  <Toast.Provider timeout={5000} limit={3}>
    {children}
    <Toast.Portal>
      <Toast.Viewport className="fixed bottom-6 right-6 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3">
        <ToastList />
      </Toast.Viewport>
    </Toast.Portal>
  </Toast.Provider>
);
