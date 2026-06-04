import { Queue } from "bullmq";
import { workflowRedisConnectionOptions } from "@/modules/workflows/workflow.queue";

export type InboxInboundJob =
  | {
      type: "email";
      from: string;
      to: string;
      subject?: string;
      text?: string;
      html?: string;
    }
  | {
      type: "sms";
      from: string;
      to: string;
      body: string;
    }
  | {
      type: "whatsapp";
      from: string;
      to: string;
      body: string;
      mediaUrl?: string;
    };

export const inboxProcessingQueue = new Queue<InboxInboundJob>("inbox-processing", {
  connection: workflowRedisConnectionOptions()
});

export const inboxProcessingQueuePort = {
  add(name: "inbound", data: InboxInboundJob): Promise<unknown> {
    return inboxProcessingQueue.add(name, data);
  }
};
