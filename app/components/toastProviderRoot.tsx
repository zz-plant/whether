"use client";

import type { ReactNode } from "react";
import { Toast } from "@base-ui/react/toast";
import { AlertTriangleIcon, CheckIcon, CloseIcon } from "./uiIcons";

const toneClassByType: Record<string, string> = {
  success: "border-emerald-400/60 bg-emerald-500/10",
  error: "border-rose-400/70 bg-rose-500/10",
  warning: "border-amber-300/70 bg-amber-300/10",
};

const iconByType: Record<string, ReactNode> = {
  success: <CheckIcon />,
  error: <AlertTriangleIcon />,
  warning: <AlertTriangleIcon />,
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
                    {icon ? <span className="mr-1.5 inline-flex align-[-2px]">{icon}</span> : null}
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
                <CloseIcon />
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
      {/* Clears the bottom tab bar and the home indicator on phones; from md
          the bar is gone and the viewport sits in the corner. */}
      <Toast.Viewport className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] right-6 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3 md:bottom-6">
        <ToastList />
      </Toast.Viewport>
    </Toast.Portal>
  </Toast.Provider>
);
