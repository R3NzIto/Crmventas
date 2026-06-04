import { z } from "zod";

export const conversationFiltersSchema = z.object({
  channel: z.enum(["email", "sms", "whatsapp"]).optional(),
  status: z.enum(["OPEN", "CLOSED", "SNOOZED"]).optional(),
  contactId: z.string().optional(),
  assignedUserId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25)
});

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1)
});

export const patchConversationSchema = z.object({
  action: z.enum(["mark_as_read", "close", "reopen", "assign"]),
  assignedUserId: z.string().optional()
});

export const channelConfigSchema = z.object({
  email: z
    .object({
      sendgridApiKey: z.string().optional(),
      inboundDomain: z.string().optional()
    })
    .optional(),
  sms: z
    .object({
      accountSid: z.string().optional(),
      authToken: z.string().optional(),
      phoneNumber: z.string().optional()
    })
    .optional(),
  whatsapp: z
    .object({
      accountSid: z.string().optional(),
      authToken: z.string().optional(),
      phoneNumber: z.string().optional()
    })
    .optional()
});

export type InboxConversationFilters = z.infer<typeof conversationFiltersSchema>;
export type InboxSendMessageInput = z.infer<typeof sendMessageSchema>;
export type InboxPatchConversationInput = z.infer<typeof patchConversationSchema>;
export type InboxChannelConfigInput = z.infer<typeof channelConfigSchema>;
