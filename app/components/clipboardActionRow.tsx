import type { ButtonHTMLAttributes, ReactNode } from "react";

type ClipboardUiState = "idle" | "copying" | "copied" | "error";

type ClipboardActionRowProps = {
  label: ReactNode;
  state: ClipboardUiState;
  onClick: () => void;
  leadingIcon?: ReactNode;
  stateIcons?: Partial<Record<ClipboardUiState, ReactNode>>;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  buttonVariant?: "button" | "pill";
  compact?: boolean;
  statusClassName?: string;
  showStatus?: boolean;
  statusMessages?: Partial<Record<ClipboardUiState, ReactNode>>;
  buttonLabels?: Partial<Record<ClipboardUiState, ReactNode>>;
  buttonProps?: ButtonHTMLAttributes<HTMLButtonElement> & {
    [key: `data-${string}`]: string | undefined;
  };
};

const BUTTON_VARIANT_CLASS: Record<"button" | "pill", string> = {
  button: "weather-button",
  pill: "weather-pill text-slate-200",
};

const BUTTON_BASE_CLASS =
  "inline-flex items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-400";

export function ClipboardActionRow({
  label,
  state,
  onClick,
  leadingIcon,
  stateIcons,
  disabled = false,
  className,
  buttonClassName,
  buttonVariant = "button",
  compact = false,
  statusClassName,
  showStatus = false,
  statusMessages,
  buttonLabels,
  buttonProps,
}: ClipboardActionRowProps) {
  const isCopying = state === "copying";
  const isDisabled = isCopying || disabled;

  const buttonLabel =
    buttonLabels?.[state] ??
    (state === "copying" ? "Copying" : state === "copied" ? "Copied" : label);
  const buttonIcon = stateIcons?.[state] ?? leadingIcon;
  const statusMessage = statusMessages?.[state];

  return (
    <div className={className}>
      <button
        {...buttonProps}
        type="button"
        onClick={onClick}
        disabled={isDisabled}
        aria-busy={isCopying}
        className={`${BUTTON_VARIANT_CLASS[buttonVariant]} ${BUTTON_BASE_CLASS} ${compact ? "min-h-[44px] px-3 py-1 text-fluid-xs" : "min-h-[44px]"} ${buttonClassName ?? ""}`.trim()}
      >
        {buttonIcon ? <span className="mr-1.5 inline-flex items-center">{buttonIcon}</span> : null}
        {buttonLabel}
      </button>
      {showStatus ? (
        <output className={statusClassName ?? "mt-2 block min-h-[20px] text-xs text-slate-300"} aria-live="polite">
          {statusMessage ?? ""}
        </output>
      ) : null}
    </div>
  );
}
