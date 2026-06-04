import { notFound } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { formFieldSchema, type FormFieldInput } from "@/modules/forms/form.schemas";
import { PublicForm } from "@/app/f/[agencySlug]/[formId]/public-form";

interface PublicFormRouteProps {
  params: {
    agencySlug: string;
    formId: string;
  };
}

const fieldsSchema = z.array(formFieldSchema);

export default async function PublicFormRoute({ params }: PublicFormRouteProps) {
  const form = await prisma.form.findFirst({
    where: {
      id: params.formId,
      agency: {
        slug: params.agencySlug
      }
    },
    include: {
      agency: {
        select: {
          name: true,
          slug: true,
          primaryColor: true
        }
      }
    }
  });

  if (!form) {
    notFound();
  }

  const parsedFields = fieldsSchema.safeParse(form.fields);
  if (!parsedFields.success) {
    notFound();
  }

  const fields: FormFieldInput[] = parsedFields.data;

  return (
    <main className="min-h-screen bg-muted px-4 py-10">
      <PublicForm
        agencyName={form.agency.name}
        agencySlug={form.agency.slug}
        formId={form.id}
        formName={form.name}
        fields={fields}
        primaryColor={form.agency.primaryColor}
      />
    </main>
  );
}
