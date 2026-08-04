require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/config/db.config');
const User = require('../src/features/auth/auth.model');
const Restaurant = require('../src/features/tenant/tenant.model');
const { ROLES } = require('../src/constants/roles.constant');

const DEMO_PASSWORD = 'Demo@1234';
const DEMO_SLUG = 'demo-restaurant';

const SEED_USERS = [
  {
    name: 'Demo Owner',
    email: 'owner@demo.dinesync.ai',
    password: DEMO_PASSWORD,
    phone: '+919876543210',
    role: ROLES.OWNER,
    isTenantScoped: true,
  },
  {
    name: 'Demo Manager',
    email: 'manager@demo.dinesync.ai',
    password: DEMO_PASSWORD,
    phone: '+919876543211',
    role: ROLES.MANAGER,
    isTenantScoped: true,
  },
  {
    name: 'Demo Staff',
    email: 'staff@demo.dinesync.ai',
    password: DEMO_PASSWORD,
    phone: '+919876543212',
    role: ROLES.STAFF,
    isTenantScoped: true,
  },
  {
    name: 'Demo Chef',
    email: 'chef@demo.dinesync.ai',
    password: DEMO_PASSWORD,
    phone: '+919876543213',
    role: ROLES.CHEF,
    isTenantScoped: true,
  },
  {
    name: 'Platform Super Admin',
    email: 'admin@dinesync.ai',
    password: DEMO_PASSWORD,
    phone: '+919876543299',
    role: ROLES.SUPER_ADMIN,
    isTenantScoped: false,
  },
];

async function seed() {
  console.log('[Seed] Starting database seed process...');
  await connectDB();

  const session = await mongoose.startSession();

  try {
    let demoRestaurant;
    let createdUserList = [];

    await session.withTransaction(async () => {
      // 1. Cleanup existing demo restaurant & associated users if present (Idempotency)
      const existingRestaurant = await Restaurant.findOne({
        $or: [{ slug: DEMO_SLUG }, { name: 'Demo Restaurant' }],
      }).session(session);

      if (existingRestaurant) {
        console.log(`[Seed] Found existing demo restaurant (${existingRestaurant._id}). Cleaning up...`);
        await User.deleteMany({ restaurant: existingRestaurant._id }).session(session);
        await Restaurant.deleteOne({ _id: existingRestaurant._id }).session(session);
      }

      // Cleanup platform super admin if present
      await User.deleteMany({ email: 'admin@dinesync.ai' }).session(session);

      // 2. Create Demo Restaurant
      const [restaurant] = await Restaurant.create(
        [
          {
            name: 'Demo Restaurant',
            slug: DEMO_SLUG,
            address: '123 Tech Park Ave, Gourmet City',
            phone: '+919876543210',
            description: 'Demo Restaurant for DineSync AI Portal Testing',
            settings: {
              currency: 'INR',
              timezone: 'Asia/Kolkata',
              orderPrefix: 'ORD',
              allowOnlineOrders: true,
              allowTableReservations: true,
              taxEnabled: true,
              staffCanEditMenu: true,
            },
          },
        ],
        { session }
      );

      demoRestaurant = restaurant;
      console.log(`[Seed] Created Demo Restaurant ID: ${demoRestaurant._id} (Slug: ${demoRestaurant.slug})`);

      // 3. Create Seed Users
      let ownerUser = null;

      for (const u of SEED_USERS) {
        // Skip chef if role is somehow undefined in ROLES constant
        if (u.role === 'chef' && !ROLES.CHEF) continue;

        const userPayload = {
          name: u.name,
          email: u.email,
          password: u.password,
          phone: u.phone,
          role: u.role,
          isEmailVerified: true,
          isActive: true,
          restaurant: u.isTenantScoped ? demoRestaurant._id : null,
        };

        // User.create with array inside transaction
        const [created] = await User.create([userPayload], { session });
        createdUserList.push(created);

        if (u.role === ROLES.OWNER) {
          ownerUser = created;
        }
      }

      // 4. Link Owner ID back to Restaurant
      if (ownerUser) {
        demoRestaurant.owner = ownerUser._id;
        await demoRestaurant.save({ session });
      }
    });

    console.log('[Seed] Database seeding completed successfully!\n');

    // 5. Console Log Clean Credential Table
    console.table(
      createdUserList.map((user) => ({
        Role: user.role,
        Email: user.email,
        Password: DEMO_PASSWORD,
        'Restaurant ID': user.restaurant ? user.restaurant.toString() : 'N/A (Global)',
        'Restaurant Slug': user.restaurant ? demoRestaurant.slug : 'N/A',
      }))
    );

    console.log('\n[Seed] Login Quick-Reference:');
    console.log(`- Restaurant Team (/login/restaurant): Restaurant ID = ${demoRestaurant._id}`);
    console.log(`- Kitchen Display KDS (/login/kitchen): Restaurant ID = ${demoRestaurant._id}`);
    console.log(`- Platform Admin (/login/admin): Email = admin@dinesync.ai\n`);
  } catch (error) {
    console.error('[Seed] Database seeding failed:', error);
    process.exitCode = 1;
  } finally {
    session.endSession();
    await disconnectDB();
    console.log('[Seed] Disconnected from database.');
  }
}

seed();
