import { Worker } from "bullmq";
import { workflowRedisConnectionOptions } from "@/modules/workflows/workflow.queue";
import type { InboxInboundJob } from "@/modules/inbox/inbox-processing.queue";
import { findAgencyIdByInboundEmail, findAgencyIdByPhoneNumber } from "@/modules/inbox/inbox-routing";
import { inboxService } from "@/modules/inbox/inbox.service";
import { leadAiService } from "@/modules/leads/lead-ai.service";

export async function processInboxInboundJob(job: InboxInboundJob): Promise<void> {
  try {
    if (job.type === "email") {
      const agencyId = await findAgencyIdByInboundEmail(job.to);
      if (!agencyId) {
        console.error(`No agency found for inbound email ${job.to}`);
        return;
      }
      const message = await inboxService.upsertInboundMessage({
        agencyId,
        channel: "email",
        from: job.from,
        content: job.text || job.html || "",
        metadata: { subject: job.subject, html: job.html }
      });
      await leadAiService.qualifyMessage(message.id);
      return;
    }

    if (job.type === "sms") {
      const agencyId = await findAgencyIdByPhoneNumber(job.to, "sms");
      if (!agencyId) {
        console.error(`No agency found for inbound SMS ${job.to}`);
        return;
      }
      const message = await inboxService.upsertInboundMessage({
        agencyId,
        channel: "sms",
        from: job.from,
        content: job.body
      });
      await leadAiService.qualifyMessage(message.id);
      return;
    }

    const agencyId = await findAgencyIdByPhoneNumber(job.to, "whatsapp");
    if (!agencyId) {
      console.error(`No agency found for inbound WhatsApp ${job.to}`);
      return;
    }
    const message = await inboxService.upsertInboundMessage({
      agencyId,
      channel: "whatsapp",
      from: job.from.replace("whatsapp:", ""),
      content: job.body,
      metadata: job.mediaUrl ? { mediaUrl: job.mediaUrl } : undefined
    });
    await leadAiService.qualifyMessage(message.id);
  } catch (error) {
    console.error("Inbox inbound processing failed", error);
    throw error;
  }
}

export const inboxProcessingWorker = new Worker<InboxInboundJob>(
  "inbox-processing",
  async (job) => processInboxInboundJob(job.data),
  { connection: workflowRedisConnectionOptions() }
);
