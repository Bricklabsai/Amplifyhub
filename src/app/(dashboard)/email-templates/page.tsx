import { redirect } from "next/navigation";

export default function EmailTemplatesPage() {
  redirect("/email-hub?tab=templates");
}
