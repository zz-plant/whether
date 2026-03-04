/**
 * Final report-data shape assembly.
 * Kept as a generic identity boundary so services can compose without changing external contracts.
 */
export const assembleReportViewModel = <T extends Record<string, unknown>>(payload: T) => payload;
