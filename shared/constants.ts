export const MESS_ISSUE_CATEGORIES = [
  "FOOD",
  "SERVICE",
  "HYGIENE",
  "INFRASTRUCTURE",
  "OTHER",
] as const;

export type MessIssueCategory = (typeof MESS_ISSUE_CATEGORIES)[number];
