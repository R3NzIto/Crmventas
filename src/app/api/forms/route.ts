import { NextResponse, type NextRequest } from "next/server";
import { getAgencyContext } from "@/lib/api";
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
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error interno del servidor" }, { status: 500 });
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
    return NextResponse.json({ error: error instanceof Error ? error.message : "Solicitud invalida" }, { status: 400 });
  }
}
