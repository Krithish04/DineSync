---
name: ai-health-monitor
description: >-
  Orchestrates health checks, dependency verification, proxy timeout audits,
  and fallback testing for all DineSync AI services and microservices.
---

# AI Health & Connectivity Maintainer Skill

Use this skill when the user asks to health-check, diagnose, or troubleshoot the DineSync AI service architecture.

## Overview & Architecture

The DineSync AI architecture consists of:
1. **Python FastAPI Microservice (`ai-service`)**: Serves ML models at `http://localhost:8000/api/v1`.
2. **Node.js Express Backend (`backend/src/features/ai/`)**: Acts as an HTTP proxy via `axios` with a 2000ms timeout and automatic heuristic fallback handlers.
3. **Google Gemini LLM Cloud Integration**: Calls Gemini generateContent API with a 5-tier model fallback cascade.

---

## Maintenance Runbook

### Step 1: Python AI Microservice Health & Environment Check
Verify that the Python virtual environment and FastAPI server are healthy:
```powershell
# 1. Check Python ML dependency imports
c:\Users\Laptop\OneDrive\Desktop\dinesync-ai\ai-service\.venv\Scripts\python.exe -c "import prophet; import sklearn; import xgboost; import transformers; print('✅ Python ML Stack Validated')"

# 2. Check FastAPI Root Health endpoint
curl.exe -s http://localhost:8000/api/v1/health
```

### Step 2: Environment Key Audit
Inspect `.env` files for necessary AI service keys (strictly avoid reading secret values into logs):
- `GEMINI_API_KEY`: Required for natural language chatbot waiter reasoning and smart menu advice.
- `AI_SERVICE_URL`: Defaults to `http://localhost:8000/api/v1`.
- `HF_TOKEN`: Optional HuggingFace token for sentiment and zero-shot NLP models.

### Step 3: Node.js Proxy Timeout & Fallback Verification
Check [`ai.service.js`](file:///c:/Users/Laptop/OneDrive/Desktop/dinesync-ai/backend/src/features/ai/ai.service.js):
- Ensure `aiClient` timeout is set to `2000ms` for snappy UI responses.
- Verify that `postToAiService` returns `execution_mode: "HEURISTIC_FALLBACK"` when FastAPI is unreachable.

### Step 4: Quota & Error Log Inspection
If HTTP 429 errors occur:
- Google AI Studio free tier quota depleted $\rightarrow$ System should automatically log fallback warning and degrade gracefully to internal smart waiter heuristic.
