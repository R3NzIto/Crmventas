import { redirect } from "next/navigation";

export default function PipelinesRedirectRoute() {
  redirect("/dashboard/pipelines");
}
