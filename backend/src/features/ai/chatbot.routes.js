const express = require('express');
const chatbotController = require('./chatbot.controller');

const router = express.Router({ mergeParams: true });

// Public / Customer-facing Chat Endpoint
router.post('/chat', chatbotController.processChatMessage);

// Settings & Analytics (Admin or Public fetch)
router.get('/settings', chatbotController.getChatbotSettings);
router.put('/settings', chatbotController.updateChatbotSettings);
router.get('/analytics', chatbotController.getChatbotAnalytics);

module.exports = router;
