import { NextResponse, type NextRequest } from "next/server";
import { publicFormSubmissionSchema } from "@/modules/forms/form.schemas";
import { FormSubmissionValidationError, PublicFormNotFoundError, formService } from "@/modules/forms/form.service";

interface PublicFormSubmissionRouteContext {
  params: {
    agencySlug: string;
    formId: string;
  };
}

export async function POST(request: NextRequest, context: PublicFormSubmissionRouteContext) {
  try {
    const input = publicFormSubmissionSchema.parse(await request.json());
    const submission = await formService.submitPublicForm(context.params.agencySlug, context.params.formId, input);
    return NextResponse.json({ data: submission }, { status: 201 });
  } catch (error) {
    const status = error instanceof PublicFormNotFoundError ? 404 : error instanceof FormSubmissionValidationError ? 400 : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Solicitud invalida" }, { status });
  }
}
