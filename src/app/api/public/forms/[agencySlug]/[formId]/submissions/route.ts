import { NextResponse, type NextRequest } from "next/server";
import { ApiError, apiErrorResponse } from "@/lib/api";
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
    if (error instanceof PublicFormNotFoundError) {
      return apiErrorResponse(new ApiError(error.message, 404));
    }
    if (error instanceof FormSubmissionValidationError) {
      return apiErrorResponse(new ApiError(error.message, 400));
    }
    return apiErrorResponse(error, "Bad request");
  }
}
