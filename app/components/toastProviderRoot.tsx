"use client";

import type { ReactNode } from "react";
import { Toast } from "@base-ui/react/toast";

const ToastList = () => {
  const { toasts } = Toast.useToastManager();

  return (
    <>
      {toasts.map((toast) => (
        <Toast.Root
          key={toast.id}
          toast={toast}
          className="flex w-full flex-col gap-2 rounded-2xl border border-slate-800/80 bg-slate-950/95 px-4 py-3 text-slate-100 shadow-xl data-[limited]:opacity-0"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              {toast.title ? (
                <Toast.Title className="text-xs font-semibold tracking-[0.12em] text-slate-200">
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
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-800/70 text-xs text-slate-400 transition-colors hover:border-slate-600/70 hover:text-slate-200"
              aria-label="Dismiss notification"
            >
              ✕
            </Toast.Close>
          </div>
          {toast.actionProps ? (
            <Toast.Action
              {...toast.actionProps}
              className={`inline-flex min-h-[32px] items-center justify-center rounded-full border border-slate-700/70 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-200 transition-colors hover:border-slate-500/70 hover:text-slate-100 ${
                toast.actionProps.className ?? ""
              }`}
            />
          ) : null}
        </Toast.Root>
      ))}
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
