import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // ensure basic status options
  await prisma.maritalStatus.createMany({
    data: [
      { status_id: "single", marital_status: "Single" },
      { status_id: "married", marital_status: "Married" },
    ],
    skipDuplicates: true,
  });

  // sample contacts
  await prisma.contact.createMany({
    data: [
      {
        contact_id: "c00000001",
        first_name: "Maria",
        surname: "Paredes",
        status_id: "single",
      },
      {
        contact_id: "c00000002",
        first_name: "Bob",
        surname: "Jones",
        status_id: "married",
      },
    ],
    skipDuplicates: true,
  });

  // sample identity card
  await prisma.nationalIdentityCard.createMany({
    data: [
      {
        contact_id: "c00000001",
        doc_type: "ID",
        card_number: "ABC123456",
      },
    ],
    skipDuplicates: true,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
