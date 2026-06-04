import { NextResponse, type NextRequest } from "next/server";
import { inboxProcessingQueuePort } from "@/modules/inbox/inbox-processing.queue";

function getFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    await inboxProcessingQueuePort.add("inbound", {
      type: "email",
      from: getFormValue(formData, "from"),
      to: getFormValue(formData, "to"),
      subject: getFormValue(formData, "subject"),
      text: getFormValue(formData, "text"),
      html: getFormValue(formData, "html")
    });
  } catch (error) {
    console.error("SendGrid inbound webhook enqueue failed", error);
  }

  return NextResponse.json({ received: true });
}
