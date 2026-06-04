import { NextResponse, type NextRequest } from "next/server";
import { getAgencyContext, parseRouteId } from "@/lib/api";
import { updateContactSchema } from "@/modules/crm/contact.schemas";
import { contactService, CrmContactNotFoundError } from "@/modules/crm/contact.service";

interface ContactRouteContext {
  params: { id: string };
}

export async function GET(request: NextRequest, context: ContactRouteContext) {
  try {
    const agencyContext = await getAgencyContext(request);
    if (!agencyContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const contact = await contactService.getContactById(agencyContext.agencyId, parseRouteId(context.params));
    return NextResponse.json({ data: contact });
  } catch (error) {
    const status = error instanceof CrmContactNotFoundError ? 404 : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status });
  }
}

export async function PATCH(request: NextRequest, context: ContactRouteContext) {
  try {
    const agencyContext = await getAgencyContext(request);
    if (!agencyContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const input = updateContactSchema.parse(await request.json());
    const contact = await contactService.updateContact(agencyContext.agencyId, parseRouteId(context.params), input);
    return NextResponse.json({ data: contact });
  } catch (error) {
    const status = error instanceof CrmContactNotFoundError ? 404 : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Bad request" }, { status });
  }
}

export async function DELETE(request: NextRequest, context: ContactRouteContext) {
  try {
    const agencyContext = await getAgencyContext(request);
    if (!agencyContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const contact = await contactService.deleteContact(agencyContext.agencyId, parseRouteId(context.params));
    return NextResponse.json({ data: contact });
  } catch (error) {
    const status = error instanceof CrmContactNotFoundError ? 404 : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status });
  }
}
