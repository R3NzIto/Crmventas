import type { Agency, Contact, Form, FormSubmission } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createFormService,
  FormNotFoundError,
  FormSubmissionValidationError,
  PublicFormNotFoundError,
  type FormWorkflowEngine
} from "@/modules/forms/form.service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    agency: {
      findUnique: vi.fn()
    },
    contact: {
      findFirst: vi.fn(),
      create: vi.fn()
    },
    form: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    formSubmission: {
      create: vi.fn()
    }
  }
}));

function agencyFixture(overrides: Partial<Agency> = {}): Agency {
  return {
    id: "agency-1",
    name: "Demo Agency",
    slug: "demo-agency",
    logo: null,
    primaryColor: "#2563eb",
    plan: "pro",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides
  };
}

function formFixture(overrides: Partial<Form> = {}): Form {
  return {
    id: "form-1",
    agencyId: "agency-1",
    name: "Lead capture",
    fields: [
      { id: "email", label: "Email", type: "email", required: true, options: [] },
      { id: "firstName", label: "First name", type: "text", required: false, options: [] }
    ],
    workflowId: "workflow-1",
    ...overrides
  };
}

function contactFixture(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "contact-1",
    agencyId: "agency-1",
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    phone: null,
    tags: ["lead"],
    customFields: {},
    source: "Form",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides
  };
}

function submissionFixture(overrides: Partial<FormSubmission> = {}): FormSubmission {
  return {
    id: "submission-1",
    formId: "form-1",
    contactId: "contact-1",
    data: { email: "ada@example.com" },
    submittedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides
  };
}

function workflowEngineMock(): FormWorkflowEngine {
  return {
    handleTrigger: vi.fn().mockResolvedValue(1)
  };
}

describe("form service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists forms scoped by agency", async () => {
    vi.mocked(prisma.form.findMany).mockResolvedValue([formFixture()]);
    const service = createFormService(workflowEngineMock());

    await service.listForms("agency-1");

    expect(prisma.form.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { agencyId: "agency-1" }
      })
    );
  });

  it("creates forms with normalized JSON fields for the agency", async () => {
    vi.mocked(prisma.form.create).mockResolvedValue(formFixture());
    const service = createFormService(workflowEngineMock());

    await service.createForm("agency-1", {
      name: "Lead capture",
      workflowId: "workflow-1",
      fields: [{ id: "email", label: "Email", type: "email", required: true, options: [] }]
    });

    expect(prisma.form.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          agencyId: "agency-1",
          fields: [{ id: "email", label: "Email", type: "email", required: true, options: [] }]
        })
      })
    );
  });

  it("updates only a form inside the same agency", async () => {
    vi.mocked(prisma.form.findFirst).mockResolvedValue(formFixture());
    vi.mocked(prisma.form.update).mockResolvedValue(formFixture({ name: "Updated" }));
    const service = createFormService(workflowEngineMock());

    await service.updateForm("agency-1", "form-1", { name: "Updated" });

    expect(prisma.form.findFirst).toHaveBeenCalledWith({ where: { id: "form-1", agencyId: "agency-1" }, select: { id: true } });
    expect(prisma.form.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "form-1" },
        data: { name: "Updated" }
      })
    );
  });

  it("does not delete a form outside the agency", async () => {
    vi.mocked(prisma.form.findFirst).mockResolvedValue(null);
    const service = createFormService(workflowEngineMock());

    await expect(service.deleteForm("agency-1", "other-form")).rejects.toBeInstanceOf(FormNotFoundError);
    expect(prisma.form.delete).not.toHaveBeenCalled();
  });

  it("rejects public submissions when the form is not in the agency", async () => {
    vi.mocked(prisma.agency.findUnique).mockResolvedValue(agencyFixture());
    vi.mocked(prisma.form.findFirst).mockResolvedValue(null);
    const service = createFormService(workflowEngineMock());

    await expect(service.submitPublicForm("demo-agency", "other-form", { data: { email: "ada@example.com" } })).rejects.toBeInstanceOf(
      PublicFormNotFoundError
    );

    expect(prisma.form.findFirst).toHaveBeenCalledWith({
      where: { id: "other-form", agencyId: "agency-1" },
      select: { id: true, agencyId: true, fields: true }
    });
  });

  it("creates a contact for a valid public submission when no contact exists", async () => {
    const engine = workflowEngineMock();
    vi.mocked(prisma.agency.findUnique).mockResolvedValue(agencyFixture());
    vi.mocked(prisma.form.findFirst).mockResolvedValue(formFixture());
    vi.mocked(prisma.contact.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.contact.create).mockResolvedValue(contactFixture());
    vi.mocked(prisma.formSubmission.create).mockResolvedValue(submissionFixture());
    const service = createFormService(engine);

    await service.submitPublicForm("demo-agency", "form-1", {
      data: { email: "ada@example.com", firstName: "Ada" }
    });

    expect(prisma.contact.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          agencyId: "agency-1",
          email: "ada@example.com",
          source: "Form"
        })
      })
    );
    expect(prisma.formSubmission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          formId: "form-1",
          contactId: "contact-1"
        })
      })
    );
  });

  it("reuses an existing contact by email for public submissions", async () => {
    const engine = workflowEngineMock();
    vi.mocked(prisma.agency.findUnique).mockResolvedValue(agencyFixture());
    vi.mocked(prisma.form.findFirst).mockResolvedValue(formFixture());
    vi.mocked(prisma.contact.findFirst).mockResolvedValue(contactFixture());
    vi.mocked(prisma.formSubmission.create).mockResolvedValue(submissionFixture());
    const service = createFormService(engine);

    await service.submitPublicForm("demo-agency", "form-1", {
      data: { email: "ada@example.com" }
    });

    expect(prisma.contact.create).not.toHaveBeenCalled();
    expect(prisma.formSubmission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          contactId: "contact-1"
        })
      })
    );
  });

  it("fires form_submitted workflows after submission", async () => {
    const engine = workflowEngineMock();
    vi.mocked(prisma.agency.findUnique).mockResolvedValue(agencyFixture());
    vi.mocked(prisma.form.findFirst).mockResolvedValue(formFixture());
    vi.mocked(prisma.contact.findFirst).mockResolvedValue(contactFixture());
    vi.mocked(prisma.formSubmission.create).mockResolvedValue(submissionFixture());
    const service = createFormService(engine);

    await service.submitPublicForm("demo-agency", "form-1", {
      data: { email: "ada@example.com" }
    });

    expect(engine.handleTrigger).toHaveBeenCalledWith({
      type: "form_submitted",
      agencyId: "agency-1",
      contactId: "contact-1",
      formId: "form-1"
    });
  });

  it("validates required public submission fields", async () => {
    vi.mocked(prisma.agency.findUnique).mockResolvedValue(agencyFixture());
    vi.mocked(prisma.form.findFirst).mockResolvedValue(formFixture());
    const service = createFormService(workflowEngineMock());

    await expect(service.submitPublicForm("demo-agency", "form-1", { data: {} })).rejects.toBeInstanceOf(FormSubmissionValidationError);
  });
});
