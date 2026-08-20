import { PrismaClient, Role, JobStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('[BE2] Seeding is not allowed in production.');
    process.exit(1);
  }

  console.log('[BE2] Seeding database...');

  // ----- Admin and test users (same as before) -----
  const adminPassword = await bcrypt.hash('Admin@2026', 10);
  const customerPassword = await bcrypt.hash('Customer@123', 10);
  const contractorPassword = await bcrypt.hash('Contractor@123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@skilledsa.co.za' },
    update: {},
    create: {
      email: 'admin@skilledsa.co.za',
      password_hash: adminPassword,
      role: Role.admin,
      full_name: 'System Admin',
      popia_consent: true,
      verification_status: 'verified',
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@test.com' },
    update: {},
    create: {
      email: 'customer@test.com',
      password_hash: customerPassword,
      role: Role.customer,
      full_name: 'Test Customer',
      phone: '+27821234567',
      popia_consent: true,
    },
  });

  const contractor = await prisma.user.upsert({
    where: { email: 'contractor@test.com' },
    update: {},
    create: {
      email: 'contractor@test.com',
      password_hash: contractorPassword,
      role: Role.contractor,
      full_name: 'Test Contractor',
      phone: '+27827654321',
      popia_consent: true,
    },
  });

  // Verification request for contractor
  await prisma.verificationRequest.upsert({
    where: { user_id: contractor.id },
    update: {},
    create: {
      user_id: contractor.id,
      role: Role.contractor,
      id_photo_url: 'https://example.com/id.jpg',
      selfie_url: 'https://example.com/selfie.jpg',
      certificate_url: 'https://example.com/cert.pdf',
      status: 'pending',
    },
  });

  console.log('[BE2] Created admin and test users.');

  // ----- Create sample jobs -----
  const sampleJobs = [
    {
      customerId: customer.id,
      title: 'Fix leaking geyser',
      description: 'The geyser in my flat is leaking water. Need a plumber to diagnose and repair.',
      trade: 'Plumbing',
      photos: ['https://example.com/photo1.jpg'],
      locationLat: -26.2041,
      locationLng: 28.0473,
      needsConsultation: false,
      travelFeeAccepted: true,
      status: JobStatus.open,
    },
    {
      customerId: customer.id,
      title: 'Install new electrical wiring',
      description: 'Need a certified electrician to rewire the kitchen and install new sockets.',
      trade: 'Electrical',
      photos: ['https://example.com/photo2.jpg'],
      locationLat: -26.1936,
      locationLng: 28.0584,
      needsConsultation: true,
      travelFeeAccepted: false,
      status: JobStatus.open,
    },
    {
      customerId: customer.id,
      title: 'Paint living room and hallway',
      description: 'Interior painting of two rooms. Need quotes for labour and materials.',
      trade: 'Painting',
      photos: ['https://example.com/photo3.jpg'],
      locationLat: -26.2100,
      locationLng: 28.0400,
      needsConsultation: false,
      travelFeeAccepted: true,
      status: JobStatus.open,
    },
    {
      customerId: customer.id,
      title: 'Build a wooden deck',
      description: 'Approx. 20sqm deck in the backyard. Must be built to spec.',
      trade: 'Carpentry',
      photos: ['https://example.com/photo4.jpg'],
      locationLat: -26.2175,
      locationLng: 28.0350,
      needsConsultation: true,
      travelFeeAccepted: true,
      status: JobStatus.open,
    },
    {
      customerId: customer.id,
      title: 'Install tiling in bathroom',
      description: 'Floor and wall tiling for a standard bathroom.',
      trade: 'Tiling',
      photos: ['https://example.com/photo5.jpg'],
      locationLat: -26.1950,
      locationLng: 28.0500,
      needsConsultation: false,
      travelFeeAccepted: false,
      status: JobStatus.open,
    },
  ];

  for (const jobData of sampleJobs) {
    // Use raw Prisma to insert with geography point
    const { locationLat, locationLng, ...rest } = jobData;
    // Build geography point from lat/lng
    const location = locationLat && locationLng
      ? `SRID=4326;POINT(${locationLng} ${locationLat})`
      : null;

    await prisma.$executeRaw`
      INSERT INTO "Job" (
        "id", "customerId", "title", "description", "trade", "photos",
        "location", "locationLat", "locationLng", "needsConsultation",
        "travelFeeAccepted", "status", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), ${rest.customerId}, ${rest.title}, ${rest.description},
        ${rest.trade}, ${rest.photos}::text[],
        ST_GeomFromText(${location}, 4326)::geography,
        ${locationLat}, ${locationLng},
        ${rest.needsConsultation}, ${rest.travelFeeAccepted},
        ${rest.status}::"JobStatus", NOW(), NOW()
      )
    `;
    console.log(`[BE2] Created job: ${rest.title}`);
  }

  console.log('[BE2] Seeding complete.');
}

main()
  .catch((e) => {
    console.error('[BE2] ❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });