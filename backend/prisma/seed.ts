import { PrismaClient, Role, JobStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Seed script for local development.
 * Creates:
 * - Admin user (admin@skilledsa.co.za)
 * - Test customer (customer@test.com)
 * - Test contractor (contractor@test.com) with a pending verification request
 * - Five sample jobs (one per trade) for testing job browsing and filtering
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
      city: "Johannesburg",
      address: "1 Admin Street, Johannesburg",
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
      city: "Johannesburg",
      address: "10 Sandton Drive, Sandton, Johannesburg",
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
      city: "Pretoria",
      address: "25 Church Street, Pretoria",
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

  console.log("✅ Seed users created:", {
    admin: admin.email,
    customer: customer.email,
    contractor: contractor.email,
  });

  // ----- Sample jobs -----
  // Only create if there are no jobs yet (idempotent).
  const jobCount = await prisma.job.count();
  if (jobCount === 0) {
    const sampleJobs = [
      {
        customer_id: customer.id,
        title: "Fix leaking geyser",
        description:
          "The geyser in my flat is leaking water. Need a plumber to diagnose and repair.",
        trade: "Plumbing",
        city: "Johannesburg",
        address: "12 Oxford Road, Rosebank, Johannesburg",
        locationLat: -26.1438,
        locationLng: 28.0412,
        needsConsultation: false,
        travelFeeAccepted: true,
        status: JobStatus.open,
      },
      {
        customer_id: customer.id,
        title: "Install new electrical wiring",
        description:
          "Need a certified electrician to rewire the kitchen and install new sockets.",
        trade: "Electrical",
        city: "Pretoria",
        address: "44 Main Street, Pretoria Central",
        locationLat: -25.7479,
        locationLng: 28.2293,
        needsConsultation: true,
        travelFeeAccepted: false,
        status: JobStatus.open,
      },
      {
        customer_id: customer.id,
        title: "Paint living room and hallway",
        description:
          "Interior painting of two rooms. Need quotes for labour and materials.",
        trade: "Painting",
        city: "Cape Town",
        address: "9 Long Street, Cape Town CBD",
        locationLat: -33.9249,
        locationLng: 18.4241,
        needsConsultation: false,
        travelFeeAccepted: true,
        status: JobStatus.open,
      },
      {
        customer_id: customer.id,
        title: "Build a wooden deck",
        description:
          "Approx. 20sqm deck in the backyard. Must be built to spec.",
        trade: "Carpentry",
        city: "Johannesburg",
        address: "77 Jan Smuts Avenue, Parktown, Johannesburg",
        locationLat: -26.1846,
        locationLng: 28.0338,
        needsConsultation: true,
        travelFeeAccepted: true,
        status: JobStatus.open,
      },
      {
        customer_id: customer.id,
        title: "Install tiling in bathroom",
        description: "Floor and wall tiling for a standard bathroom.",
        trade: "Tiling",
        city: "Pretoria",
        address: "3 Lynnwood Road, Pretoria East",
        locationLat: -25.7667,
        locationLng: 28.2833,
        needsConsultation: false,
        travelFeeAccepted: false,
        status: JobStatus.open,
      },
    ];

    for (const job of sampleJobs) {
      await prisma.job.create({ data: job });
    }

    console.log(`✅ Created ${sampleJobs.length} sample jobs.`);
  } else {
    console.log(`ℹ️  Jobs already exist (${jobCount}). Skipping job seeding.`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });