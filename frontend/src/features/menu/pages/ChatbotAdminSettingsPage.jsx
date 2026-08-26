import React, { useState, useEffect } from 'react';
import { Bot, Save, MessageSquare, CheckCircle, ShieldAlert, Sparkles, TrendingUp, RefreshCw, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useAuthStore from '@/store/auth.store';
import * as customerApi from '@/features/customerPlatform/api/customerPlatform.api';

export default function ChatbotAdminSettingsPage() {
  const { user } = useAuthStore();
  const restaurantId = user?.restaurant || user?.tenantId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [isEnabled, setIsEnabled] = useState(true);
  const [greetingMessage, setGreetingMessage] = useState('');
  const [tone, setTone] = useState('friendly');
  const [supportedAllergies, setSupportedAllergies] = useState([]);
  const [supportedDietaryTags, setSupportedDietaryTags] = useState([]);

  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    if (!restaurantId) return;

    setLoading(true);
    Promise.all([
      customerApi.getChatbotSettings(restaurantId),
      customerApi.getChatbotAnalytics(restaurantId),
    ])
      .then(([settingsData, analyticsData]) => {
        if (settingsData) {
          setIsEnabled(settingsData.isEnabled ?? true);
          setGreetingMessage(settingsData.greetingMessage || '');
          setTone(settingsData.tone || 'friendly');
          setSupportedAllergies(settingsData.supportedAllergies || []);
          setSupportedDietaryTags(settingsData.supportedDietaryTags || []);
        }
        if (analyticsData) {
          setAnalytics(analyticsData);
        }
      })
      .catch((err) => console.error('Failed loading chatbot settings:', err))
      .finally(() => setLoading(false));
  }, [restaurantId]);

  const handleSaveSettings = async () => {
    if (!restaurantId) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      await customerApi.updateChatbotSettings(restaurantId, {
        isEnabled,
        greetingMessage,
        tone,
        supportedAllergies,
        supportedDietaryTags,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed saving chatbot settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const ALL_ALLERGIES = [
    'peanuts',
    'tree_nuts',
    'milk',
    'dairy',
    'eggs',
    'soy',
    'wheat',
    'gluten',
    'fish',
    'shellfish',
    'sesame',
  ];

  const ALL_DIETARY = [
    'vegetarian',
    'vegan',
    'jain',
    'gluten_free',
    'dairy_free',
    'high_protein',
    'low_calorie',
    'low_sugar',
    'spicy',
    'non_spicy',
  ];

  const toggleAllergy = (a) => {
    setSupportedAllergies((prev) =>
      prev.includes(a) ? prev.filter((item) => item !== a) : [...prev, a]
    );
  };

  const toggleDietary = (d) => {
    setSupportedDietaryTags((prev) =>
      prev.includes(d) ? prev.filter((item) => item !== d) : [...prev, d]
    );
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-amber-500 font-semibold">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Loading DineSync AI Assistant Controls...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 text-slate-100">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 p-6 rounded-2xl border border-amber-500/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
            <Bot className="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              DineSync AI Assistant Controls
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium">Production Ready</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Configure food consultant persona, greeting prompts, supported allergy safety filters, and view conversion analytics.
            </p>
          </div>
        </div>

        <Button
          onClick={handleSaveSettings}
          disabled={saving}
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-2"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </Button>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-semibold flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span>Chatbot configuration saved successfully!</span>
        </div>
      )}

      {/* Grid: Analytics Cards & Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow">
          <span className="text-xs font-medium text-slate-400">Total Conversations</span>
          <div className="text-2xl font-bold text-slate-100 mt-1">{analytics?.totalConversations || 0}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow">
          <span className="text-xs font-medium text-slate-400">Cart Add Conversions</span>
          <div className="text-2xl font-bold text-amber-400 mt-1">{analytics?.addCartConversions || 0}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow">
          <span className="text-xs font-medium text-slate-400">Conversion Rate</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{analytics?.conversionRate || 0}%</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow">
          <span className="text-xs font-medium text-slate-400">Unmatched / Failed Queries</span>
          <div className="text-2xl font-bold text-rose-400 mt-1">{analytics?.failedQueries || 0}</div>
        </div>
      </div>

      {/* Main Settings Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Chatbot Behavior & Greeting */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Persona & Greeting Configuration
          </h2>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <span className="text-sm font-semibold text-slate-200 block">Enable AI Assistant</span>
              <span className="text-xs text-slate-400">Show floating chatbot widget on storefront</span>
            </div>
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Greeting Message</label>
            <textarea
              rows={3}
              value={greetingMessage}
              onChange={(e) => setGreetingMessage(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              placeholder="Configure welcoming prompt for diners..."
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Chatbot Tone</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500 capitalize"
            >
              <option value="friendly">Friendly & Warm Waiter</option>
              <option value="formal">Formal & Polite Sommelier</option>
              <option value="enthusiastic">Enthusiastic Foodie</option>
            </select>
          </div>
        </div>

        {/* Right Card: Allergy & Dietary Matrix */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            Allergy & Dietary Safety Filters
          </h2>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">Supported Allergies</label>
            <div className="flex flex-wrap gap-2">
              {ALL_ALLERGIES.map((allergy) => {
                const isSelected = supportedAllergies.includes(allergy);
                return (
                  <button
                    key={allergy}
                    type="button"
                    onClick={() => toggleAllergy(allergy)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                      isSelected
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    {allergy.replace('_', ' ')}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">Dietary Tags</label>
            <div className="flex flex-wrap gap-2">
              {ALL_DIETARY.map((tag) => {
                const isSelected = supportedDietaryTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleDietary(tag)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    {tag.replace('_', ' ')}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
