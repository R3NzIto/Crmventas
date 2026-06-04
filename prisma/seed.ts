import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const agency = await prisma.agency.upsert({
    where: { slug: "demo-agency" },
    update: {
      name: "Agencia Demo",
      primaryColor: "#2563eb",
      plan: "pro"
    },
    create: {
      name: "Agencia Demo",
      slug: "demo-agency",
      logo: null,
      primaryColor: "#2563eb",
      plan: "pro"
    }
  });

  const hashedPassword = await hash("Demo1234!", 12);

  await prisma.user.upsert({
    where: { email: "demo@crmventas.local" },
    update: {
      hashedPassword,
      role: "agency_admin",
      agencyId: agency.id
    },
    create: {
      email: "demo@crmventas.local",
      hashedPassword,
      role: "agency_admin",
      agencyId: agency.id
    }
  });

  const contact = await prisma.contact.upsert({
    where: {
      id: "demo-contact-ada"
    },
    update: {
      agencyId: agency.id,
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      phone: "+1 555 0123",
      tags: ["lead", "vip"],
      source: "Demo"
    },
    create: {
      id: "demo-contact-ada",
      agencyId: agency.id,
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      phone: "+1 555 0123",
      tags: ["lead", "vip"],
      customFields: {},
      source: "Demo"
    }
  });

  const graceContact = await prisma.contact.upsert({
    where: {
      id: "demo-contact-grace"
    },
    update: {
      agencyId: agency.id,
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace@example.com",
      phone: "+1 555 0176",
      tags: ["customer"],
      source: "Referido"
    },
    create: {
      id: "demo-contact-grace",
      agencyId: agency.id,
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace@example.com",
      phone: "+1 555 0176",
      tags: ["customer"],
      customFields: {},
      source: "Referral"
    }
  });

  const pipeline = await prisma.pipeline.upsert({
    where: { id: "demo-pipeline-sales" },
    update: {
      agencyId: agency.id,
      name: "Pipeline Comercial"
    },
    create: {
      id: "demo-pipeline-sales",
      agencyId: agency.id,
      name: "Pipeline Comercial"
    }
  });

  const stage = await prisma.stage.upsert({
    where: { id: "demo-stage-new" },
    update: {
      pipelineId: pipeline.id,
      name: "Nuevo",
      order: 0,
      color: "#2563eb"
    },
    create: {
      id: "demo-stage-new",
      pipelineId: pipeline.id,
      name: "Nuevo",
      order: 0,
      color: "#2563eb"
    }
  });

  const qualifiedStage = await prisma.stage.upsert({
    where: { id: "demo-stage-qualified" },
    update: {
      pipelineId: pipeline.id,
      name: "Calificado",
      order: 1,
      color: "#10b981"
    },
    create: {
      id: "demo-stage-qualified",
      pipelineId: pipeline.id,
      name: "Calificado",
      order: 1,
      color: "#10b981"
    }
  });

  await prisma.stage.upsert({
    where: { id: "demo-stage-proposal" },
    update: {
      pipelineId: pipeline.id,
      name: "Propuesta",
      order: 2,
      color: "#f59e0b"
    },
    create: {
      id: "demo-stage-proposal",
      pipelineId: pipeline.id,
      name: "Propuesta",
      order: 2,
      color: "#f59e0b"
    }
  });

  await prisma.deal.upsert({
    where: { id: "demo-deal-website" },
    update: {
      stageId: stage.id,
      contactId: contact.id,
      title: "Desarrollo web",
      value: 4200,
      status: "open"
    },
    create: {
      id: "demo-deal-website",
      stageId: stage.id,
      contactId: contact.id,
      title: "Desarrollo web",
      value: 4200,
      status: "open"
    }
  });

  await prisma.deal.upsert({
    where: { id: "demo-deal-retainer" },
    update: {
      stageId: qualifiedStage.id,
      contactId: graceContact.id,
      title: "Plan mensual",
      value: 1800,
      status: "open"
    },
    create: {
      id: "demo-deal-retainer",
      stageId: qualifiedStage.id,
      contactId: graceContact.id,
      title: "Plan mensual",
      value: 1800,
      status: "open"
    }
  });

  const conversation = await prisma.conversation.upsert({
    where: { id: "demo-conversation-email" },
    update: {
      agencyId: agency.id,
      contactId: contact.id,
      channel: "email",
      status: "OPEN",
      unreadCount: 1,
      lastMessageAt: new Date("2026-06-02T12:00:00.000Z")
    },
    create: {
      id: "demo-conversation-email",
      agencyId: agency.id,
      contactId: contact.id,
      channel: "email",
      status: "OPEN",
      unreadCount: 1,
      lastMessageAt: new Date("2026-06-02T12:00:00.000Z")
    }
  });

  const inboundLeadMessage = await prisma.message.upsert({
    where: { id: "demo-message-email-inbound" },
    update: {
      conversationId: conversation.id,
      direction: "inbound",
      content: "Hola, me podes enviar detalles del paquete de automatizacion?",
      status: "received",
      sentAt: new Date("2026-06-02T12:00:00.000Z"),
      metadata: { subject: "Paquete de automatizacion" }
    },
    create: {
      id: "demo-message-email-inbound",
      conversationId: conversation.id,
      direction: "inbound",
      content: "Hola, me podes enviar detalles del paquete de automatizacion?",
      status: "received",
      sentAt: new Date("2026-06-02T12:00:00.000Z"),
      metadata: { subject: "Paquete de automatizacion" }
    }
  });

  await prisma.leadQualification.upsert({
    where: { messageId: inboundLeadMessage.id },
    update: {
      agencyId: agency.id,
      contactId: contact.id,
      conversationId: conversation.id,
      isLead: true,
      leadScore: 86,
      intent: "pricing",
      urgency: "medium",
      summary: "El contacto pidio detalles sobre un paquete de automatizacion y probablemente esta evaluando precio o encaje del servicio.",
      recommendedAction: "Responder con detalles del paquete y crear una oportunidad calificada para seguimiento.",
      suggestedTags: ["ai-lead", "pricing"]
    },
    create: {
      agencyId: agency.id,
      contactId: contact.id,
      conversationId: conversation.id,
      messageId: inboundLeadMessage.id,
      isLead: true,
      leadScore: 86,
      intent: "pricing",
      urgency: "medium",
      summary: "El contacto pidio detalles sobre un paquete de automatizacion y probablemente esta evaluando precio o encaje del servicio.",
      recommendedAction: "Responder con detalles del paquete y crear una oportunidad calificada para seguimiento.",
      suggestedTags: ["ai-lead", "pricing"],
      raw: { source: "seed" }
    }
  });

  await prisma.workflow.upsert({
    where: { id: "demo-workflow-new-contact" },
    update: {
      agencyId: agency.id,
      name: "Etiquetar nuevos contactos",
      trigger: { type: "contact_created" },
      steps: [{ type: "add_tag", tag: "new-lead" }],
      isActive: true
    },
    create: {
      id: "demo-workflow-new-contact",
      agencyId: agency.id,
      name: "Etiquetar nuevos contactos",
      trigger: { type: "contact_created" },
      steps: [{ type: "add_tag", tag: "new-lead" }],
      isActive: true
    }
  });

  await prisma.workflow.upsert({
    where: { id: "demo-workflow-whatsapp-price" },
    update: {
      agencyId: agency.id,
      name: "Respuesta de precio por WhatsApp",
      trigger: { type: "message_received", channel: "whatsapp", keyword: "price" },
      steps: [{ type: "send_message", message: "Gracias por consultar. Un vendedor te contactara con precios." }],
      isActive: false
    },
    create: {
      id: "demo-workflow-whatsapp-price",
      agencyId: agency.id,
      name: "Respuesta de precio por WhatsApp",
      trigger: { type: "message_received", channel: "whatsapp", keyword: "price" },
      steps: [{ type: "send_message", message: "Gracias por consultar. Un vendedor te contactara con precios." }],
      isActive: false
    }
  });

  await prisma.workflow.upsert({
    where: { id: "demo-workflow-ai-qualified" },
    update: {
      agencyId: agency.id,
      name: "Seguimiento de lead calificado por IA",
      trigger: { type: "lead_qualified", minScore: 80, intent: "pricing" },
      steps: [{ type: "add_tag", tag: "hot-lead" }],
      isActive: true
    },
    create: {
      id: "demo-workflow-ai-qualified",
      agencyId: agency.id,
      name: "Seguimiento de lead calificado por IA",
      trigger: { type: "lead_qualified", minScore: 80, intent: "pricing" },
      steps: [{ type: "add_tag", tag: "hot-lead" }],
      isActive: true
    }
  });

  const formWorkflow = await prisma.workflow.upsert({
    where: { id: "demo-workflow-form-submitted" },
    update: {
      agencyId: agency.id,
      name: "Seguimiento de lead por formulario",
      trigger: { type: "form_submitted", formId: "demo-form-lead-capture" },
      steps: [{ type: "add_tag", tag: "form-lead" }],
      isActive: true
    },
    create: {
      id: "demo-workflow-form-submitted",
      agencyId: agency.id,
      name: "Seguimiento de lead por formulario",
      trigger: { type: "form_submitted", formId: "demo-form-lead-capture" },
      steps: [{ type: "add_tag", tag: "form-lead" }],
      isActive: true
    }
  });

  const demoForm = await prisma.form.upsert({
    where: { id: "demo-form-lead-capture" },
    update: {
      agencyId: agency.id,
      name: "Formulario de captura de leads",
      workflowId: formWorkflow.id,
      fields: [
        { id: "firstName", label: "Nombre", type: "text", required: true, options: [] },
        { id: "lastName", label: "Apellido", type: "text", required: false, options: [] },
        { id: "email", label: "Email", type: "email", required: true, options: [] },
        { id: "phone", label: "Telefono", type: "phone", required: false, options: [] },
        { id: "package", label: "Paquete", type: "select", required: true, options: ["Inicial", "Crecimiento", "Escala"] },
        { id: "message", label: "Mensaje", type: "textarea", required: false, options: [] }
      ]
    },
    create: {
      id: "demo-form-lead-capture",
      agencyId: agency.id,
      name: "Formulario de captura de leads",
      workflowId: formWorkflow.id,
      fields: [
        { id: "firstName", label: "Nombre", type: "text", required: true, options: [] },
        { id: "lastName", label: "Apellido", type: "text", required: false, options: [] },
        { id: "email", label: "Email", type: "email", required: true, options: [] },
        { id: "phone", label: "Telefono", type: "phone", required: false, options: [] },
        { id: "package", label: "Paquete", type: "select", required: true, options: ["Inicial", "Crecimiento", "Escala"] },
        { id: "message", label: "Mensaje", type: "textarea", required: false, options: [] }
      ]
    }
  });

  await prisma.formSubmission.upsert({
    where: { id: "demo-form-submission-ada" },
    update: {
      formId: demoForm.id,
      contactId: contact.id,
      data: {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        phone: "+1 555 0123",
        package: "Crecimiento",
        message: "Quiero ver como las automatizaciones califican leads entrantes."
      }
    },
    create: {
      id: "demo-form-submission-ada",
      formId: demoForm.id,
      contactId: contact.id,
      data: {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        phone: "+1 555 0123",
        package: "Crecimiento",
        message: "Quiero ver como las automatizaciones califican leads entrantes."
      }
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
