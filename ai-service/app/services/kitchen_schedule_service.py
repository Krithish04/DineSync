import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List
from app.models.kitchen_schedule import (
    KitchenScheduleRequest,
    KitchenScheduleResponse,
    ScoredTicketOutput,
    ScoredTicketItem,
)

logger = logging.getLogger(__name__)

PRIORITY_WEIGHTS = {
    "high": 25.0,
    "medium": 10.0,
    "low": 0.0,
}

COURSE_STARTER_KEYWORDS = ["soup", "salad", "appetizer", "starter", "wing", "fries", "nacho", "dimsum", "tikka", "kebab", "bread", "naan", "garlic"]

def is_starter_item(item_name: str, explicit_starter: bool = False) -> bool:
    if explicit_starter:
        return True
    name_lower = item_name.lower()
    return any(kw in name_lower for kw in COURSE_STARTER_KEYWORDS)

def parse_iso_time(time_str: str) -> datetime:
    try:
        if time_str.endswith("Z"):
            time_str = time_str[:-1] + "+00:00"
        return datetime.fromisoformat(time_str)
    except Exception:
        return datetime.now(timezone.utc)

def format_iso_time(dt: datetime) -> str:
    return dt.isoformat()

def calculate_kitchen_schedule(req: KitchenScheduleRequest) -> KitchenScheduleResponse:
    now = parse_iso_time(req.currentTime) if req.currentTime else datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    station_tickets: Dict[str, List[ScoredTicketOutput]] = {}
    all_scored_tickets: List[ScoredTicketOutput] = []

    # Map order items by orderId to assess course coordination across stations
    order_items_map: Dict[str, List[dict]] = {}
    for ticket in req.tickets:
        if ticket.status == "Served":
            continue
        if ticket.orderId not in order_items_map:
            order_items_map[ticket.orderId] = []
        for item in ticket.items:
            order_items_map[ticket.orderId].append({
                "ticketId": ticket.ticketId,
                "itemName": item.itemName,
                "isStarter": is_starter_item(item.itemName, item.isStarter),
                "prepTime": item.preparationTime or 15,
                "station": ticket.station,
            })

    at_risk_count = 0
    late_count = 0

    for ticket in req.tickets:
        if ticket.status == "Served":
            continue

        created_dt = parse_iso_time(ticket.createdAt)
        if created_dt.tzinfo is None:
            created_dt = created_dt.replace(tzinfo=timezone.utc)

        elapsed_mins = max(0.0, (now - created_dt).total_seconds() / 60.0)

        # Compute max item prep time on this ticket
        max_item_prep = max([i.preparationTime or 15 for i in ticket.items] or [15])

        # Priority weight
        prio_weight = max([PRIORITY_WEIGHTS.get(i.priority, 10.0) for i in ticket.items] or [10.0])

        # Course coordination bonus/penalty:
        # If this ticket contains mains for an order that also has active starters, give starters precedence so courses don't clash
        order_items = order_items_map.get(ticket.orderId, [])
        has_starters = any(i["isStarter"] for i in order_items)
        has_mains = any(not i["isStarter"] for i in order_items)

        ticket_has_starters = any(is_starter_item(i.itemName, i.isStarter) for i in ticket.items)

        course_modifier = 0.0
        if has_starters and has_mains:
            if ticket_has_starters:
                course_modifier += 15.0 # Boost starters to cook first
            else:
                course_modifier -= 5.0 # Hold mains slightly while starters prep

        # Baseline FIFO age score (0.8 pts per minute)
        age_score = elapsed_mins * 0.8

        # Target Ready Time: Created Time + Max Prep Time + 2 mins buffer
        target_ready_dt = created_dt + timedelta(minutes=max_item_prep + 2)

        # Estimated completion timestamp from current moment
        est_completion_dt = now + timedelta(minutes=max_item_prep)

        # Priority Flag determination:
        # "at-risk" triggers proactively if estimated completion comes within 3 mins of target or breaches it
        remaining_budget_mins = (target_ready_dt - now).total_seconds() / 60.0

        if now > target_ready_dt or elapsed_mins >= (max_item_prep + 5):
            priority_flag = "late"
            late_count += 1
            age_score += 35.0 # Heavy urgency escalation for late tickets
        elif remaining_budget_mins <= 3.5 or elapsed_mins >= (max_item_prep - 2):
            priority_flag = "at-risk"
            at_risk_count += 1
            age_score += 20.0 # Proactive warning escalation
        else:
            priority_flag = "on-track"

        total_score = age_score + prio_weight + course_modifier

        scored_items: List[ScoredTicketItem] = []
        for item in ticket.items:
            prep_m = item.preparationTime or 15
            item_est_comp = now + timedelta(minutes=prep_m)
            scored_items.append(ScoredTicketItem(
                orderItemId=item.orderItemId,
                itemName=item.itemName,
                estimatedPrepMins=prep_m,
                estimatedCompletionAt=format_iso_time(item_est_comp),
                status=item.kitchenStatus,
            ))

        scored_output = ScoredTicketOutput(
            ticketId=ticket.ticketId,
            ticketNumber=ticket.ticketNumber,
            orderId=ticket.orderId,
            station=ticket.station,
            status=ticket.status,
            priorityFlag=priority_flag,
            calculatedPriorityScore=round(total_score, 2),
            targetReadyTime=format_iso_time(target_ready_dt),
            estimatedCompletionTime=format_iso_time(est_completion_dt),
            sequenceOrder=0,
            items=scored_items,
        )

        all_scored_tickets.append(scored_output)

        if ticket.station not in station_tickets:
            station_tickets[ticket.station] = []
        station_tickets[ticket.station].append(scored_output)

    # Sort each station queue by calculatedPriorityScore descending
    for stn, t_list in station_tickets.items():
        t_list.sort(key=lambda x: x.calculatedPriorityScore, reverse=True)
        for idx, t in enumerate(t_list):
            t.sequenceOrder = idx + 1

    # Sort global tickets list by calculatedPriorityScore descending
    all_scored_tickets.sort(key=lambda x: x.calculatedPriorityScore, reverse=True)
    for idx, t in enumerate(all_scored_tickets):
        if not req.stationFilter:
            t.sequenceOrder = idx + 1

    return KitchenScheduleResponse(
        restaurantId=req.restaurantId,
        rescoredAt=format_iso_time(now),
        totalActiveTickets=len(all_scored_tickets),
        stationQueues=station_tickets,
        tickets=all_scored_tickets,
        atRiskCount=at_risk_count,
        lateCount=late_count,
    )
