import { redirect } from "next/navigation";

export default function ScheduledCampaignsPage() {
  redirect("/email-hub?tab=scheduled");
}
