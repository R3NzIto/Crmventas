import type { WorkflowExecution } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { createWorkflowEngine, workflowMatchesTrigger } from "@/modules/workflows/workflow.engine";
import type { WorkflowRepository } from "@/modules/workflows/workflow.repository";
import type { WorkflowRecord } from "@/modules/workflows/workflow.types";

function workflowFixture(overrides: Partial<WorkflowRecord> = {}): WorkflowRecord {
  return {
    id: "workflow-1",
    agencyId: "agency-1",
    name: "New contact welcome",
    trigger: { type: "contact_created" },
    steps: [],
    isActive: true,
    ...overrides
  };
}

function executionFixture(): WorkflowExecution {
  return {
    id: "execution-1",
    workflowId: "workflow-1",
    contactId: "contact-1",
    status: "pending",
    log: [],
    startedAt: new Date("2026-01-01T00:00:00.000Z")
  };
}

function repositoryMock(workflows: WorkflowRecord[]): WorkflowRepository {
  return {
    findActiveByAgency: vi.fn().mockResolvedValue(workflows),
    createExecution: vi.fn().mockResolvedValue(executionFixture()),
    updateExecution: vi.fn(),
    addTag: vi.fn(),
    moveOpenDeal: vi.fn()
  };
}

describe("workflow engine", () => {
  it("matches supported triggers by type and conditions", () => {
    const workflow = workflowFixture({ trigger: { type: "tag_added", tag: "vip" } });

    expect(workflowMatchesTrigger(workflow, { type: "tag_added", agencyId: "agency-1", contactId: "contact-1", tag: "vip" })).toBe(
      true
    );
    expect(
      workflowMatchesTrigger(workflow, { type: "tag_added", agencyId: "agency-1", contactId: "contact-1", tag: "lead" })
    ).toBe(false);
  });

  it("creates executions and enqueues jobs for matching workflows", async () => {
    const repository = repositoryMock([workflowFixture()]);
    const queue = { add: vi.fn().mockResolvedValue(undefined) };
    const engine = createWorkflowEngine(repository, queue);

    const count = await engine.handleTrigger({ type: "contact_created", agencyId: "agency-1", contactId: "contact-1" });

    expect(count).toBe(1);
    expect(repository.createExecution).toHaveBeenCalledWith("workflow-1", "contact-1");
    expect(queue.add).toHaveBeenCalledWith("run", {
      executionId: "execution-1",
      workflowId: "workflow-1",
      contactId: "contact-1",
      agencyId: "agency-1",
      triggerPayload: {
        conversationId: undefined,
        channel: undefined,
        content: undefined
      }
    });
  });

  it("matches message_received by channel and keyword", () => {
    const workflow = workflowFixture({ trigger: { type: "message_received", channel: "whatsapp", keyword: "price" } });

    expect(
      workflowMatchesTrigger(workflow, {
        type: "message_received",
        agencyId: "agency-1",
        contactId: "contact-1",
        conversationId: "conversation-1",
        channel: "whatsapp",
        content: "What is the price?"
      })
    ).toBe(true);
  });

  it("matches lead_qualified by score and intent", () => {
    const workflow = workflowFixture({ trigger: { type: "lead_qualified", minScore: 80, intent: "pricing" } });

    expect(
      workflowMatchesTrigger(workflow, {
        type: "lead_qualified",
        agencyId: "agency-1",
        contactId: "contact-1",
        leadScore: 86,
        intent: "pricing",
        urgency: "medium"
      })
    ).toBe(true);
    expect(
      workflowMatchesTrigger(workflow, {
        type: "lead_qualified",
        agencyId: "agency-1",
        contactId: "contact-1",
        leadScore: 50,
        intent: "pricing"
      })
    ).toBe(false);
  });
});
