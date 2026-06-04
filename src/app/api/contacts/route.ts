import { NextResponse, type NextRequest } from "next/server";
import { getAgencyContext } from "@/lib/api";
import { contactFiltersSchema, createContactSchema } from "@/modules/crm/contact.schemas";
import { contactService } from "@/modules/crm/contact.service";

export async function GET(request: NextRequest) {
  try {
    const context = await getAgencyContext(request);
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const filters = contactFiltersSchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const contacts = await contactService.getContacts(context.agencyId, filters);
    return NextResponse.json({ data: contacts });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getAgencyContext(request);
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const input = createContactSchema.parse(await request.json());
    const contact = await contactService.createContact(context.agencyId, input);
    return NextResponse.json({ data: contact }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Bad request" }, { status: 400 });
  }
}
