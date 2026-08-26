import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, X, Sparkles, RefreshCw, Mic, MicOff, Star, Clock, Info, ShieldCheck, Plus, AlertTriangle, ChefHat, RotateCcw, Check, ShoppingBag } from 'lucide-react';
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
  const { customer } = useCustomerAuthStore();
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

      // Handle structured cart action returned by AI gateway
      if (responseData.cartAction?.type === 'ADD_TO_CART' && responseData.cartAction.menuItem) {
        addItem(responseData.cartAction.menuItem, responseData.cartAction.quantity || 1);
        setAddedItemNotice(`Added ${responseData.cartAction.menuItem.name} to cart!`);
        setTimeout(() => setAddedItemNotice(''), 3000);
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
        text: "I'm having trouble connecting right now. Please try asking again in a moment!",
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
        return <strong key={index} className="font-bold text-amber-300">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-20 right-4 z-40 md:bottom-6 md:right-6">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="relative group flex items-center gap-2.5 bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 px-4 py-3.5 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 border border-amber-300/40"
        >
          <div className="relative flex items-center justify-center">
            <ChefHat className="w-6 h-6 text-slate-950 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-950" />
          </div>
          <span className="font-bold text-sm hidden sm:inline-block tracking-wide">AI Food Waiter</span>
          <Sparkles className="w-4 h-4 text-amber-950 opacity-90" />
        </button>
      </div>

      {/* Responsive Chat Modal / Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end p-0 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full sm:w-[450px] h-[93vh] sm:h-[680px] bg-slate-950 border border-amber-500/30 sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white relative">
            
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border-b border-slate-800 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 shadow-inner">
                  <ChefHat className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                    DineSync AI Assistant
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Live Waiter
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Intelligent Restaurant Food Consultant</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleResetChat}
                  title="Reset Conversation"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Interactive Filter Chips Bar */}
            <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800/80 overflow-x-auto flex gap-1.5 no-scrollbar">
              {QUICK_FILTER_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleSendMessage(chip.query)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800/90 text-amber-300 hover:bg-amber-500 hover:text-slate-950 transition whitespace-nowrap shrink-0 border border-amber-500/20 shadow-sm"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Added Item Toast Notice */}
            {addedItemNotice && (
              <div className="absolute top-16 left-4 right-4 z-40 p-2.5 rounded-xl bg-emerald-500/90 text-slate-950 text-xs font-bold text-center shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-2">
                🛒 {addedItemNotice}
              </div>
            )}

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900/80">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-md ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-medium rounded-br-none'
                        : 'bg-slate-900/95 border border-slate-800 text-slate-100 rounded-bl-none border-l-2 border-l-amber-500'
                    }`}
                  >
                    <div className="whitespace-pre-line">{renderFormattedText(msg.text)}</div>
                    <span
                      className={`block text-[10px] mt-1.5 ${
                        msg.sender === 'user' ? 'text-amber-950/80 text-right' : 'text-slate-500'
                      }`}
                    >
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Horizontal Recommendation Cards Carousel */}
                  {msg.cards && msg.cards.length > 0 && (
                    <div className="w-full mt-3 overflow-x-auto pb-2 flex gap-3 scrollbar-thin scrollbar-thumb-slate-800">
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
                <div className="flex items-center gap-2.5 text-slate-400 text-xs bg-slate-900/90 border border-slate-800 p-3 rounded-xl w-fit animate-pulse shadow">
                  <Bot className="w-4 h-4 text-amber-400 animate-spin" />
                  <span>DineSync AI is checking menu & ingredients...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggested Prompts Pill Bar */}
            <div className="px-3 py-2 bg-slate-900/90 border-t border-slate-800 overflow-x-auto flex gap-1.5 no-scrollbar">
              {INITIAL_SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSendMessage(prompt)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-800/80 text-amber-300 hover:bg-amber-500 hover:text-slate-950 transition whitespace-nowrap shrink-0 border border-amber-500/20"
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
              className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
            >
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`p-2.5 rounded-xl border transition ${
                  isListening
                    ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
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
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />

              <Button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold p-2.5 rounded-xl h-auto shrink-0 shadow"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>

            {/* Dish Detail Preview Modal */}
            {selectedDetailItem && (
              <div className="absolute inset-0 z-50 bg-slate-950/95 p-5 flex flex-col justify-between animate-in fade-in duration-200 overflow-y-auto">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-base text-amber-400">{selectedDetailItem.name}</h3>
                    <button
                      type="button"
                      onClick={() => setSelectedDetailItem(null)}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="w-full h-44 rounded-xl overflow-hidden bg-slate-800 mb-3 shadow-md">
                    <img
                      src={selectedDetailItem.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80'}
                      alt={selectedDetailItem.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-3">
                    {selectedDetailItem.description || 'Delicious restaurant specialty prepared fresh to order.'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Preparation Time</span>
                      <span className="font-semibold text-amber-300">{selectedDetailItem.preparationTime || 15} mins</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Dietary Type</span>
                      <span className="font-semibold capitalize text-emerald-400">{selectedDetailItem.dietaryType || 'Veg'}</span>
                    </div>
                  </div>

                  {selectedDetailItem.whyRecommended && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 mb-3">
                      <span className="font-bold text-amber-400 block mb-1">✨ Why Recommended</span>
                      {selectedDetailItem.whyRecommended}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Price</span>
                    <span className="text-xl font-bold text-amber-400">₹{selectedDetailItem.price}</span>
                  </div>
                  <Button
                    onClick={() => {
                      addItem(selectedDetailItem, 1);
                      setAddedItemNotice(`Added ${selectedDetailItem.name} to cart!`);
                      setSelectedDetailItem(null);
                      setTimeout(() => setAddedItemNotice(''), 3000);
                    }}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow flex items-center gap-1.5"
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
