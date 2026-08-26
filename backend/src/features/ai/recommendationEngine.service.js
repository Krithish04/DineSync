const MenuItem = require('../menu/menuItem.model');
const Order = require('../order/order.model');
const Recipe = require('../inventory/recipe.model');
const Ingredient = require('../inventory/ingredient.model');

const MOOD_MAP = {
  happy: { tags: ['popular', 'desserts', 'beverages'], prepMax: 30, text: 'upbeat & tasty treats' },
  sad: { tags: ['comfort', 'rich', 'dessert'], spiceMin: 'none', text: 'warm & comforting delights' },
  tired: { tags: ['comfort', 'rich', 'quick'], prepMax: 15, text: 'filling & energizing comfort food' },
  stressed: { tags: ['comfort', 'rich', 'sweet'], text: 'soothing & indulgent comfort dishes' },
  romantic: { tags: ['special', 'starter', 'dessert'], text: 'rich & elegant choices' },
  celebrating: { tags: ['featured', 'rich', 'special'], text: 'festive & celebratory specials' },
  hungry: { tags: ['main_course', 'rich', 'biryani'], prepMax: 25, text: 'hearty & satisfying meals' },
  healthy: { tags: ['healthy', 'low_calorie', 'salad'], text: 'nutritious & fresh options' },
  'comfort food': { tags: ['comfort', 'biryani', 'curry', 'dessert'], text: 'classic soul-satisfying dishes' },
  adventurous: { tags: ['exotic', 'spicy', 'chef_special'], text: 'exciting & unique flavors' },
  'spicy craving': { spiceLevel: ['medium', 'hot'], text: 'fiery & bold spicy dishes' },
  'sweet craving': { tags: ['dessert', 'beverage', 'sweet'], text: 'delicious sweet treats' },
  'light meal': { tags: ['starter', 'soup', 'salad'], prepMax: 15, text: 'light & breezy bites' },
  'quick meal': { prepMax: 15, text: 'quick-to-serve delicious dishes' },
  'post workout': { tags: ['high_protein', 'healthy', 'chicken'], text: 'high protein muscle recovery meals' },
  'hangover': { tags: ['soup', 'comfort', 'beverage'], prepMax: 15, text: 'refreshing & soothing recovery broth' },
  'cheat day': { tags: ['biryani', 'rich', 'dessert'], text: 'indulgent feast favorites' },
  'late night': { prepMax: 15, tags: ['starter', 'snack'], text: 'quick & satisfying late night bites' },
};

/**
 * Normalizes input allergen names to standard key tokens
 */
const normalizeAllergen = (aStr) => {
  const clean = (aStr || '').toLowerCase().trim();
  if (clean.includes('peanut')) return 'peanuts';
  if (clean.includes('tree nut') || clean.includes('nut')) return 'tree_nuts';
  if (clean.includes('dairy') || clean.includes('milk') || clean.includes('cheese') || clean.includes('butter') || clean.includes('paneer')) return 'dairy';
  if (clean.includes('egg')) return 'eggs';
  if (clean.includes('soy')) return 'soy';
  if (clean.includes('wheat') || clean.includes('gluten')) return 'wheat';
  if (clean.includes('fish')) return 'fish';
  if (clean.includes('shellfish')) return 'shellfish';
  if (clean.includes('sesame')) return 'sesame';
  return clean;
};

/**
 * Checks if a menu item contains specific allergens via DB metadata or ingredient recipe mapping
 */
const isItemSafeFromAllergens = (item, recipeMap, ingredientMap, targetAllergens) => {
  if (!targetAllergens || targetAllergens.length === 0) return { safe: true, warning: false };

  const normTarget = targetAllergens.map(normalizeAllergen);

  // 1. Check item explicit allergens array & tags
  const itemAllergens = (item.allergens || []).map(normalizeAllergen);
  const itemDesc = (item.description || '').toLowerCase();
  const itemName = (item.name || '').toLowerCase();

  for (const allergen of normTarget) {
    if (itemAllergens.includes(allergen)) {
      return { safe: false, reason: `Contains ${allergen}` };
    }
    // Keyword check in item name or description
    if (allergen === 'peanuts' && (itemName.includes('peanut') || itemDesc.includes('peanut'))) return { safe: false };
    if (allergen === 'dairy' && (itemName.includes('butter') || itemName.includes('paneer') || itemDesc.includes('cheese') || itemDesc.includes('cream'))) return { safe: false };
    if (allergen === 'eggs' && (itemName.includes('egg') || itemDesc.includes('egg'))) return { safe: false };
  }

  // 2. Check mapped recipe ingredients
  const recipe = recipeMap.get(item._id.toString());
  let ingredientDataPresent = item.allergens?.length > 0 || item.ingredientsList?.length > 0 || !!recipe;

  if (recipe && recipe.ingredients) {
    for (const rIng of recipe.ingredients) {
      const ingDoc = ingredientMap.get(rIng.ingredient.toString());
      if (ingDoc) {
        const ingName = (ingDoc.ingredientName || '').toLowerCase();
        for (const allergen of normTarget) {
          if (ingName.includes(allergen)) {
            return { safe: false, reason: `Contains ingredient: ${ingDoc.ingredientName}` };
          }
        }
      }
    }
  }

  // If DB ingredient info is completely absent, mark with warning
  const warning = !ingredientDataPresent;

  return { safe: true, warning };
};

/**
 * Main Recommendation Pipeline Function
 */
const generateRecommendations = async ({
  restaurantId,
  customerId = null,
  mood = null,
  allergens = [],
  dietaryPreferences = [],
  maxBudget = null,
  trySomethingNew = false,
  searchQuery = null,
  limit = 4,
}) => {
  // 1. Fetch active menu items for restaurant
  const items = await MenuItem.find({ restaurant: restaurantId, isAvailable: true })
    .populate('category', 'name')
    .lean();

  if (!items || items.length === 0) {
    return { items: [], totalCount: 0, allergyNotice: null };
  }

  // 2. Load recipes & ingredients for allergen cross-checking
  const itemIds = items.map((i) => i._id);
  const recipes = await Recipe.find({ menuItem: { $in: itemIds } }).lean();
  const recipeMap = new Map(recipes.map((r) => [r.menuItem.toString(), r]));

  const allIngredientIds = [];
  recipes.forEach((r) => r.ingredients.forEach((ing) => allIngredientIds.push(ing.ingredient)));
  const ingredients = await Ingredient.find({ _id: { $in: allIngredientIds } }).lean();
  const ingredientMap = new Map(ingredients.map((i) => [i._id.toString(), i]));

  // 3. Load customer order history if customerId is provided
  let orderedItemNames = new Set();
  let favoriteCategoryIds = new Set();
  if (customerId) {
    const previousOrders = await Order.find({
      restaurant: restaurantId,
      customer: customerId,
      orderStatus: { $ne: 'Cancelled' },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    previousOrders.forEach((ord) => {
      (ord.items || []).forEach((it) => {
        orderedItemNames.add(it.itemName);
      });
    });
  }

  // Extract meaningful search tokens from searchQuery (stripping stop words)
  const STOP_WORDS = new Set(['i', 'want', 'some', 'give', 'me', 'a', 'an', 'please', 'what', 'should', 'eat', 'food', 'dish', 'dishes', 'recommend', 'show', 'find', 'for', 'to', 'is', 'are', 'the', 'with', 'and', 'or', 'can', 'you', 'got', 'something', 'like', 'have']);
  const rawTokens = (searchQuery || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
  const searchTokens = rawTokens.filter((t) => t.length >= 3 && !STOP_WORDS.has(t));

  const hasSearchMatches = searchTokens.length > 0 && items.some((it) => {
    const nameStr = (it.name || '').toLowerCase();
    const descStr = (it.description || '').toLowerCase();
    const catStr = (it.category?.name || '').toLowerCase();
    const tagsStr = (it.dietaryTags || []).join(' ').toLowerCase();
    return searchTokens.some((tok) => nameStr.includes(tok) || descStr.includes(tok) || catStr.includes(tok) || tagsStr.includes(tok));
  });

  // 4. Filtering Phase
  let candidateItems = [];
  let containsUncertainAllergenInfo = false;

  for (const item of items) {
    // E. Search Query Filter (Strict tokenized matching if search tokens exist in menu)
    if (hasSearchMatches) {
      const nameStr = (item.name || '').toLowerCase();
      const descStr = (item.description || '').toLowerCase();
      const catStr = (item.category?.name || '').toLowerCase();
      const tagsStr = (item.dietaryTags || []).join(' ').toLowerCase();
      const isMatch = searchTokens.some((tok) => nameStr.includes(tok) || descStr.includes(tok) || catStr.includes(tok) || tagsStr.includes(tok));
      if (!isMatch) continue; // Filter out non-matching items when search keyword matches exist
    }

    // A. Allergy Filter
    const allergenCheck = isItemSafeFromAllergens(item, recipeMap, ingredientMap, allergens);
    if (!allergenCheck.safe) continue;
    if (allergenCheck.warning) containsUncertainAllergenInfo = true;

    // B. Dietary Preferences Filter
    if (dietaryPreferences.length > 0) {
      const matchesDietary = dietaryPreferences.every((pref) => {
        const pNorm = pref.toLowerCase().trim();
        if (pNorm === 'veg' || pNorm === 'vegetarian') return item.dietaryType === 'veg' || item.dietaryType === 'vegan';
        if (pNorm === 'vegan') return item.dietaryType === 'vegan';
        if (pNorm === 'jain') return item.dietaryType === 'jain';
        if (pNorm === 'non-veg' || pNorm === 'non_veg') return item.dietaryType === 'non-veg';
        if (pNorm === 'spicy') return item.spiceLevel === 'medium' || item.spiceLevel === 'hot';
        if (pNorm === 'non-spicy' || pNorm === 'non_spicy') return item.spiceLevel === 'none' || item.spiceLevel === 'mild';
        // Tag check
        return (item.dietaryTags || []).map((t) => t.toLowerCase()).includes(pNorm);
      });
      if (!matchesDietary) continue;
    }

    // C. Budget Filter
    if (maxBudget && maxBudget > 0 && item.price > maxBudget) {
      continue;
    }

    // D. "Try Something New" Filter
    if (trySomethingNew && orderedItemNames.has(item.name)) {
      continue; // Skip items customer has already ordered
    }

    // Assign ranking score & AI explanation rationale
    let score = item.rating || 4.5;
    let reasons = [];

    // Mood boost
    if (mood) {
      const mNorm = mood.toLowerCase().trim();
      const mData = MOOD_MAP[mNorm];
      if (mData) {
        if (mData.prepMax && item.preparationTime <= mData.prepMax) {
          score += 1.5;
          reasons.push(`Fast prep (${item.preparationTime} mins)`);
        }
        if (mData.spiceLevel && mData.spiceLevel.includes(item.spiceLevel)) {
          score += 2.0;
          reasons.push(`Matches spicy craving`);
        }
        if (item.isRecommended || item.isFeatured) {
          score += 1.0;
        }
      }
    }

    // Novelty boost
    if (orderedItemNames.size > 0) {
      if (!orderedItemNames.has(item.name)) {
        score += 1.2;
        reasons.push('Something new to discover');
      } else {
        reasons.push('Based on your order history');
      }
    }

    // Price efficiency boost if budget specified
    if (maxBudget && maxBudget > 0) {
      reasons.push(`Fits budget (₹${item.price} <= ₹${maxBudget})`);
    }

    // Generate concise explanation text
    const whyRecommended = reasons.length > 0
      ? `Recommended because: ${reasons.join(', ')}.`
      : `Popular choice loved by our diners (${item.rating || 4.5}⭐).`;

    candidateItems.push({
      ...item,
      score,
      whyRecommended,
      allergenWarning: allergenCheck.warning,
      hasOrderedBefore: orderedItemNames.has(item.name),
    });
  }

  // Sort candidate items by calculated recommendation score descending
  candidateItems.sort((a, b) => b.score - a.score);

  // Take top requested limit
  const finalRecommendations = candidateItems.slice(0, limit);

  let allergyNotice = null;
  if (allergens.length > 0) {
    if (containsUncertainAllergenInfo) {
      allergyNotice = `I have excluded confirmed allergens (${allergens.join(', ')}). For items with unlisted ingredient details, please verify with restaurant staff before consuming.`;
    } else {
      allergyNotice = `Filtered out all items containing ${allergens.join(', ')} based on restaurant ingredient specifications.`;
    }
  }

  return {
    items: finalRecommendations,
    totalCount: finalRecommendations.length,
    allergyNotice,
  };
};

/**
 * Generates smart combo / add-on suggestions for a main dish item
 */
const getComboSuggestions = (mainItemName, allItems = []) => {
  if (!mainItemName) return [];
  const mainNorm = mainItemName.toLowerCase();

  const addons = [];
  if (mainNorm.includes('biryani') || mainNorm.includes('curry') || mainNorm.includes('paneer') || mainNorm.includes('chicken')) {
    addons.push({ comboTitle: 'Make it a Feast', addonName: 'Garlic Naan & Mint Raita', price: 90 });
    addons.push({ comboTitle: 'Add Refreshing Beverage', addonName: 'Fresh Mango Lassi', price: 80 });
  } else if (mainNorm.includes('noodle') || mainNorm.includes('momos') || mainNorm.includes('chinese')) {
    addons.push({ comboTitle: 'Add Starter', addonName: 'Crispy Veg Spring Rolls', price: 140 });
    addons.push({ comboTitle: 'Drink Pairing', addonName: 'Iced Peach Tea', price: 90 });
  } else {
    addons.push({ comboTitle: 'Sweet Finish', addonName: 'Chocolate Lava Cake', price: 120 });
  }

  return addons;
};

module.exports = {
  generateRecommendations,
  getComboSuggestions,
  MOOD_MAP,
};
