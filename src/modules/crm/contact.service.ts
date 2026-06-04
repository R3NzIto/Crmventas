import type { Contact } from "@prisma/client";
import { contactRepository, type CrmContactRepository } from "@/modules/crm/contact.repository";
import type { CrmContactFilters, CrmCreateContactInput, CrmUpdateContactInput } from "@/modules/crm/contact.schemas";

export interface CrmImportedContact {
  row: number;
  contact: Contact;
}

export class CrmContactNotFoundError extends Error {
  constructor() {
    super("Contacto no encontrado");
  }
}

export function createContactService(repository: CrmContactRepository = contactRepository) {
  return {
    getContacts(agencyId: string, filters: CrmContactFilters): Promise<Contact[]> {
      return repository.findMany(agencyId, filters);
    },
    async getContactById(agencyId: string, id: string): Promise<Contact> {
      const contact = await repository.findById(agencyId, id);
      if (!contact) {
        throw new CrmContactNotFoundError();
      }
      return contact;
    },
    createContact(agencyId: string, input: CrmCreateContactInput): Promise<Contact> {
      return repository.create(agencyId, input);
    },
    async updateContact(agencyId: string, id: string, input: CrmUpdateContactInput): Promise<Contact> {
      const contact = await repository.update(agencyId, id, input);
      if (!contact) {
        throw new CrmContactNotFoundError();
      }
      return contact;
    },
    async deleteContact(agencyId: string, id: string): Promise<Contact> {
      const contact = await repository.delete(agencyId, id);
      if (!contact) {
        throw new CrmContactNotFoundError();
      }
      return contact;
    },
    async importContactsFromCSV(agencyId: string, csv: string): Promise<CrmImportedContact[]> {
      const rows = csv
        .split(/\r?\n/)
        .map((row) => row.trim())
        .filter(Boolean);
      const [, ...records] = rows;
      const imported: CrmImportedContact[] = [];

      for (const [index, record] of records.entries()) {
        const [firstName = "", lastName = "", email = "", phone = "", tags = ""] = record.split(",").map((value) => value.trim());
        const contact = await repository.create(agencyId, {
          firstName,
          lastName,
          email: email || undefined,
          phone: phone || undefined,
          tags: tags ? tags.split("|").map((tag) => tag.trim()).filter(Boolean) : [],
          customFields: {},
          source: "csv_import"
        });
        imported.push({ row: index + 2, contact });
      }

      return imported;
    }
  };
}

export const contactService = createContactService();
