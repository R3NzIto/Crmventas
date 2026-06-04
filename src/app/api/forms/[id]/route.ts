import { NextResponse, type NextRequest } from "next/server";
import { getAgencyContext, parseRouteId } from "@/lib/api";
import { updateFormSchema } from "@/modules/forms/form.schemas";
import { FormNotFoundError, formService } from "@/modules/forms/form.service";

interface FormRouteContext {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, context: FormRouteContext) {
  try {
    const agencyContext = await getAgencyContext(request);
    if (!agencyContext) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const form = await formService.getFormById(agencyContext.agencyId, parseRouteId(context.params));
    return NextResponse.json({ data: form });
  } catch (error) {
    const status = error instanceof FormNotFoundError ? 404 : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error interno del servidor" }, { status });
  }
}

export async function PATCH(request: NextRequest, context: FormRouteContext) {
  try {
    const agencyContext = await getAgencyContext(request);
    if (!agencyContext) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const input = updateFormSchema.parse(await request.json());
    const form = await formService.updateForm(agencyContext.agencyId, parseRouteId(context.params), input);
    return NextResponse.json({ data: form });
  } catch (error) {
    const status = error instanceof FormNotFoundError ? 404 : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Solicitud invalida" }, { status });
  }
}

export async function DELETE(request: NextRequest, context: FormRouteContext) {
  try {
    const agencyContext = await getAgencyContext(request);
    if (!agencyContext) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await formService.deleteForm(agencyContext.agencyId, parseRouteId(context.params));
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    const status = error instanceof FormNotFoundError ? 404 : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error interno del servidor" }, { status });
  }
}
