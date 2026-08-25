import React from 'react';
import { Flame, Layers, Utensils, CheckSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * BatchCookingSummary — Aggregates pending/preparing order items across all active tickets
 * for the selected kitchen station. Enables chefs to batch-cook identical dishes
 * (e.g. baking 5 Naans simultaneously across multiple table orders).
 */
export default function BatchCookingSummary({
  stationName = 'Kitchen Station',
  tickets = [],
  onItemStatusChange,
  isReadOnly = false,
}) {
  // Aggregate items across active preparing/pending tickets
  const itemMap = new Map();

  (tickets || []).forEach((ticket) => {
    const tableNum =
      ticket.table?.tableNumber ??
      ticket.table?.tableName ??
      (typeof ticket.table === 'number' || (typeof ticket.table === 'string' && !ticket.table.match(/^[0-9a-fA-F]{24}$/)) ? ticket.table : null) ??
      ticket.tableNumber ??
      ticket.order?.table?.tableNumber ??
      ticket.order?.tableNumber ??
      'Takeout';

    const customerName =
      ticket.customerName ||
      ticket.customer?.fullName ||
      ticket.order?.customerName ||
      ticket.order?.customer?.fullName ||
      ticket.order?.currentHostName;

    (ticket.items || []).forEach((item) => {
      if (['Pending', 'Preparing', 'Delayed'].includes(item.kitchenStatus)) {
        const key = item.itemName;
        const existing = itemMap.get(key) || {
          itemName: key,
          totalQty: 0,
          orders: [],
        };

        existing.totalQty += item.quantity || 1;
        existing.orders.push({
          ticketId: ticket._id,
          itemId: item._id,
          ticketNumber: ticket.ticketNumber,
          table: tableNum,
          customerName,
          quantity: item.quantity || 1,
          createdAt: ticket.createdAt,
          kitchenStatus: item.kitchenStatus,
        });

        itemMap.set(key, existing);
      }
    });
  });

  const batchList = Array.from(itemMap.values()).sort((a, b) => b.totalQty - a.totalQty);

  if (batchList.length === 0) return null;

  return (
    <Card className="border-2 border-amber-500/40 bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-primary/5 shadow-sm overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Header Title */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Flame className="h-4 w-4 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span>Smart Batch Cooking Console</span>
                <span className="text-[10px] font-mono bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold">
                  {stationName}
                </span>
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Consolidated batch quantities across active table orders (cook identical items together to avoid delay)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold font-mono text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
            <Layers className="h-3.5 w-3.5" />
            <span>{batchList.length} Unique Dish Batches</span>
          </div>
        </div>

        {/* Batch Items Chips Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {batchList.map((batch) => (
            <div
              key={batch.itemName}
              className="bg-card border border-amber-500/30 rounded-xl p-3 shadow-2xs hover:border-amber-500/60 transition-all space-y-2 flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-xs text-foreground line-clamp-1 flex items-center gap-1">
                    <Utensils className="h-3 w-3 text-amber-500 shrink-0" />
                    {batch.itemName}
                  </span>
                  <span className="text-xs font-extrabold font-mono text-white bg-amber-600 dark:bg-amber-500 px-2 py-0.5 rounded-md shrink-0 shadow-2xs">
                    x{batch.totalQty} TOTAL
                  </span>
                </div>

                {/* Table Breakdown */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {batch.orders.map((o, idx) => (
                    <span
                      key={`${o.ticketId}-${idx}`}
                      className="text-[10px] font-mono bg-muted/80 text-foreground px-1.5 py-0.5 rounded border border-border/50 flex items-center gap-1"
                    >
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        T{o.table}{o.customerName ? ` (${o.customerName})` : ''}
                      </span>
                      <span className="text-muted-foreground">({o.quantity}x)</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Batch Action */}
              {!isReadOnly && onItemStatusChange && (
                <div className="pt-1 border-t border-border/30 flex justify-end">
                  <Button
                    size="xs"
                    variant="outline"
                    className="h-6 text-[9px] font-bold gap-1 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                    onClick={() => {
                      batch.orders.forEach((o) => {
                        onItemStatusChange(o.ticketId, o.itemId, 'Ready');
                      });
                    }}
                  >
                    <CheckSquare className="h-3 w-3" /> Mark All x{batch.totalQty} Ready
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
