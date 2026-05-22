export const DEFAULT_NOTIFICATION_PREFS = {
  email: true,
  post_published: true,
  post_engagement: true,
  campaign_started: true,
  ai_credits_low: true,
  billing: true,
  weekly_report: false,
} as const;

export type NotificationPrefs = typeof DEFAULT_NOTIFICATION_PREFS;
