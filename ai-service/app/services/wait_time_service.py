from app.models.wait_time import WaitTimeRequest, WaitTimeResponse


def calculate_wait_time(req: WaitTimeRequest) -> WaitTimeResponse:
    # Queuing theory model for wait times
    queue_min = max(5, req.active_orders_count * 2)
    table_wait_min = max(0, (req.occupied_tables_count * 4) + (req.party_size * 2))
    kitchen_delay_min = max(3, req.kitchen_pending_tickets * 3)

    if req.active_orders_count > 15 or req.kitchen_pending_tickets > 10:
        status = "High Traffic"
    elif req.active_orders_count > 8 or req.kitchen_pending_tickets > 5:
        status = "Moderate Delay"
    else:
        status = "Normal"

    return WaitTimeResponse(
        estimated_queue_time_minutes=queue_min,
        estimated_table_wait_time_minutes=table_wait_min,
        estimated_kitchen_delay_minutes=kitchen_delay_min,
        confidence_score=0.89,
        status=status,
    )
