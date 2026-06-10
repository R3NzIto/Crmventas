import { redirect } from "next/navigation";

export default function ContactsRedirectRoute() {
  redirect("/dashboard/contacts");
}
