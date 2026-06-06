import { Queue } from "bullmq";

interface WorkflowRedisConnectionOptions {
  host: string;
  port: number;
  password?: string;
  username?: string;
  db?: number;
  tls?: Record<string, never>;
}

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

export function workflowRedisConnectionOptions(): WorkflowRedisConnectionOptions {
  const redisUrl = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");
  return {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    ...(redisUrl.username ? { username: decodeURIComponent(redisUrl.username) } : {}),
    ...(redisUrl.password ? { password: decodeURIComponent(redisUrl.password) } : {}),
    ...(redisUrl.pathname.length > 1 ? { db: Number(redisUrl.pathname.slice(1)) } : {}),
    ...(redisUrl.protocol === "rediss:" ? { tls: {} } : {})
  };
}

let workflowExecutionQueue: Queue<WorkflowExecutionJob> | null = null;

export function getWorkflowExecutionQueue(): Queue<WorkflowExecutionJob> {
  workflowExecutionQueue ??= new Queue<WorkflowExecutionJob>("workflow-execution", {
    connection: workflowRedisConnectionOptions()
  });
  return workflowExecutionQueue;
}

export const workflowQueuePort = {
  add(name: "run", data: WorkflowExecutionJob): Promise<unknown> {
    return getWorkflowExecutionQueue().add(name, data);
  }
};
