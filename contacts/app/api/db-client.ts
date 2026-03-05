import { prisma as pgPrisma } from "./prisma";

export const dbClient = {
  /**
   * Get all contacts with relations
   */
  async getContacts() {
    return getPostgresContacts();
  },

  /**
   * Get a single contact by ID
   */
  async getContactById(id: string) {
    return getPostgresContactById(id);
  },

  /**
   * Create a new contact
   */
  async createContact(data: { first_name: string; surname: string }) {
    return createPostgresContact(data);
  },

  /**
   * Test database connection
   */
  async testConnection() {
    return testPostgresConnection();
  },
};

// PostgreSQL implementations
async function getPostgresContacts() {
  const contacts = await pgPrisma.contact.findMany({
    include: {
      marital_status: true,
      national_identity_card: true,
    },
    orderBy: { first_name: "asc" },
  });

  return contacts.map((c: any) => ({
    contact_id: c.contact_id,
    first_name: c.first_name,
    middle_name: c.middle_name,
    surname: c.surname,
    marital_status: c.marital_status?.marital_status || null,
    doc_type: c.national_identity_card?.doc_type || null,
    card_number: c.national_identity_card?.card_number || null,
  }));
}

async function getPostgresContactById(id: string) {
  const contact = await pgPrisma.contact.findUnique({
    where: { contact_id: id },
    include: {
      national_identity_card: true,
    },
  });
  return contact;
}

async function createPostgresContact(data: {
  first_name: string;
  surname: string;
}) {
  const contactId = await generateUniqueContactId();

  const newContact = await pgPrisma.contact.create({
    data: {
      contact_id: contactId,
      first_name: data.first_name,
      surname: data.surname,
    },
    select: {
      contact_id: true,
      first_name: true,
      surname: true,
    },
  });

  return newContact;
}

async function testPostgresConnection() {
  const result = await pgPrisma.$queryRaw<any[]>`SELECT NOW() as now`;
  return {
    success: true,
    message: "Connected to PostgreSQL successfully!",
    data: result[0],
  };
}
// Helper function
async function generateUniqueContactId() {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let isUnique = false;
  let contactId = "";

  while (!isUnique) {
    contactId =
      "c" +
      Array.from({ length: 8 }, () =>
        characters.charAt(Math.floor(Math.random() * characters.length)),
      ).join("");

    const existing = await pgPrisma.contact.findUnique({
      where: { contact_id: contactId },
    });
    if (!existing) {
      isUnique = true;
    }
  }

  return contactId;
}
