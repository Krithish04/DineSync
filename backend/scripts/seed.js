require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/config/db.config');
const User = require('../src/features/auth/auth.model');
const Restaurant = require('../src/features/tenant/tenant.model');
const Category = require('../src/features/category/category.model');
const MenuItem = require('../src/features/menu/menuItem.model');
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

const SEED_CATEGORIES = [
  { name: 'Starters', displayOrder: 1, description: 'Crispy appetizers & tandoori starters' },
  { name: 'Main Course', displayOrder: 2, description: 'Rich curries & gravies' },
  { name: 'Breads', displayOrder: 3, description: 'Freshly baked tandoori breads & rotis' },
  { name: 'Rice & Biryani', displayOrder: 4, description: 'Aromatic basmati rice & dum biryanis' },
  { name: 'Desserts', displayOrder: 5, description: 'Traditional Indian sweets & desserts' },
  { name: 'Beverages', displayOrder: 6, description: 'Refreshing drinks & classic teas' },
];

const SEED_MENU_ITEMS = [
  // Starters (4)
  {
    categoryName: 'Starters',
    name: 'Fresh Garden Salad',
    description: 'Crisp lettuce, cucumbers, cherry tomatoes, and bell peppers drizzled with lemon mint vinaigrette.',
    shortDescription: 'Fresh crisp garden vegetable salad with mint dressing',
    price: 190,
    costPrice: 50,
    gst: 5,
    preparationTime: 10,
    kitchenStation: 'Cold Pantry',
    dietaryType: 'veg',
    spiceLevel: 'none',
    isAvailable: true,
    isFeatured: true,
    isRecommended: true,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=500&q=80',
    dietaryTags: ['healthy', 'low_calorie', 'salad', 'gluten_free'],
    allergens: [],
  },
  {
    categoryName: 'Starters',
    name: 'Paneer Tikka',
    description: 'Cubes of cottage cheese marinated in spiced yogurt and grilled in a clay oven.',
    shortDescription: 'Tandoori grilled cottage cheese cubes',
    price: 220,
    costPrice: 80,
    gst: 5,
    preparationTime: 15,
    kitchenStation: 'Tandoor',
    dietaryType: 'veg',
    spiceLevel: 'medium',
    isAvailable: true,
    isFeatured: true,
    isRecommended: true,
    image: null,
  },
  {
    categoryName: 'Starters',
    name: 'Chicken 65',
    description: 'Spicy, deep-fried chicken bites tossed with curry leaves, chilies, and tangy spices.',
    shortDescription: 'Spicy fried chicken bites with curry leaves',
    price: 260,
    costPrice: 95,
    gst: 5,
    preparationTime: 15,
    kitchenStation: 'Main Kitchen',
    dietaryType: 'non-veg',
    spiceLevel: 'hot',
    isAvailable: true,
    isFeatured: false,
    isRecommended: true,
    image: null,
  },
  {
    categoryName: 'Starters',
    name: 'Veg Spring Rolls',
    description: 'Crispy rolled pastry sheets stuffed with seasoned julienned vegetables.',
    shortDescription: 'Crispy vegetable stuffed pastry rolls',
    price: 180,
    costPrice: 65,
    gst: 5,
    preparationTime: 12,
    kitchenStation: 'Main Kitchen',
    dietaryType: 'veg',
    spiceLevel: 'mild',
    isAvailable: true,
    isFeatured: false,
    isRecommended: false,
    image: null,
  },
  {
    categoryName: 'Starters',
    name: 'Tandoori Mushroom',
    description: 'Fresh button mushrooms marinated in aromatic herbs and roasted over charcoal.',
    shortDescription: 'Charcoal roasted spiced button mushrooms',
    price: 210,
    costPrice: 75,
    gst: 5,
    preparationTime: 15,
    kitchenStation: 'Tandoor',
    dietaryType: 'veg',
    spiceLevel: 'medium',
    isAvailable: true,
    isFeatured: false,
    isRecommended: false,
    image: null,
  },

  // Main Course (6)
  {
    categoryName: 'Main Course',
    name: 'Butter Chicken',
    description: 'Tender tandoori chicken simmered in a velvety tomato, cream, and butter gravy.',
    shortDescription: 'Classic chicken in velvety tomato butter gravy',
    price: 340,
    costPrice: 125,
    gst: 5,
    preparationTime: 20,
    kitchenStation: 'Main Kitchen',
    dietaryType: 'non-veg',
    spiceLevel: 'mild',
    isAvailable: true,
    isFeatured: true,
    isRecommended: true,
    image: null,
  },
  {
    categoryName: 'Main Course',
    name: 'Paneer Butter Masala',
    description: 'Fresh cottage cheese cubes cooked in a rich, creamy, and mildly sweet tomato gravy.',
    shortDescription: 'Cottage cheese in rich creamy tomato gravy',
    price: 300,
    costPrice: 110,
    gst: 5,
    preparationTime: 18,
    kitchenStation: 'Main Kitchen',
    dietaryType: 'veg',
    spiceLevel: 'mild',
    isAvailable: true,
    isFeatured: false,
    isRecommended: true,
    image: null,
  },
  {
    categoryName: 'Main Course',
    name: 'Dal Makhani',
    description: 'Slow-cooked whole black lentils and kidney beans simmered overnight with cream and butter.',
    shortDescription: 'Slow-cooked creamy black lentil curry',
    price: 240,
    costPrice: 85,
    gst: 5,
    preparationTime: 20,
    kitchenStation: 'Main Kitchen',
    dietaryType: 'veg',
    spiceLevel: 'mild',
    isAvailable: true,
    isFeatured: false,
    isRecommended: true,
    image: null,
  },
  {
    categoryName: 'Main Course',
    name: 'Kadai Chicken',
    description: 'Succulent chicken pieces cooked with coarse ground spices, capsicum, and fresh onions.',
    shortDescription: 'Spicy chicken with bell peppers and wok spices',
    price: 320,
    costPrice: 115,
    gst: 5,
    preparationTime: 20,
    kitchenStation: 'Main Kitchen',
    dietaryType: 'non-veg',
    spiceLevel: 'hot',
    isAvailable: true,
    isFeatured: false,
    isRecommended: false,
    image: null,
  },
  {
    categoryName: 'Main Course',
    name: 'Chana Masala',
    description: 'Tender chickpeas simmered in a tangy onion-tomato masala spiced with Indian herbs.',
    shortDescription: 'Tangy spiced chickpea curry',
    price: 220,
    costPrice: 75,
    gst: 5,
    preparationTime: 15,
    kitchenStation: 'Main Kitchen',
    dietaryType: 'vegan',
    spiceLevel: 'medium',
    isAvailable: true,
    isFeatured: false,
    isRecommended: false,
    image: null,
  },
  {
    categoryName: 'Main Course',
    name: 'Palak Paneer',
    description: 'Soft cottage cheese cubes cooked in a vibrant green spinach puree tempered with garlic.',
    shortDescription: 'Cottage cheese in smooth spiced spinach gravy',
    price: 280,
    costPrice: 100,
    gst: 5,
    preparationTime: 18,
    kitchenStation: 'Main Kitchen',
    dietaryType: 'veg',
    spiceLevel: 'mild',
    isAvailable: true,
    isFeatured: false,
    isRecommended: false,
    image: null,
  },

  // Breads (3)
  {
    categoryName: 'Breads',
    name: 'Butter Naan',
    description: 'Leavened Indian flatbread baked in tandoor and brushed generously with butter.',
    shortDescription: 'Soft tandoori flatbread brushed with butter',
    price: 60,
    costPrice: 20,
    gst: 5,
    preparationTime: 8,
    kitchenStation: 'Tandoor',
    dietaryType: 'veg',
    spiceLevel: 'none',
    isAvailable: true,
    isFeatured: false,
    isRecommended: true,
    image: null,
  },
  {
    categoryName: 'Breads',
    name: 'Garlic Naan',
    description: 'Soft tandoori naan topped with minced garlic, fresh coriander, and melted butter.',
    shortDescription: 'Garlic and coriander infused tandoori bread',
    price: 70,
    costPrice: 25,
    gst: 5,
    preparationTime: 8,
    kitchenStation: 'Tandoor',
    dietaryType: 'veg',
    spiceLevel: 'mild',
    isAvailable: true,
    isFeatured: false,
    isRecommended: true,
    image: null,
  },
  {
    categoryName: 'Breads',
    name: 'Tandoori Roti',
    description: 'Whole wheat flatbread baked crispy inside a traditional clay tandoor.',
    shortDescription: 'Traditional clay oven whole wheat flatbread',
    price: 40,
    costPrice: 12,
    gst: 5,
    preparationTime: 6,
    kitchenStation: 'Tandoor',
    dietaryType: 'veg',
    spiceLevel: 'none',
    isAvailable: true,
    isFeatured: false,
    isRecommended: false,
    image: null,
  },

  // Rice & Biryani (4)
  {
    categoryName: 'Rice & Biryani',
    name: 'Chicken Biryani',
    description: 'Fragrant basmati rice layered with marinated chicken, saffron, caramelised onions, and mint.',
    shortDescription: 'Dum cooked chicken and fragrant basmati rice',
    price: 320,
    costPrice: 120,
    gst: 5,
    preparationTime: 25,
    kitchenStation: 'Main Kitchen',
    dietaryType: 'non-veg',
    spiceLevel: 'medium',
    isAvailable: true,
    isFeatured: true,
    isRecommended: true,
    image: null,
  },
  {
    categoryName: 'Rice & Biryani',
    name: 'Veg Biryani',
    description: 'Basmati rice cooked on dum with garden fresh vegetables, whole spices, and rose essence.',
    shortDescription: 'Fragrant rice dish layered with garden vegetables',
    price: 260,
    costPrice: 90,
    gst: 5,
    preparationTime: 22,
    kitchenStation: 'Main Kitchen',
    dietaryType: 'veg',
    spiceLevel: 'medium',
    isAvailable: true,
    isFeatured: false,
    isRecommended: true,
    image: null,
  },
  {
    categoryName: 'Rice & Biryani',
    name: 'Jeera Rice',
    description: 'Steamed basmati rice tempered with aromatic cumin seeds and clarified butter.',
    shortDescription: 'Steamed basmati rice tempered with cumin seeds',
    price: 150,
    costPrice: 50,
    gst: 5,
    preparationTime: 12,
    kitchenStation: 'Main Kitchen',
    dietaryType: 'veg',
    spiceLevel: 'none',
    isAvailable: true,
    isFeatured: false,
    isRecommended: false,
    image: null,
  },
  {
    categoryName: 'Rice & Biryani',
    name: 'Mutton Biryani',
    description: 'Tender mutton chunks slow-cooked with basmati rice, whole spices, and ghee.',
    shortDescription: 'Spicy slow-cooked mutton dum biryani',
    price: 380,
    costPrice: 145,
    gst: 5,
    preparationTime: 25,
    kitchenStation: 'Main Kitchen',
    dietaryType: 'non-veg',
    spiceLevel: 'hot',
    isAvailable: true,
    isFeatured: false,
    isRecommended: true,
    image: null,
  },

  // Desserts (3)
  {
    categoryName: 'Desserts',
    name: 'Gulab Jamun',
    description: 'Soft, fried milk-solid dumplings soaked in warm cardamom and rose scented sugar syrup.',
    shortDescription: 'Warm fried milk dumplings in cardamom syrup',
    price: 120,
    costPrice: 40,
    gst: 5,
    preparationTime: 10,
    kitchenStation: 'Dessert',
    dietaryType: 'veg',
    spiceLevel: 'none',
    isAvailable: true,
    isFeatured: true,
    isRecommended: true,
    image: null,
  },
  {
    categoryName: 'Desserts',
    name: 'Rasmalai',
    description: 'Flattened cottage cheese patties soaked in chilled, saffron and pistachio flavored milk.',
    shortDescription: 'Chilled soft cottage cheese patties in saffron milk',
    price: 140,
    costPrice: 50,
    gst: 5,
    preparationTime: 10,
    kitchenStation: 'Dessert',
    dietaryType: 'veg',
    spiceLevel: 'none',
    isAvailable: true,
    isFeatured: false,
    isRecommended: true,
    image: null,
  },
  {
    categoryName: 'Desserts',
    name: 'Chocolate Brownie',
    description: 'Warm, gooey chocolate fudge brownie served with a drizzle of chocolate sauce.',
    shortDescription: 'Warm dark chocolate fudge brownie',
    price: 160,
    costPrice: 55,
    gst: 5,
    preparationTime: 12,
    kitchenStation: 'Dessert',
    dietaryType: 'veg',
    spiceLevel: 'none',
    isAvailable: true,
    isFeatured: false,
    isRecommended: false,
    image: null,
  },

  // Beverages (2)
  {
    categoryName: 'Beverages',
    name: 'Masala Chai',
    description: 'Freshly brewed milk tea infused with cardamom, ginger, cloves, and cinnamon.',
    shortDescription: 'Traditional spiced Indian milk tea',
    price: 40,
    costPrice: 12,
    gst: 5,
    preparationTime: 8,
    kitchenStation: 'Beverage',
    dietaryType: 'veg',
    spiceLevel: 'none',
    isAvailable: true,
    isFeatured: false,
    isRecommended: false,
    image: null,
  },
  {
    categoryName: 'Beverages',
    name: 'Fresh Lime Soda',
    description: 'Chilled sparkling soda served with freshly squeezed lime, mint, and black salt.',
    shortDescription: 'Refreshing chilled lime soda with mint',
    price: 80,
    costPrice: 25,
    gst: 5,
    preparationTime: 5,
    kitchenStation: 'Beverage',
    dietaryType: 'vegan',
    spiceLevel: 'none',
    isAvailable: true,
    isFeatured: false,
    isRecommended: true,
    image: null,
  },
];

async function seed() {
  console.log('[Seed] Starting database seed process...');
  await connectDB();

  const session = await mongoose.startSession();

  try {
    let demoRestaurant;
    let createdUserList = [];
    let createdCategoryMap = {};
    let createdCategoryList = [];
    let createdMenuItemList = [];

    await session.withTransaction(async () => {
      // 1. Cleanup existing demo restaurant & associated resources (Idempotency)
      const existingRestaurant = await Restaurant.findOne({
        $or: [{ slug: DEMO_SLUG }, { name: 'Demo Restaurant' }],
      }).session(session);

      if (existingRestaurant) {
        console.log(`[Seed] Found existing demo restaurant (${existingRestaurant._id}). Cleaning up...`);
        await User.deleteMany({ restaurant: existingRestaurant._id }).session(session);
        await Category.deleteMany({ restaurant: existingRestaurant._id }).session(session);
        await MenuItem.deleteMany({ restaurant: existingRestaurant._id }).session(session);
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

      // 5. Seed 6 Categories
      for (const cat of SEED_CATEGORIES) {
        const [category] = await Category.create(
          [
            {
              restaurant: demoRestaurant._id,
              name: cat.name,
              description: cat.description,
              displayOrder: cat.displayOrder,
              isActive: true,
            },
          ],
          { session }
        );

        createdCategoryList.push(category);
        createdCategoryMap[cat.name] = category._id;
      }
      console.log(`[Seed] Created ${createdCategoryList.length} Categories.`);

      // 6. Seed 22 Menu Items
      for (const item of SEED_MENU_ITEMS) {
        const categoryId = createdCategoryMap[item.categoryName];
        if (!categoryId) continue;

        const itemPayload = {
          restaurant: demoRestaurant._id,
          category: categoryId,
          name: item.name,
          description: item.description,
          shortDescription: item.shortDescription,
          price: item.price,
          costPrice: item.costPrice,
          gst: item.gst,
          preparationTime: item.preparationTime,
          kitchenStation: item.kitchenStation,
          dietaryType: item.dietaryType,
          spiceLevel: item.spiceLevel,
          isAvailable: item.isAvailable,
          isFeatured: item.isFeatured,
          isRecommended: item.isRecommended,
          image: item.image,
        };

        const [createdItem] = await MenuItem.create([itemPayload], { session });
        createdMenuItemList.push(createdItem);
      }
      console.log(`[Seed] Created ${createdMenuItemList.length} Menu Items.`);
    });

    console.log('[Seed] Database seeding completed successfully!\n');

    // 7. Console Log Clean Credential & Resource Summary Table
    console.table(
      createdUserList.map((user) => ({
        Role: user.role,
        Email: user.email,
        Password: DEMO_PASSWORD,
        'Restaurant ID': user.restaurant ? user.restaurant.toString() : 'N/A (Global)',
        'Restaurant Slug': user.restaurant ? demoRestaurant.slug : 'N/A',
      }))
    );

    console.log('[Seed] Menu Seeding Summary:');
    console.log(`- Total Categories Created: ${createdCategoryList.length}`);
    console.log(`- Total Menu Items Created: ${createdMenuItemList.length}\n`);

    console.log('[Seed] Login Quick-Reference:');
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
