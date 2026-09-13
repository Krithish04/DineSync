import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, X, Sparkles, Mic, MicOff, ShieldOff, Plus, ChefHat, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useCartStore from '../store/cart.store';
import useCustomerAuthStore from '../store/customerAuth.store';
import * as customerApi from '../api/customerPlatform.api';
import ChatRecommendationCard from './ChatRecommendationCard';

const INITIAL_SUGGESTED_PROMPTS = [
  '🥗 Fresh Salads',
  '🍕 What should I eat?',
  '🥗 Find healthy food',
  '🚫 I have allergies',
  '😋 I\'m craving something spicy',
  '✨ Recommend something new',
  '💰 Food under ₹300',
  '📦 Track my order',
];

const QUICK_FILTER_CHIPS = [
  { label: '🥗 Salads', query: 'Show me fresh salads' },
  { label: '🌱 Veg Only', query: 'Show me vegetarian dishes' },
  { label: '🔥 Spicy Craving', query: 'I want something spicy' },
  { label: '💰 Under ₹300', query: 'Food under ₹300' },
  { label: '⭐ Top Rated', query: 'What are the top rated popular dishes?' },
  { label: '🚫 Peanut-Free', query: 'I am allergic to peanuts' },
];

export default function DineSyncAssistantModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState(null);
  const [addedItemNotice, setAddedItemNotice] = useState('');

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Welcome! I'm **DineSync AI Assistant** 👨‍🍳 your personal restaurant waiter & food consultant.\n\nWhat are you in the mood to eat today? You can ask for fresh salads, spicy curries, healthy options, or set budget & allergy preferences!",
      cards: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const { restaurantId, tableId, placedOrders, items, getGrandTotal, addItem } = useCartStore();
  const { customer, phone } = useCustomerAuthStore();
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: "Conversation reset! 👨‍🍳 What delicious meal can I help you discover now?",
        cards: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleForgetHistory = async () => {
    if (!phone || !restaurantId) return;
    try {
      await customerApi.forgetGuestHistory(restaurantId, phone);
      setAddedItemNotice('Personalized order history cleared successfully!');
      setTimeout(() => setAddedItemNotice(''), 3500);
    } catch {
      // Handled gracefully
    }
  };

  // Web Speech API Voice Input setup
  const toggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputMessage(transcript);
      setIsListening(false);
      handleSendMessage(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleSendMessage = async (textToSend) => {
    const query = textToSend || inputMessage;
    if (!query || !query.trim() || isLoading || !restaurantId) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const responseData = await customerApi.sendChatMessage(restaurantId, {
        message: query,
        sessionId: tableId || 'online-session',
        cartContext: {
          placedOrders,
          itemCount: items.length,
          totalAmount: getGrandTotal(),
        },
        conversationHistory: messages.map((m) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text,
        })),
      });

      // Handle structured cart/staff action returned by AI gateway
      if (responseData.cartAction?.type === 'ADD_TO_CART' && responseData.cartAction.menuItem) {
        addItem(responseData.cartAction.menuItem, responseData.cartAction.quantity || 1);
        setAddedItemNotice(`Added ${responseData.cartAction.menuItem.name} to cart!`);
        setTimeout(() => setAddedItemNotice(''), 3000);
      } else if (responseData.cartAction?.type === 'CALL_STAFF') {
        try {
          await customerApi.requestAssistance(restaurantId, {
            tableId: tableId || undefined,
            note: 'Guest requested staff assistance via AI Chat',
          });
          setAddedItemNotice('Staff notified! A waiter will assist you shortly.');
          setTimeout(() => setAddedItemNotice(''), 4000);
        } catch {
          // Handled gracefully
        }
      }

      const assistantMsg = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: responseData.reply || "I'm here to help you find the best food!",
        cards: responseData.cards || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: "I'm currently running in basic offline mode. You can still ask me about menu items, vegetarian options, or track your order!",
        cards: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Simple formatter converting markdown bold **text** into JSX
  const renderFormattedText = (rawText) => {
    if (!rawText) return null;
    const parts = rawText.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold text-amber-700">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <>
      {/* Floating Trigger Button (Light Warm Theme) */}
      <div className={`fixed right-4 z-40 sm:right-6 transition-all duration-300 ${
        items && items.length > 0
          ? 'bottom-36 sm:bottom-6'
          : 'bottom-20 sm:bottom-6'
      }`}>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Ask DineSync AI Waiter Assistant"
          className="relative group flex items-center gap-2.5 bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-4 py-3 sm:py-3.5 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-amber-300/60 touch-manipulation min-h-[48px] min-w-[48px]"
        >
          <div className="relative flex items-center justify-center">
            <ChefHat className="w-5 h-5 sm:w-6 sm:h-6 text-white animate-bounce" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />
          </div>
          <span className="font-bold text-xs sm:text-sm tracking-wide">AI Waiter</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-100 hidden sm:inline" />
        </button>
      </div>

      {/* Responsive Light-Themed Chat Modal / Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full sm:w-[450px] h-[93vh] sm:h-[680px] bg-white border border-amber-200/80 sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-900 relative">
            
            {/* Header (Vibrant Warm Amber Gradient) */}
            <div className="px-4 py-3.5 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 border-b border-amber-600/20 flex items-center justify-between shadow-sm text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/20 border border-white/30 shadow-inner backdrop-blur-md">
                  <ChefHat className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    DineSync AI Assistant
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-semibold border border-white/30 flex items-center gap-1 backdrop-blur-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
                      Live Waiter
                    </span>
                  </h3>
                  <p className="text-[11px] text-amber-100">Intelligent Restaurant Food Consultant</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {phone && (
                  <button
                    type="button"
                    onClick={handleForgetHistory}
                    title="Forget My Order History (Opt Out of AI Personalization)"
                    className="p-1.5 rounded-lg text-amber-100 hover:text-white hover:bg-white/20 transition"
                  >
                    <ShieldOff className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleResetChat}
                  title="Reset Conversation"
                  className="p-1.5 rounded-lg text-amber-100 hover:text-white hover:bg-white/20 transition"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-amber-100 hover:text-white hover:bg-white/20 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Interactive Filter Chips Bar */}
            <div className="px-3 py-2 bg-amber-50/70 border-b border-amber-100 overflow-x-auto flex gap-1.5 no-scrollbar">
              {QUICK_FILTER_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleSendMessage(chip.query)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white text-amber-900 hover:bg-amber-500 hover:text-white transition whitespace-nowrap shrink-0 border border-amber-200 shadow-xs"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Added Item Toast Notice */}
            {addedItemNotice && (
              <div className="absolute top-16 left-4 right-4 z-40 p-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold text-center shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-2">
                🛒 {addedItemNotice}
              </div>
            )}

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-amber-50/30 via-slate-50 to-white" aria-live="polite">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-xs ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium rounded-br-none'
                        : 'bg-white border border-slate-200/90 text-slate-800 rounded-bl-none border-l-4 border-l-amber-500 shadow-xs'
                    }`}
                  >
                    <div className="whitespace-pre-line">{renderFormattedText(msg.text)}</div>
                    <span
                      className={`block text-[10px] mt-1.5 ${
                        msg.sender === 'user' ? 'text-amber-100 text-right' : 'text-slate-400'
                      }`}
                    >
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Horizontal Recommendation Cards Carousel */}
                  {msg.cards && msg.cards.length > 0 && (
                    <div className="w-full mt-3 overflow-x-auto pb-2 flex gap-3 scrollbar-thin scrollbar-thumb-amber-200">
                      {msg.cards.map((cardItem) => (
                        <ChatRecommendationCard
                          key={cardItem._id}
                          item={cardItem}
                          onSelectDetails={(item) => setSelectedDetailItem(item)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Typing Indicator */}
              {isLoading && (
                <div className="flex items-center gap-2.5 text-slate-600 text-xs bg-white border border-slate-200 p-3 rounded-xl w-fit animate-pulse shadow-xs">
                  <Bot className="w-4 h-4 text-amber-500 animate-spin" />
                  <span>DineSync AI is checking menu & ingredients...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggested Prompts Pill Bar */}
            <div className="px-3 py-2 bg-amber-50/50 border-t border-slate-100 overflow-x-auto flex gap-1.5 no-scrollbar">
              {INITIAL_SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSendMessage(prompt)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white text-amber-900 hover:bg-amber-500 hover:text-white transition whitespace-nowrap shrink-0 border border-amber-200/80 shadow-xs"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input Bar with Voice Recognition */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
            >
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`p-2.5 rounded-xl border transition ${
                  isListening
                    ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse'
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
                title={isListening ? 'Listening...' : 'Voice Order'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={isListening ? 'Listening...' : 'Ask for salads, biryani, food under ₹300, allergies...'}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />

              <Button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold p-2.5 rounded-xl h-auto shrink-0 shadow-xs"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>

            {/* Dish Detail Preview Modal */}
            {selectedDetailItem && (
              <div className="absolute inset-0 z-50 bg-white/98 p-5 flex flex-col justify-between animate-in fade-in duration-200 overflow-y-auto">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-base text-amber-700">{selectedDetailItem.name}</h3>
                    <button
                      type="button"
                      onClick={() => setSelectedDetailItem(null)}
                      className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="w-full h-44 rounded-xl overflow-hidden bg-slate-100 mb-3 shadow-sm border border-slate-200">
                    <img
                      src={selectedDetailItem.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80'}
                      alt={selectedDetailItem.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed mb-3">
                    {selectedDetailItem.description || 'Delicious restaurant specialty prepared fresh to order.'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-100">
                      <span className="text-slate-500 block text-[10px]">Preparation Time</span>
                      <span className="font-bold text-amber-700">{selectedDetailItem.preparationTime || 15} mins</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-100">
                      <span className="text-slate-500 block text-[10px]">Dietary Type</span>
                      <span className="font-bold capitalize text-emerald-700">{selectedDetailItem.dietaryType || 'Veg'}</span>
                    </div>
                  </div>

                  {selectedDetailItem.whyRecommended && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 mb-3 font-medium">
                      <span className="font-bold text-amber-700 block mb-1">✨ Why Recommended</span>
                      {selectedDetailItem.whyRecommended}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Price</span>
                    <span className="text-xl font-bold text-amber-600">₹{selectedDetailItem.price}</span>
                  </div>
                  <Button
                    onClick={() => {
                      addItem(selectedDetailItem, 1);
                      setAddedItemNotice(`Added ${selectedDetailItem.name} to cart!`);
                      setSelectedDetailItem(null);
                      setTimeout(() => setAddedItemNotice(''), 3000);
                    }}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add to Cart</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
