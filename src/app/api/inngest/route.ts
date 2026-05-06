import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import {
  sendWeeklyNewsletter,
  sendEventInvitations,
  retryCampaign,
} from "@/lib/inngest-functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [sendWeeklyNewsletter, sendEventInvitations, retryCampaign],
});
