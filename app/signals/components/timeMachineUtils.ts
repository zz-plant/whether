import { formatDateLabel, formatDelta } from "../../../lib/report/signalFormatting";
import { formatMonthInput, parseMonthInput } from "../../../lib/timeMachine/monthFormatting";

export { formatDateLabel, formatDelta, formatMonthInput, parseMonthInput };

export const monthOptions = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];


export const formatPercent = (value: number) => `${value.toFixed(2)}%`;

export const formatScore = (value: number) => value.toFixed(0);


export const formatCurve = (value: number | null) =>
  value === null ? "—" : `${value.toFixed(2)}%`;
