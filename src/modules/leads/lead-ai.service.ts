import OpenAI from "openai";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { leadQualificationResultSchema, type LeadFilters, type LeadQualificationResult } from "@/modules/leads/lead.schemas";
import { workflowEngine } from "@/modules/workflows/workflow.engine";

const leadResponseJsonSchema = {
  name: "lead_qualification",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      isLead: { type: "boolean" },
      leadScore: { type: "integer", minimum: 0, maximum: 100 },
      intent: { type: "string", enum: ["pricing", "demo", "buying_interest", "support", "spam", "follow_up", "other"] },
      urgency: { type: "string", enum: ["low", "medium", "high"] },
      summary: { type: "string" },
      recommendedAction: { type: "string" },
      suggestedTags: {
        type: "array",
        items: { type: "string" }
      }
    },
    required: ["isLead", "leadScore", "intent", "urgency", "summary", "recommendedAction", "suggestedTags"]
  },
  strict: true
} as const;

export type LeadQualificationWithRelations = Prisma.LeadQualificationGetPayload<{
  include: {
    contact: true;
    conversation: true;
    message: true;
  };
}>;

function heuristicQualification(content: string): LeadQualificationResult {
  const text = content.toLowerCase();
  const pricing = /\b(price|pricing|cost|quote|budget|how much|plan|package|precio|cotiz|cuanto)\b/i.test(text);
  const demo = /\b(demo|call|meeting|schedule|book|consulta|reunion|llamada)\b/i.test(text);
  const spam = /\b(unsubscribe|crypto|loan|casino|viagra|spam)\b/i.test(text);
  const support = /\b(issue|problem|support|bug|error|help|soporte|problema)\b/i.test(text);
  const urgency = /\b(today|urgent|asap|now|hoy|urgente|ya)\b/i.test(text) ? "high" : pricing || demo ? "medium" : "low";
  const leadScore = spam ? 5 : pricing ? 88 : demo ? 82 : support ? 25 : 45;
  const intent = spam ? "spam" : pricing ? "pricing" : demo ? "demo" : support ? "support" : "other";

  return {
    isLead: leadScore >= 70,
    leadScore,
    intent,
    urgency,
    summary: content.slice(0, 180) || "Inbound message received.",
    recommendedAction: leadScore >= 70 ? "Follow up with a sales response and create a deal." : "Review manually before sales follow-up.",
    suggestedTags: leadScore >= 70 ? ["ai-lead", intent] : ["ai-reviewed", intent]
  };
}

function extractOutputText(response: { output_text?: string; output?: unknown }): string | null {
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text;
  }
  return null;
}

export function createLeadAiService() {
  return {
    async classifyText(content: string): Promise<LeadQualificationResult> {
      if (!process.env.OPENAI_API_KEY) {
        return heuristicQualification(content);
      }

      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await client.responses.create({
        model: process.env.OPENAI_LEAD_MODEL ?? "gpt-4o-mini",
        input: [
          {
            role: "system",
            content:
              "Classify inbound CRM messages for sales lead qualification. Return only structured JSON. Be conservative: support requests and spam are not sales leads."
          },
          {
            role: "user",
            content
          }
        ],
        text: {
          format: {
            type: "json_schema",
            ...leadResponseJsonSchema
          }
        }
      });

      const outputText = extractOutputText(response);
      if (!outputText) {
        return heuristicQualification(content);
      }
      const parsed = leadQualificationResultSchema.safeParse(JSON.parse(outputText));
      return parsed.success ? parsed.data : heuristicQualification(content);
    },

    async qualifyMessage(messageId: string): Promise<LeadQualificationWithRelations | null> {
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: {
          conversation: {
            include: {
              contact: true
            }
          }
        }
      });
      if (!message || message.direction !== "inbound") {
        return null;
      }

      const result = await this.classifyText(message.content);
      const qualification = await prisma.leadQualification.upsert({
        where: { messageId: message.id },
        update: {
          isLead: result.isLead,
          leadScore: result.leadScore,
          intent: result.intent,
          urgency: result.urgency,
          summary: result.summary,
          recommendedAction: result.recommendedAction,
          suggestedTags: result.suggestedTags,
          raw: result
        },
        create: {
          agencyId: message.conversation.agencyId,
          contactId: message.conversation.contactId,
          conversationId: message.conversationId,
          messageId: message.id,
          isLead: result.isLead,
          leadScore: result.leadScore,
          intent: result.intent,
          urgency: result.urgency,
          summary: result.summary,
          recommendedAction: result.recommendedAction,
          suggestedTags: result.suggestedTags,
          raw: result
        },
        include: {
          contact: true,
          conversation: true,
          message: true
        }
      });

      if (result.suggestedTags.length > 0) {
        const currentTags = message.conversation.contact.tags;
        const nextTags = Array.from(new Set([...currentTags, ...result.suggestedTags]));
        if (nextTags.length !== currentTags.length) {
          await prisma.contact.update({
            where: { id: message.conversation.contactId },
            data: { tags: nextTags }
          });
        }
      }

      if (result.isLead) {
        await workflowEngine.handleTrigger({
          type: "lead_qualified",
          agencyId: message.conversation.agencyId,
          contactId: message.conversation.contactId,
          conversationId: message.conversationId,
          channel: message.conversation.channel,
          content: message.content,
          leadScore: result.leadScore,
          intent: result.intent,
          urgency: result.urgency
        });
      }

      return qualification;
    },

    listLeads(agencyId: string, filters: LeadFilters): Promise<LeadQualificationWithRelations[]> {
      return prisma.leadQualification.findMany({
        where: {
          agencyId,
          isLead: filters.isLead,
          leadScore: { gte: filters.minScore },
          ...(filters.intent ? { intent: filters.intent } : {}),
          ...(filters.urgency ? { urgency: filters.urgency } : {}),
          ...(filters.search
            ? {
                OR: [
                  { summary: { contains: filters.search, mode: "insensitive" } },
                  { recommendedAction: { contains: filters.search, mode: "insensitive" } },
                  { contact: { firstName: { contains: filters.search, mode: "insensitive" } } },
                  { contact: { lastName: { contains: filters.search, mode: "insensitive" } } },
                  { message: { content: { contains: filters.search, mode: "insensitive" } } }
                ]
              }
            : {})
        },
        include: {
          contact: true,
          conversation: true,
          message: true
        },
        orderBy: [{ leadScore: "desc" }, { createdAt: "desc" }]
      });
    }
  };
}

export const leadAiService = createLeadAiService();
