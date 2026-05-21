import { redirect } from "next/navigation";

export default function EmailCampaignsPage() {
  redirect("/email-hub?tab=campaigns");
}
