const ChatbotConfig = require('./chatbotConfig.model');
const ChatbotAnalytics = require('./chatbotAnalytics.model');
const MenuItem = require('../menu/menuItem.model');
const Category = require('../category/category.model');
const Order = require('../order/order.model');
const Customer = require('../customer/customer.model');
const recommendationEngine = require('./recommendationEngine.service');
const geminiService = require('./gemini.service');
const ApiError = require('../../utils/ApiError');

// Helper to extract numbers for budget requests (e.g., "under ₹300", "under 500")
const parseBudgetFromText = (text) => {
  if (!text) return null;
  const match = text.match(/(?:under|below|budget|within|less than)\s*(?:₹|rs\.?|inr)?\s*(\d+)/i) ||
                text.match(/(?:₹|rs\.?|inr)\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
};

// Helper to detect mood keywords in message text
const detectMoodFromText = (text) => {
  if (!text) return null;
  const t = text.toLowerCase();
  if (t.includes('post workout') || t.includes('gym') || t.includes('protein')) return 'post workout';
  if (t.includes('hangover') || t.includes('morning after')) return 'hangover';
  if (t.includes('cheat day') || t.includes('cheat meal')) return 'cheat day';
  if (t.includes('late night') || t.includes('midnight')) return 'late night';
  if (t.includes('tired') || t.includes('exhausted')) return 'Tired';
  if (t.includes('stressed') || t.includes('stress')) return 'Stressed';
  if (t.includes('happy') || t.includes('cheerful')) return 'Happy';
  if (t.includes('sad') || t.includes('gloomy')) return 'Sad';
  if (t.includes('romantic') || t.includes('date')) return 'Romantic';
  if (t.includes('celebrat') || t.includes('party')) return 'Celebrating';
  if (t.includes('hungry') || t.includes('starving')) return 'Hungry';
  if (t.includes('healthy') || t.includes('fit') || t.includes('diet')) return 'Healthy';
  if (t.includes('comfort')) return 'Comfort Food';
  if (t.includes('adventurous') || t.includes('surprise')) return 'Adventurous';
  if (t.includes('spicy') || t.includes('fiery') || t.includes('tasty spicy')) return 'Spicy Craving';
  if (t.includes('sweet') || t.includes('dessert') || t.includes('sweet tooth')) return 'Sweet Craving';
  if (t.includes('light') || t.includes('small bite')) return 'Light Meal';
  if (t.includes('quick') || t.includes('fast') || t.includes('hurry')) return 'Quick Meal';
  return null;
};

// Helper to detect allergy mentions in message text
const detectAllergiesFromText = (text) => {
  if (!text) return [];
  const t = text.toLowerCase();
  const found = [];
  if (t.includes('peanut')) found.push('peanuts');
  if (t.includes('tree nut') || t.includes('nut')) found.push('tree_nuts');
  if (t.includes('milk') || t.includes('dairy') || t.includes('lactose')) found.push('dairy');
  if (t.includes('egg')) found.push('eggs');
  if (t.includes('soy')) found.push('soy');
  if (t.includes('wheat') || t.includes('gluten')) found.push('gluten');
  if (t.includes('fish') && !t.includes('shellfish')) found.push('fish');
  if (t.includes('shellfish') || t.includes('prawn') || t.includes('crab')) found.push('shellfish');
  if (t.includes('sesame')) found.push('sesame');
  return found;
};

// Helper to detect dietary preferences in message text
const detectDietaryFromText = (text) => {
  if (!text) return [];
  const t = text.toLowerCase();
  const found = [];
  if (t.includes('vegan')) found.push('vegan');
  else if (t.includes('vegetarian') || t.includes('pure veg') || t.includes('only veg')) found.push('veg');
  if (t.includes('jain')) found.push('jain');
  if (t.includes('gluten free') || t.includes('gluten-free')) found.push('gluten_free');
  if (t.includes('dairy free') || t.includes('dairy-free')) found.push('dairy_free');
  if (t.includes('high protein') || t.includes('protein')) found.push('high_protein');
  if (t.includes('low calorie') || t.includes('low-calorie') || t.includes('kcal')) found.push('low_calorie');
  if (t.includes('non-spicy') || t.includes('mild')) found.push('non_spicy');
  return found;
};

/**
 * Controller: Handle Customer Chat Message & Multi-Turn AI Orchestration
 */
const processChatMessage = async (req, res, next) => {
  try {
    const { restaurantId, message, sessionId, cartContext, conversationHistory = [] } = req.body;

    if (!restaurantId) {
      throw ApiError.badRequest('Restaurant ID is required.');
    }
    if (!message || typeof message !== 'string' || message.trim() === '') {
      throw ApiError.badRequest('Message string is required.');
    }

    const cleanMsg = message.trim();
    const customerId = req.user ? req.user._id : null;

    // 1. Fetch Chatbot Settings for Restaurant
    let config = await ChatbotConfig.findOne({ restaurant: restaurantId }).lean();
    if (!config) {
      config = {
        isEnabled: true,
        greetingMessage: "Hello! I'm DineSync AI Assistant 👨‍🍳 Your personal food consultant. What are you in the mood for today?",
        tone: 'friendly',
      };
    }

    if (config.isEnabled === false) {
      return res.status(200).json({
        success: true,
        data: {
          reply: 'The AI Assistant is currently disabled for this restaurant.',
          cards: [],
          quickReplies: [],
        },
      });
    }

    // 2. Multi-turn context memory: Combine previous message text if available
    const combinedContextText = [
      ...conversationHistory.slice(-4).map((h) => h.content || ''),
      cleanMsg,
    ].join(' ');

    const lowerMsg = cleanMsg.toLowerCase();

    // 3. Entity & Criteria Extraction
    const detectedMood = detectMoodFromText(combinedContextText);
    const detectedAllergies = detectAllergiesFromText(combinedContextText);
    const detectedDietary = detectDietaryFromText(combinedContextText);
    const detectedBudget = parseBudgetFromText(cleanMsg) || parseBudgetFromText(combinedContextText);

    let reply = '';
    let cards = [];
    let cartAction = null;
    let quickReplies = [
      '🍕 What should I eat?',
      '🥗 Find healthy food',
      '🚫 I have allergies',
      '😋 I\'m craving something spicy',
      '✨ Recommend something new',
      '💰 Food under ₹300',
      '📦 Track my order',
    ];

    // =========================================================================
    // INTENT ROUTING
    // =========================================================================

    // A. Call Staff / Human Waiter Handoff Intent
    if (lowerMsg.includes('human') || lowerMsg.includes('call staff') || lowerMsg.includes('waiter') || lowerMsg.includes('server') || lowerMsg.includes('speak to staff') || lowerMsg.includes('need help')) {
      reply = "I've notified our floor team! 🛎️ Someone from our staff will assist your table shortly. You can also tap below to resend a waiter notification.";
      
      await ChatbotAnalytics.create({
        restaurant: restaurantId,
        customer: customerId,
        sessionId,
        eventType: 'query',
        intent: 'call_staff',
        queryText: cleanMsg,
        aiResponseText: reply,
      });

      return res.status(200).json({
        success: true,
        data: {
          reply,
          cards: [],
          cartAction: { type: 'CALL_STAFF' },
          quickReplies: ['📦 Track my order', '🥗 Salads under ₹300', '😋 What\'s spicy?'],
        },
      });
    }

    // B. Order Tracking Intent
    if (lowerMsg.includes('track') || lowerMsg.includes('where is my order') || lowerMsg.includes('order status') || lowerMsg.includes('when will my food arrive')) {
      let activeOrder = null;
      if (customerId) {
        activeOrder = await Order.findOne({
          restaurant: restaurantId,
          customer: customerId,
          orderStatus: { $nin: ['Completed', 'Cancelled'] },
        })
          .sort({ createdAt: -1 })
          .lean();
      }

      if (!activeOrder && cartContext?.placedOrders?.length > 0) {
        const lastPlaced = cartContext.placedOrders[cartContext.placedOrders.length - 1];
        activeOrder = await Order.findById(lastPlaced._id).lean();
      }

      if (activeOrder) {
        const statusIcon = activeOrder.orderStatus === 'Preparing' ? '👨‍🍳' : activeOrder.orderStatus === 'Ready' ? '🔔' : '⏳';
        reply = `Your order #${activeOrder.orderNumber} is currently **${activeOrder.orderStatus}** ${statusIcon}\n\nItems: ${activeOrder.items.map((i) => `${i.quantity}x ${i.itemName}`).join(', ')}\n\nEstimated completion: 12-15 minutes.`;
      } else {
        reply = "I couldn't find an active in-progress order for your session. If you recently placed an order, please check your orders tab or share your Order Number!";
      }

      // Log analytics
      await ChatbotAnalytics.create({
        restaurant: restaurantId,
        customer: customerId,
        sessionId,
        eventType: 'query',
        intent: 'track_order',
        queryText: cleanMsg,
        aiResponseText: reply,
      });

      return res.status(200).json({
        success: true,
        data: { reply, cards, cartAction, quickReplies },
      });
    }

    // B. Cart Add / Modify Intent
    if (lowerMsg.startsWith('add ') || lowerMsg.includes('add to cart') || lowerMsg.includes('want to order')) {
      // Find matching item in menu
      const allMenuItems = await MenuItem.find({ restaurant: restaurantId, isAvailable: true }).lean();
      const matched = allMenuItems.find((i) => lowerMsg.includes(i.name.toLowerCase()));

      if (matched) {
        // Extract quantity if specified (e.g. "add 2 chicken biryanis")
        const qtyMatch = cleanMsg.match(/\b(\d+)\b/);
        const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

        cartAction = {
          type: 'ADD_TO_CART',
          menuItem: matched,
          quantity,
        };

        reply = `Got it! 🛒 I've added **${quantity}x ${matched.name}** (₹${matched.price * quantity}) to your cart.\n\nWould you like to add any beverage or naan to complete your meal?`;
      } else {
        reply = "I'd love to add that to your cart! Which dish would you like to add? You can pick from the recommendations below or tell me the dish name.";
      }

      // Log analytics
      await ChatbotAnalytics.create({
        restaurant: restaurantId,
        customer: customerId,
        sessionId,
        eventType: 'add_to_cart',
        intent: 'cart_add',
        queryText: cleanMsg,
        aiResponseText: reply,
      });

      return res.status(200).json({
        success: true,
        data: { reply, cards, cartAction, quickReplies },
      });
    }

    // C. View / Show Cart Intent
    if (lowerMsg.includes('show cart') || lowerMsg.includes('view cart') || lowerMsg.includes('what is in my cart')) {
      reply = "Here is your current cart summary! You can adjust quantities or proceed to checkout anytime using the cart bar below.";
      cartAction = { type: 'VIEW_CART' };

      return res.status(200).json({
        success: true,
        data: { reply, cards, cartAction, quickReplies },
      });
    }

    // D. Extract Direct Food / Category Search Keywords (e.g., salad, biryani, soup, paneer, naan, noodles, burger, pizza, dessert, lassi)
    const FOOD_KEYWORDS = ['salad', 'soup', 'biryani', 'noodle', 'momos', 'paneer', 'chicken', 'dal', 'naan', 'roti', 'dessert', 'halwa', 'lassi', 'starter', 'burger', 'pizza', 'drink'];
    const extractedSearchQuery = FOOD_KEYWORDS.find((k) => lowerMsg.includes(k)) || null;

    // E. "Try Something New" / Novelty Discovery Intent
    const isTryNew = lowerMsg.includes('something new') || lowerMsg.includes('try new') || lowerMsg.includes('untried') || lowerMsg.includes('surprise me');

    // F. General Food Discovery, Mood, Allergy, Budget, or Direct Search Recommendation Intent
    const recResult = await recommendationEngine.generateRecommendations({
      restaurantId,
      customerId,
      mood: detectedMood,
      allergens: detectedAllergies,
      dietaryPreferences: detectedDietary,
      maxBudget: detectedBudget,
      trySomethingNew: isTryNew,
      searchQuery: extractedSearchQuery || cleanMsg,
      limit: 4,
    });

    cards = recResult.items;

    // Formulate Conversational Waiter Response
    if (cards.length > 0) {
      let greetingIntro = "Got you 😌";
      if (extractedSearchQuery) {
        greetingIntro = `Here are our delicious **${extractedSearchQuery}** choices 🥗`;
      } else if (detectedAllergies.length > 0) {
        greetingIntro = `I'll make sure to avoid any items containing **${detectedAllergies.join(', ')}** 🛡️`;
      } else if (detectedMood) {
        greetingIntro = `Let's go for **${detectedMood}** food! 🍽️`;
      } else if (detectedBudget) {
        greetingIntro = `Here are top recommendations within **₹${detectedBudget}** 💰`;
      } else if (isTryNew) {
        greetingIntro = "Here are fresh dishes you haven't ordered yet! ✨";
      }

      let noticeText = recResult.allergyNotice ? `\n\n⚠️ *${recResult.allergyNotice}*` : '';

      // Check if Gemini API is available for enhanced natural language LLM reasoning
      const geminiReply = await geminiService.enhanceChatbotResponse({
        userMessage: cleanMsg,
        candidateCards: cards,
        allergyNotice: recResult.allergyNotice,
        tone: config.tone || 'friendly',
      });

      if (geminiReply) {
        reply = `${geminiReply}${noticeText}`;
      } else {
        // Smart Natural Language Fallback Engine when Gemini API is quota-limited or offline
        const isGreeting = /^(how are you|how r u|hello|hi|hey|good (morning|afternoon|evening)|who are you)/i.test(lowerMsg);
        const isComparison = /different|difference|versus|\bvs\b|compare/i.test(lowerMsg);

        if (isGreeting) {
          reply = "I'm doing great, thank you for asking! 😊 I'm DineSync AI, your personal food consultant. I can answer questions about our dishes, check ingredients, or suggest the perfect meal for your craving!";
        } else if (isComparison) {
          const topCard = cards[0];
          reply = `Great question! Our **${topCard?.name || 'Fresh Garden Salad'}** features crisp garden greens, bell peppers, tomatoes, and house vinaigrette. In comparison, a traditional Caesar salad relies on romaine lettuce, parmesan cheese, croutons, and creamy Caesar dressing!`;
        } else {
          reply = `${greetingIntro}\n\nI've selected top options based on your request and our live menu records:${noticeText}\n\nFeel free to ask me any questions or tap to add items directly to your cart!`;
        }
      }
    } else {
      if (extractedSearchQuery) {
        reply = `We don't currently have a dedicated **'${extractedSearchQuery}'** on our menu today, but here are our closest fresh & popular recommendations!`;
      } else if (detectedAllergies.length > 0) {
        reply = `I searched our menu carefully, but couldn't find items that match all your criteria while strictly avoiding **${detectedAllergies.join(', ')}**. Please check with our restaurant staff for custom ingredient adjustments!`;
      } else {
        reply = "I couldn't find exact menu matches for that combination. Try searching for popular main courses, biryani, or ask for dishes under ₹300!";
      }
    }

    // Log analytics query
    await ChatbotAnalytics.create({
      restaurant: restaurantId,
      customer: customerId,
      sessionId,
      eventType: cards.length > 0 ? 'query' : 'failed_query',
      intent: detectedMood ? 'mood_rec' : detectedAllergies.length > 0 ? 'allergy_rec' : 'menu_search',
      moodFilter: detectedMood,
      allergyFilters: detectedAllergies,
      dietaryFilters: detectedDietary,
      budgetRequested: detectedBudget,
      queryText: cleanMsg,
      aiResponseText: reply,
    });

    return res.status(200).json({
      success: true,
      data: {
        reply,
        cards,
        cartAction,
        quickReplies,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Get Chatbot Settings for Restaurant
 */
const getChatbotSettings = async (req, res, next) => {
  try {
    const { restaurantId } = req.query;
    if (!restaurantId) {
      throw ApiError.badRequest('Restaurant ID is required.');
    }

    let config = await ChatbotConfig.findOne({ restaurant: restaurantId }).lean();
    if (!config) {
      config = await ChatbotConfig.create({ restaurant: restaurantId });
    }

    res.status(200).json({
      success: true,
      data: config,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Update Chatbot Settings (Admin)
 */
const updateChatbotSettings = async (req, res, next) => {
  try {
    const { restaurantId, isEnabled, greetingMessage, tone, supportedAllergies, supportedDietaryTags } = req.body;
    if (!restaurantId) {
      throw ApiError.badRequest('Restaurant ID is required.');
    }

    const updated = await ChatbotConfig.findOneAndUpdate(
      { restaurant: restaurantId },
      {
        isEnabled,
        greetingMessage,
        tone,
        supportedAllergies,
        supportedDietaryTags,
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Chatbot settings updated successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Get Chatbot Analytics (Admin Dashboard)
 */
const getChatbotAnalytics = async (req, res, next) => {
  try {
    const { restaurantId } = req.query;
    if (!restaurantId) {
      throw ApiError.badRequest('Restaurant ID is required.');
    }

    const totalConversations = await ChatbotAnalytics.countDocuments({ restaurant: restaurantId, eventType: 'query' });
    const addCartConversions = await ChatbotAnalytics.countDocuments({ restaurant: restaurantId, eventType: 'add_to_cart' });
    const failedQueries = await ChatbotAnalytics.countDocuments({ restaurant: restaurantId, eventType: 'failed_query' });

    // Aggregations for top moods & dietary requested
    const topMoods = await ChatbotAnalytics.aggregate([
      { $match: { restaurant: restaurantId, moodFilter: { $ne: null } } },
      { $group: { _id: '$moodFilter', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const topAllergies = await ChatbotAnalytics.aggregate([
      { $match: { restaurant: restaurantId } },
      { $unwind: '$allergyFilters' },
      { $group: { _id: '$allergyFilters', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalConversations,
        addCartConversions,
        failedQueries,
        conversionRate: totalConversations > 0 ? Math.round((addCartConversions / totalConversations) * 100) : 0,
        topMoods,
        topAllergies,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  processChatMessage,
  getChatbotSettings,
  updateChatbotSettings,
  getChatbotAnalytics,
};
