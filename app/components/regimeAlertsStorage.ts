"use client";

import type { RegimeAssessment, RegimeChangeReason } from "../../lib/regimeEngine";

export const regimeAlertsStorageKey = "whether.regimeAlerts";

export type RegimeAlertLogEntry = {
  id: string;
  loggedAt: string;
  previous: {
    recordDate: string;
    assessment: RegimeAssessment;
  };
  current: {
    recordDate: string;
    assessment: RegimeAssessment;
  };
  reasons: RegimeChangeReason[];
};
