const axios = require('axios');
const env = require('../../config/env.config');

/**
 * Executes a direct HTTP request to Google Gemini API (v1beta/models/gemini-1.5-flash)
 */
const callGeminiApi = async (prompt, systemInstruction = '') => {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return null; // Graceful fallback when API key is not configured
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

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

  try {
    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 8000,
    });

    const candidates = response.data?.candidates;
    if (candidates && candidates.length > 0) {
      const textPart = candidates[0]?.content?.parts?.[0]?.text;
      return textPart ? textPart.trim() : null;
    }
    return null;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[Gemini AI Service] API call error: ${err.message}`);
    return null;
  }
};

/**
 * Enhances Chatbot Waiter Response using Gemini LLM reasoning
 */
const enhanceChatbotResponse = async ({ userMessage, candidateCards, allergyNotice, tone = 'friendly' }) => {
  if (!env.GEMINI_API_KEY) return null;

  const cardSummaries = candidateCards.map((c) => `- ${c.name} (₹${c.price}, ${c.dietaryType}, ${c.rating || 4.5}⭐)`).join('\n');

  const systemInstruction = `You are DineSync AI Assistant, a friendly, concise, michelin-star restaurant waiter & food consultant. Tone: ${tone}. Keep responses helpful, warm, and brief under 3 short sentences. Avoid long preamble.`;
  const prompt = `Customer asked: "${userMessage}".\nRecommended dishes from database:\n${cardSummaries}\nAllergy Notice: ${allergyNotice || 'None'}\nFormulate a warm waiter reply introducing these dishes.`;

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
