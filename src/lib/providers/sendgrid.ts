import sendgrid from "@sendgrid/mail";
import { getAgencyEnv } from "@/lib/providers/provider-config";

export async function sendEmail(to: string, subject: string, html: string, agencyId: string): Promise<void> {
  const apiKey = await getAgencyEnv(agencyId, "SENDGRID_API_KEY", "SENDGRID_API_KEY");
  if (!apiKey) {
    throw new Error("SendGrid API key is not configured");
  }
  const from = process.env.SENDGRID_FROM_EMAIL || "no-reply@crmventas.local";
  sendgrid.setApiKey(apiKey);
  await sendgrid.send({
    to,
    from,
    subject,
    html
  });
}
