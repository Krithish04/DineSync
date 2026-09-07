---
name: ai-chatbot-reservation-maintainer
description: >-
  Maintains Google Gemini LLM fallback cascades, NLU intent classification,
  and the 30-second real-time AI Reservation Monitor loop.
---

# AI Chatbot & Reservation Maintainer Skill

Use this skill to audit, test, or troubleshoot the DineSync AI Assistant chatbot, multi-model Gemini LLM fallback chain, NLU reservation slot parsing, and automated table reservation monitoring.

## System Overview

1. **Gemini LLM Fallback Cascade (`gemini.service.js`)**:
   - Tries 5 models in order: `gemini-2.5-flash` $\rightarrow$ `gemini-3.5-flash-lite` $\rightarrow$ `gemini-3.1-flash-lite` $\rightarrow$ `gemini-2.0-flash` $\rightarrow$ `gemini-1.5-flash-latest`.
   - Timeout: `7000ms`.
   - On HTTP 429 (Quota Depleted): Stops attempting cloud models and degrades to the local Smart Waiter Natural Language Engine.

2. **NLU Slot Parser & Time Slot Recommender (`reservationAi.service.js` & `reservation_service.py`)**:
   - Parses diner natural language queries into structured reservation slots (`reservationDate`, `reservationTime`, `numberOfGuests`, `specialRequests`, `dietaryPreferences`) and auto-assigns table document.
   - Calculates time-slot congestion scores (`High Availability`, `Moderate`, `Congested`) and chef-recommended non-peak reservation windows.

3. **Recurring Weekly Reservation Engine (`recurringReservation.model.js` & `server.js`)**:
   - Manages weekly recurring table reservation profiles.
   - Background scheduler automatically creates upcoming weekly bookings every Monday at 8 AM, locks tables, and dispatches notifications.

4. **AI Reservation Monitor (`aiReservation.service.js` & `server.js`)**:
   - Initialized on server start (`startAiReservationMonitor()`).
   - Runs a **30-second cycle**:
     - **15 mins before**: Sets table status to `"Reserved"` & broadcasts `table:status_updated`.
     - **15 mins after**: Cancels booking to `"No Show"`, releases table to `"Available"`, broadcasts `reservation:auto_cancelled`, and dispatches staff notification.
   - **Phone Verification**: `verifyGuestPhoneToUnlock()` matches customer phone numbers to seat guests (`"Seated"`) and set table to `"Occupied"`.

---

## Maintenance Runbook

### Step 1: Audit NLU Slot Parser & Slot Recommender
Inspect [`reservationAi.service.js`](file:///c:/Users/Laptop/OneDrive/Desktop/dinesync-ai/backend/src/features/reservation/reservationAi.service.js) & [`reservation_service.py`](file:///c:/Users/Laptop/OneDrive/Desktop/dinesync-ai/ai-service/app/services/reservation_service.py):
- Test query: *"Book a table for 4 guests tomorrow at 8pm, window seat"*
- Confirm extracted date, time (`20:00`), party size (`4`), special request, and matched table capacity.

### Step 2: Test Recurring Weekly Scheduler
Inspect [`recurringReservation.model.js`](file:///c:/Users/Laptop/OneDrive/Desktop/dinesync-ai/backend/src/features/reservation/recurringReservation.model.js):
- Verify active recurring profile lookup and duplicate check (`Reservation.findOne({ reservationDate: upcomingDate })`).

### Step 3: Validate AI Reservation Monitor Cycle
Inspect [`aiReservation.service.js`](file:///c:/Users/Laptop/OneDrive/Desktop/dinesync-ai/backend/src/features/reservation/aiReservation.service.js#L121-L195):
- Verify 15-minute lock window (`lockStart = resMins - 15`).
- Verify 15-minute grace period (`autoCancelTime = resMins + 15`).
- Confirm Socket.IO event names: `table:status_updated` and `reservation:auto_cancelled`.
