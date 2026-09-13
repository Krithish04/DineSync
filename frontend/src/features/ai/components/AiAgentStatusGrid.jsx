import { useState, useEffect, useCallback } from 'react';
import { Activity, RefreshCw, CheckCircle2, AlertTriangle, Zap, Cpu, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Loader from '@/components/common/Loader';
import * as aiApi from '../api/ai.api';

export default function AiAgentStatusGrid({ restaurantId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchStatus = useCallback(async (isManualRefresh = false) => {
    if (!restaurantId) return;
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const res = await aiApi.getAiAgentStatus(restaurantId);
      setData(res);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch AI Agent health status.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchStatus();
    // Auto-refresh agent status every 30 seconds
    const interval = setInterval(() => fetchStatus(true), 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (loading) {
    return (
      <div className="p-8 text-center bg-card border border-border rounded-2xl">
        <Loader />
        <p className="text-xs text-muted-foreground mt-2">Auditing AI Service Agents & ML Stack...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl p-4 text-sm flex items-center justify-between">
        <span>{error}</span>
        <Button size="sm" variant="outline" onClick={() => fetchStatus(true)}>
          <RefreshCw size={14} className="mr-1.5" /> Retry Audit
        </Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Top AI Health Summary Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-card to-emerald-500/5 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Cpu className="text-primary" size={20} />
                <CardTitle className="text-base font-bold font-display">
                  AI Service Agent Operations & Health Monitor
                </CardTitle>
                <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/10">
                  8 Multi-Agent Cluster
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Continuous health verification, model execution mode auditing, latency benchmarks, and accuracy metrics.
              </CardDescription>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchStatus(true)}
              disabled={refreshing}
              className="self-start sm:self-auto border-border"
            >
              <RefreshCw size={14} className={`mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
              Re-Ping AI Stack
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-border/50">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Active AI Agents</p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {data.active_agents} / {data.total_agents}
                </span>
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Overall Cluster Accuracy</p>
              <div className="text-lg font-bold text-primary">
                {data.overall_accuracy_rate}%
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">FastAPI Python Microservice</p>
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                {data.fastapi_connected ? (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                    <CheckCircle2 size={12} className="mr-1 text-emerald-500" /> ONLINE (FastAPI)
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">
                    <AlertTriangle size={12} className="mr-1 text-amber-500" /> DEGRADED (Heuristics)
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Gemini 2.5 LLM Service</p>
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                {data.gemini_connected ? (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                    <ShieldCheck size={12} className="mr-1 text-emerald-500" /> GEMINI ACTIVE
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    RULE ENGINE
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.agents.map((agent) => {
          const isHealthy = agent.status === 'ACTIVE';

          let accuracyColor = 'text-emerald-600 bg-emerald-50 border-emerald-200';
          let accuracyProgressBg = 'bg-emerald-500';
          if (agent.accuracy_rate < 92) {
            accuracyColor = 'text-amber-600 bg-amber-50 border-amber-200';
            accuracyProgressBg = 'bg-amber-500';
          }

          return (
            <Card key={agent.id} className="border border-border/80 hover:border-primary/40 transition-all shadow-xs flex flex-col justify-between">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                    {agent.category}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${isHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    <span className={`text-[11px] font-bold ${isHealthy ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {isHealthy ? 'ACTIVE' : 'FALLBACK'}
                    </span>
                  </div>
                </div>

                <CardTitle className="text-sm font-bold mt-2 line-clamp-1">
                  {agent.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground font-mono mt-0.5 line-clamp-1">
                  {agent.model}
                </p>
              </CardHeader>

              <CardContent className="p-4 pt-2 space-y-3">
                {/* Accuracy Rate Metric Bar */}
                <div className="space-y-1.5 bg-muted/30 p-2.5 rounded-xl border border-border/40">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-muted-foreground flex items-center gap-1">
                      <Activity size={12} className="text-primary" /> Model Accuracy
                    </span>
                    <span className={`font-bold px-1.5 py-0.5 rounded text-xs border ${accuracyColor}`}>
                      {agent.accuracy_rate}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${accuracyProgressBg}`}
                      style={{ width: `${agent.accuracy_rate}%` }}
                    />
                  </div>
                </div>

                {/* Details & Latency */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 min-h-[32px]">
                    {agent.details}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                    <span className="flex items-center gap-1">
                      <Zap size={11} className="text-amber-500" /> Latency: <strong className="text-foreground">{agent.latency_ms}ms</strong>
                    </span>
                    <span>Confidence: <strong className="text-foreground">{agent.confidence_score}</strong></span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
