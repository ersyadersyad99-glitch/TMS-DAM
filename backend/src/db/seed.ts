import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db } from './index.js';
import { clients, drivers, fleet, locations, users } from './schema/index.js';
import { auth } from '../auth/index.js';

async function seed() {
  console.log('🌱 Starting database seed...');

  // 1. Seed Users via Better Auth
  console.log('Seeding users...');
  const userSeeds = [
    { name: 'Admin Utama', email: 'admin@tms.id', password: 'adminpassword123', role: 'admin' },
    { name: 'Rudi Dispatcher', email: 'dispatcher@tms.id', password: 'rudipassword123', role: 'dispatcher' },
    { name: 'Siti Finance', email: 'finance@tms.id', password: 'sitipassword123', role: 'finance' },
    { name: 'Andi Viewer', email: 'viewer@tms.id', password: 'andipassword123', role: 'viewer' },
  ];

  for (const u of userSeeds) {
    try {
      const created = await auth.api.signUpEmail({
        body: { name: u.name, email: u.email, password: u.password },
      });
      if (created?.user?.id) {
        await db.update(users).set({ role: u.role }).where(eq(users.id, created.user.id));
      }
    } catch {
      console.log(`User ${u.email} already exists or skipping creation.`);
    }
  }

  // 2. Seed Clients
  console.log('Seeding clients...');
  await db.insert(clients).values([
    { name: 'PT Sinar Makmur', contact: '0812-3456-7890', address: 'Jl. Sudirman No.1, Jakarta' },
    { name: 'CV Maju Bersama', contact: '0822-9876-5432', address: 'Jl. Gatot Subroto No.5, Bandung' },
    { name: 'UD Berkah Jaya', contact: '0811-1234-5678', address: 'Jl. Pemuda No.12, Surabaya' },
    { name: 'PT Trans Nusantara', contact: '0831-5555-6666', address: 'Jl. Ahmad Yani No.99, Medan' },
  ]).onConflictDoNothing();

  // 3. Seed Drivers
  console.log('Seeding drivers...');
  await db.insert(drivers).values([
    { name: 'Budi Santoso', phone: '0812-1111-2222', license: 'B1 Umum', status: 'available' },
    { name: 'Agus Prasetyo', phone: '0813-3333-4444', license: 'B2 Umum', status: 'on_trip' },
    { name: 'Hendra Gunawan', phone: '0814-5555-6666', license: 'B1 Umum', status: 'available' },
    { name: 'Rizky Firmansyah', phone: '0815-7777-8888', license: 'B2 Umum', status: 'available' },
    { name: 'Doni Setiawan', phone: '0816-9999-0000', license: 'B1 Umum', status: 'off' },
  ]).onConflictDoNothing();

  // 4. Seed Fleet
  console.log('Seeding fleet...');
  await db.insert(fleet).values([
    { plate: 'B 1234 XY', type: 'Truk Engkel', capacity: '4 Ton', status: 'available' },
    { plate: 'D 5678 AB', type: 'Truk Fuso', capacity: '8 Ton', status: 'on_trip' },
    { plate: 'L 9012 CD', type: 'Truk Tronton', capacity: '15 Ton', status: 'available' },
    { plate: 'B 3456 EF', type: 'Truk Engkel', capacity: '4 Ton', status: 'maintenance' },
    { plate: 'K 7890 GH', type: 'Truk Wingbox', capacity: '10 Ton', status: 'available' },
  ]).onConflictDoNothing();

  // 5. Seed Locations
  console.log('Seeding locations...');
  await db.insert(locations).values([
    { province: 'DKI Jakarta', city: 'Jakarta Selatan', store: 'Gudang Utama JKT' },
    { province: 'DKI Jakarta', city: 'Jakarta Pusat', store: 'Gudang Utama JKT' },
    { province: 'Jawa Barat', city: 'Bandung', store: 'Agen Bandung Raya' },
    { province: 'Jawa Tengah', city: 'Semarang', store: 'Distributor Semarang' },
    { province: 'Jawa Timur', city: 'Surabaya', store: 'Gudang Surabaya Pusat' },
    { province: 'Sumatera Utara', city: 'Medan', store: 'Depo Sumatera' },
    { province: 'Kalimantan Timur', city: 'Balikpapan', store: 'Depo Kalimantan' },
  ]).onConflictDoNothing();

  console.log('✅ Seed completed successfully!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
