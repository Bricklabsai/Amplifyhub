import { redirect } from "next/navigation";

export default function EmailComposePage() {
  redirect("/email-hub?tab=studio");
}
