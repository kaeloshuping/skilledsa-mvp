import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Seed script for local development.
 * Creates:
 * - Admin user (admin@skilledsa.co.za)
 * - Test customer (customer@test.com)
 * - Test contractor (contractor@test.com) with a pending verification request
 */
async function main() {
  // Ensure we're not running in production by mistake
  if (process.env.NODE_ENV === "production") {
    console.error("Seeding is not allowed in production.");
    process.exit(1);
  }

  // Predefined passwords – only for local testing; never use in production.
  const adminPassword = await bcrypt.hash("Admin@2026", 10);
  const customerPassword = await bcrypt.hash("Customer@123", 10);
  const contractorPassword = await bcrypt.hash("Contractor@123", 10);

  // Create or update admin
  const admin = await prisma.user.upsert({
    where: { email: "admin@skilledsa.co.za" },
    update: {},
    create: {
      email: "admin@skilledsa.co.za",
      password_hash: adminPassword,
      role: Role.admin,
      full_name: "System Admin",
      popia_consent: true,
      verification_status: "verified",
    },
  });

  // Create or update test customer
  const customer = await prisma.user.upsert({
    where: { email: "customer@test.com" },
    update: {},
    create: {
      email: "customer@test.com",
      password_hash: customerPassword,
      role: Role.customer,
      full_name: "Test Customer",
      phone: "+27821234567",
      popia_consent: true,
    },
  });

  // Create or update test contractor
  const contractor = await prisma.user.upsert({
    where: { email: "contractor@test.com" },
    update: {},
    create: {
      email: "contractor@test.com",
      password_hash: contractorPassword,
      role: Role.contractor,
      full_name: "Test Contractor",
      phone: "+27827654321",
      popia_consent: true,
    },
  });

  // Create a verification request for the contractor (if not exists)
  await prisma.verificationRequest.upsert({
    where: { user_id: contractor.id },
    update: {},
    create: {
      user_id: contractor.id,
      role: Role.contractor,
      id_photo_url: "https://example.com/id.jpg",
      selfie_url: "https://example.com/selfie.jpg",
      certificate_url: "https://example.com/cert.pdf",
      status: "pending",
    },
  });

  console.log("✅ Seed data created:", { admin, customer, contractor });
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
