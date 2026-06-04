import type { Prisma } from "@prisma/client";

import type { ConversationChannel } from "@prisma/client";

export type WorkflowTriggerType =
  | "contact_created"
  | "tag_added"
  | "stage_changed"
  | "form_submitted"
  | "message_received"
  | "lead_qualified";
export type WorkflowActionType =
  | "send_email"
  | "add_tag"
  | "move_pipeline_stage"
  | "wait_delay"
  | "create_task"
  | "send_message";

export interface WorkflowTriggerPayload {
  type: WorkflowTriggerType;
  agencyId: string;
  contactId: string;
  tag?: string;
  stageId?: string;
  formId?: string;
  conversationId?: string;
  channel?: ConversationChannel;
  content?: string;
  leadScore?: number;
  intent?: string;
  urgency?: string;
}

export interface WorkflowTriggerDefinition {
  type: WorkflowTriggerType;
  tag?: string;
  stageId?: string;
  formId?: string;
  channel?: ConversationChannel;
  keyword?: string;
  minScore?: number;
  intent?: string;
  urgency?: string;
}

export interface WorkflowStepDefinition {
  type: WorkflowActionType;
  tag?: string;
  stageId?: string;
  delayMs?: number;
  subject?: string;
  body?: string;
  title?: string;
  conversationId?: string;
  message?: string;
  template?: string;
}

export interface WorkflowRecord {
  id: string;
  agencyId: string;
  name: string;
  trigger: Prisma.JsonValue;
  steps: Prisma.JsonValue[];
  isActive: boolean;
}
