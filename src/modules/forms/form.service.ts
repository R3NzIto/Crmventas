import type { Contact, FormSubmission, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { FormCreateInput, FormFieldInput, FormUpdateInput, PublicFormSubmissionInput } from "@/modules/forms/form.schemas";
import { workflowEngine } from "@/modules/workflows/workflow.engine";
import type { WorkflowTriggerPayload } from "@/modules/workflows/workflow.types";
import { ensureOpenDealForLead } from "@/services/lead-deal.service";

export type FormWithSubmissions = Prisma.FormGetPayload<{
  include: {
    workflow: {
      select: {
        id: true;
        name: true;
      };
    };
    submissions: {
      orderBy: { submittedAt: "desc" };
      take: 10;
      include: {
        contact: {
          select: {
            id: true;
            firstName: true;
            lastName: true;
            email: true;
            phone: true;
          };
        };
      };
    };
  };
}>;

export class FormNotFoundError extends Error {
  constructor() {
    super("Formulario no encontrado");
  }
}

export class PublicFormNotFoundError extends Error {
  constructor() {
    super("Formulario publico no encontrado");
  }
}

export class FormSubmissionValidationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

function toJsonArray(fields: FormFieldInput[]): Prisma.InputJsonValue[] {
  return fields.map((field) => ({
    id: field.id,
    label: field.label,
    type: field.type,
    required: field.required,
    options: field.options
  }));
}

function parseFields(fields: Prisma.JsonValue[]): FormFieldInput[] {
  return fields as unknown as FormFieldInput[];
}

function stringValue(data: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function validateSubmission(fields: FormFieldInput[], data: Record<string, unknown>): void {
  for (const field of fields) {
    const value = data[field.id];
    if (field.required && (value === undefined || value === null || value === "")) {
      throw new FormSubmissionValidationError(`${field.label} es obligatorio`);
    }
    if (field.type === "email" && typeof value === "string" && value.trim() && !zodEmail(value)) {
      throw new FormSubmissionValidationError(`${field.label} debe ser un email valido`);
    }
    if (field.type === "select" && typeof value === "string" && value.trim() && field.options.length > 0 && !field.options.includes(value)) {
      throw new FormSubmissionValidationError(`${field.label} no es una opcion valida`);
    }
  }
}

function zodEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function findOrCreateContact(agencyId: string, data: Record<string, unknown>): Promise<Contact> {
  const email = stringValue(data, ["email", "Email", "workEmail"]);
  const phone = stringValue(data, ["phone", "Phone", "mobile"]);
  const firstName = stringValue(data, ["firstName", "Nombre", "First name", "first_name", "name"]) ?? "Formulario";
  const lastName = stringValue(data, ["lastName", "Apellido", "Last name", "last_name"]) ?? "Lead";

  if (email || phone) {
    const contact = await prisma.contact.findFirst({
      where: {
        agencyId,
        OR: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : [])
        ]
      }
    });
    if (contact) {
      return contact;
    }
  }

  return prisma.contact.create({
    data: {
      agencyId,
      firstName,
      lastName,
      email,
      phone,
      tags: ["form-lead"],
      customFields: data as Prisma.InputJsonObject,
      source: "Form"
    }
  });
}

export interface FormWorkflowEngine {
  handleTrigger(payload: WorkflowTriggerPayload): Promise<number>;
}

export function createFormService(engine: FormWorkflowEngine = workflowEngine) {
  return {
    listForms(agencyId: string): Promise<FormWithSubmissions[]> {
      return prisma.form.findMany({
        where: { agencyId },
        include: formInclude,
        orderBy: { name: "asc" }
      });
    },

    async getFormById(agencyId: string, id: string): Promise<FormWithSubmissions> {
      const form = await prisma.form.findFirst({
        where: { id, agencyId },
        include: formInclude
      });
      if (!form) {
        throw new FormNotFoundError();
      }
      return form;
    },

    createForm(agencyId: string, input: FormCreateInput): Promise<FormWithSubmissions> {
      return prisma.form.create({
        data: {
          agencyId,
          name: input.name,
          fields: toJsonArray(input.fields),
          workflowId: input.workflowId ?? null
        },
        include: formInclude
      });
    },

    async updateForm(agencyId: string, id: string, input: FormUpdateInput): Promise<FormWithSubmissions> {
      const existing = await prisma.form.findFirst({ where: { id, agencyId }, select: { id: true } });
      if (!existing) {
        throw new FormNotFoundError();
      }
      return prisma.form.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.fields !== undefined ? { fields: toJsonArray(input.fields) } : {}),
          ...(input.workflowId !== undefined ? { workflowId: input.workflowId ?? null } : {})
        },
        include: formInclude
      });
    },

    async deleteForm(agencyId: string, id: string): Promise<void> {
      const existing = await prisma.form.findFirst({ where: { id, agencyId }, select: { id: true } });
      if (!existing) {
        throw new FormNotFoundError();
      }
      await prisma.form.delete({ where: { id } });
    },

    async submitPublicForm(agencySlug: string, formId: string, input: PublicFormSubmissionInput): Promise<FormSubmission> {
      const agency = await prisma.agency.findUnique({ where: { slug: agencySlug }, select: { id: true } });
      if (!agency) {
        throw new PublicFormNotFoundError();
      }

      const form = await prisma.form.findFirst({
        where: { id: formId, agencyId: agency.id },
        select: { id: true, agencyId: true, name: true, fields: true }
      });
      if (!form) {
        throw new PublicFormNotFoundError();
      }

      const fields = parseFields(form.fields);
      validateSubmission(fields, input.data);
      const contact = await findOrCreateContact(agency.id, input.data);
      const submission = await prisma.formSubmission.create({
        data: {
          formId: form.id,
          contactId: contact.id,
          data: input.data as Prisma.InputJsonObject
        }
      });
      await ensureOpenDealForLead(agency.id, contact.id, `Lead de formulario: ${form.name}`);

      await engine.handleTrigger({
        type: "form_submitted",
        agencyId: agency.id,
        contactId: contact.id,
        formId: form.id
      });

      return submission;
    }
  };
}

const formInclude = {
  workflow: {
    select: {
      id: true,
      name: true
    }
  },
  submissions: {
    orderBy: { submittedAt: "desc" },
    take: 10,
    include: {
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true
        }
      }
    }
  }
} satisfies Prisma.FormInclude;

export const formService = createFormService();
