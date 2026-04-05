import type { KnownStakeholder } from "./types";

export const DEFAULT_TIME_MINUTES = 13 * 60 + 10;
export const DECISION_TIME_INCREMENT = 35;
export const DEADLINE_MINUTES = 17 * 60;
export const DEADLINE_LABEL = "Due by 5:00 PM";
export const DEADLINE_DELIVERABLE = "External press statement on the test anomaly";
export const DEADLINE_CONSEQUENCE =
  "If you delay too long, the media narrative forms without you.";
export const ENDING_PATTERN = /^(>=|<=|>|<)\s*(\d{1,3})$/;
export const STORAGE_KEY = "inbox-simulator-state-v5";

export const DECISION_SUMMARIES: Record<string, string> = {
  m1: "Decision: Do we disclose the uncertainty publicly and invite outside review?",
  m2: "Decision: Do we engage neighbors directly now or control the message first?",
  m8: "Decision: Do we publish a measured update or protect momentum with a tighter statement?",
  ra_m1: "Decision: Do we self-report the discrepancy now or tighten the numbers before disclosure?",
  ra_m2: "Decision: Do we brief local officials live now or rely on a written memo first?",
  ra_m8: "Decision: Do we publish the corrective action plan or keep it inside the review process?",
  cp_m1: "Decision: Do we give the host community formal governance authority or keep engagement informal?",
  cp_m2: "Decision: Do we delay the commercial announcement until local governance terms are ready?",
  cp_m8: "Decision: Do we pair the commercial milestone with the governance package or separate them?",
};

export const STAKEHOLDER_EFFECT_LABELS: Record<KnownStakeholder, string> = {
  regulator: "Regulator trust",
  investor: "Investor momentum",
  community: "Community support",
  engineering: "Engineering confidence",
  media: "Media narrative",
};

export const TRUST_LINE_COLORS: Record<KnownStakeholder, string> = {
  regulator: "#175cd3",
  investor: "#7a2e0b",
  community: "#067647",
  engineering: "#6941c6",
  media: "#b42318",
};
