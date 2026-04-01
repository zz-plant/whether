import type { ReactNode } from "react";
import { Field } from "@base-ui/react/field";
import { Select } from "@base-ui/react/select";

export type LabeledSelectOption<T extends string> = {
  value: T;
  label: string;
};

type LabeledSelectFieldProps<T extends string> = {
  id?: string;
  label: string;
  value: T;
  onValueChange: (value: T) => void;
  options: ReadonlyArray<LabeledSelectOption<T>>;
  placeholder: string;
  description?: ReactNode;
  containerClassName?: string;
  descriptionClassName?: string;
  itemClassName?: string;
  labelClassName?: string;
  triggerClassName: string;
};

export const LabeledSelectField = <T extends string>({
  id,
  label,
  value,
  onValueChange,
  options,
  placeholder,
  description,
  containerClassName = "space-y-2",
  descriptionClassName = "text-sm text-slate-300",
  itemClassName = "flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-200 outline-none transition-colors data-[highlighted]:bg-slate-800/70 data-[selected]:text-sky-200",
  labelClassName = "type-label text-slate-400",
  triggerClassName,
}: LabeledSelectFieldProps<T>) => (
  <Field.Root className={containerClassName}>
    <Field.Label className={labelClassName} nativeLabel={false}>
      {label}
    </Field.Label>
    <Select.Root id={id} value={value} onValueChange={(nextValue) => onValueChange(nextValue as T)}>
      <Select.Trigger className={triggerClassName}>
        <Select.Value placeholder={placeholder} />
        <Select.Icon className="text-slate-400">
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path
              d="M7 10l5 5 5-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner side="bottom" align="start" sideOffset={8}>
          <Select.Popup className="min-w-[220px] rounded-xl border border-slate-800/80 bg-slate-950/95 p-1 text-sm text-slate-100 shadow-xl">
            <Select.List className="max-h-64 overflow-y-auto">
              {options.map((option) => (
                <Select.Item key={option.value} value={option.value} className={itemClassName}>
                  <Select.ItemText>{option.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
    {description ? <p className={descriptionClassName}>{description}</p> : null}
  </Field.Root>
);
