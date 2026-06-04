import { Queue } from "bullmq";

export interface WorkflowExecutionJob {
  executionId: string;
  workflowId: string;
  contactId: string;
  agencyId: string;
  triggerPayload?: {
    conversationId?: string;
    channel?: string;
    content?: string;
    leadScore?: number;
    intent?: string;
    urgency?: string;
  };
}

export function workflowRedisConnectionOptions(): { host: string; port: number; password?: string; db?: number } {
  const redisUrl = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");
  return {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    ...(redisUrl.password ? { password: redisUrl.password } : {}),
    ...(redisUrl.pathname.length > 1 ? { db: Number(redisUrl.pathname.slice(1)) } : {})
  };
}

export const workflowExecutionQueue = new Queue<WorkflowExecutionJob>("workflow-execution", {
  connection: workflowRedisConnectionOptions()
});

export const workflowQueuePort = {
  add(name: "run", data: WorkflowExecutionJob): Promise<unknown> {
    return workflowExecutionQueue.add(name, data);
  }
};
