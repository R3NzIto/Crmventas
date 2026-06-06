import { NextResponse, type NextRequest } from "next/server";
import { apiErrorResponse, getAgencyContext } from "@/lib/api";
import { createFormSchema } from "@/modules/forms/form.schemas";
import { formService } from "@/modules/forms/form.service";

export async function GET(request: NextRequest) {
  try {
    const context = await getAgencyContext(request);
    if (!context) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const forms = await formService.listForms(context.agencyId);
    return NextResponse.json({ data: forms });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getAgencyContext(request);
    if (!context) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const input = createFormSchema.parse(await request.json());
    const form = await formService.createForm(context.agencyId, input);
    return NextResponse.json({ data: form }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "Bad request");
  }
}
