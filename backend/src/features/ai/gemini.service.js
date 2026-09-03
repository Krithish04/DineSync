const axios = require('axios');
const env = require('../../config/env.config');

// List of fallback Gemini model identifiers in order of preference
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
];

/**
 * Executes a direct HTTP request to Google Gemini API with model fallback
 */
const callGeminiApi = async (prompt, systemInstruction = '') => {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
  };

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  for (const modelName of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    try {
      const response = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 7000,
      });

      const candidates = response.data?.candidates;
      if (candidates && candidates.length > 0) {
        const textPart = candidates[0]?.content?.parts?.[0]?.text;
        if (textPart && textPart.trim()) {
          return textPart.trim();
        }
      }
    } catch (err) {
      if (err.response?.status === 429) {
        // Quota / Prepayment credits depleted on Google AI Studio
        // eslint-disable-next-line no-console
        console.warn(`[Gemini AI Service] Quota depleted (429) for key on model ${modelName}. Falling back to Smart Engine.`);
        break; // Stop attempting other models if account quota is 0
      }
      // Continue to next model if model not found or deprecated
    }
  }

  return null;
};

/**
 * Enhances Chatbot Waiter Response using Gemini LLM reasoning
 */
const enhanceChatbotResponse = async ({ userMessage, candidateCards = [], allergyNotice, tone = 'friendly' }) => {
  if (!env.GEMINI_API_KEY) return null;

  const cardSummaries = candidateCards.length > 0
    ? candidateCards.map((c) => `- ${c.name} (₹${c.price}, ${c.dietaryType || 'Veg'}, Description: ${c.description || 'Delicious dish'}, ${c.rating || 4.5}⭐)`).join('\n')
    : 'No specific menu items matched.';

  const systemInstruction = `You are DineSync AI Assistant, a friendly, charming, and knowledgeable restaurant food consultant & waiter. Tone: ${tone}.
Directly answer the customer's query in 2-3 warm, helpful sentences.
If they ask a greeting like "how are you?", respond naturally.
If they ask about ingredients or differences between dishes (e.g., Caesar salad vs Garden salad), explain clearly.
Reference menu items from the database context when relevant. Do not include robotic headers or preambles.`;

  const prompt = `Customer Query: "${userMessage}"
Available Restaurant Menu Context:
${cardSummaries}
Allergy Notice: ${allergyNotice || 'None'}

Please provide a direct, helpful, and natural response answering the customer query.`;

  return await callGeminiApi(prompt, systemInstruction);
};

/**
 * Generates Chef Smart Menu Advice using Gemini
 */
const generateSmartMenuAdvice = async (itemsData) => {
  if (!env.GEMINI_API_KEY) return null;

  const summaryText = itemsData.slice(0, 8).map((i) => `${i.item_name} (${i.category}): Rev ₹${i.total_revenue}, Qty ${i.total_qty}`).join('\n');
  const systemInstruction = 'You are an executive restaurant consultant. Provide 3 bullet points of high-impact chef advice for menu engineering.';
  const prompt = `Analyze this menu sales data:\n${summaryText}`;

  return await callGeminiApi(prompt, systemInstruction);
};

/**
 * Analyzes Diner Review Sentiment using Gemini
 */
const analyzeReviewSentiment = async (reviewText) => {
  if (!env.GEMINI_API_KEY) return null;

  const systemInstruction = 'You are a hospitality sentiment analyzer. Rate the sentiment as Positive, Neutral, or Negative and summarize key feedback in 1 sentence.';
  const prompt = `Review: "${reviewText}"`;

  return await callGeminiApi(prompt, systemInstruction);
};

module.exports = {
  callGeminiApi,
  enhanceChatbotResponse,
  generateSmartMenuAdvice,
  analyzeReviewSentiment,
};
