import type { Ref } from "react";
import { Field } from "@base-ui/react/field";
import { NumberField } from "@base-ui/react/number-field";

type ThresholdNumberFieldProps = {
  error?: string;
  errorId: string;
  id: string;
  inputMode: "decimal" | "numeric";
  inputRef?: Ref<HTMLInputElement>;
  label: string;
  max: number;
  min: number;
  name: string;
  onBlur: () => void;
  onValueChange: (value: string) => void;
  step: number;
  value: string;
};

export const ThresholdNumberField = ({
  error,
  errorId,
  id,
  inputMode,
  inputRef,
  label,
  max,
  min,
  name,
  onBlur,
  onValueChange,
  step,
  value,
}: ThresholdNumberFieldProps) => (
  <Field.Root className="space-y-2 text-xs font-semibold tracking-[0.12em] text-slate-400">
    <Field.Label>{label}</Field.Label>
    <NumberField.Root
      id={id}
      name={name}
      min={min}
      max={max}
      step={step}
      value={value === "" || Number.isNaN(Number(value)) ? null : Number(value)}
      onValueChange={(nextValue) => onValueChange(nextValue === null ? "" : nextValue.toString())}
    >
      <NumberField.Group>
        <NumberField.Input
          ref={inputRef}
          inputMode={inputMode}
          onBlur={onBlur}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className="weather-input min-h-[44px] w-full px-3 py-2 text-base"
        />
      </NumberField.Group>
    </NumberField.Root>
    <Field.Error
      id={errorId}
      match={Boolean(error)}
      className="min-h-[18px] text-xs text-amber-200"
    >
      {error ?? ""}
    </Field.Error>
  </Field.Root>
);
