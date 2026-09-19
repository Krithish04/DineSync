import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Move, Save, RotateCcw, Users, QrCode, Eye, LogOut, CheckCircle2,
  Sparkles, Layers, Compass, Grid, Maximize2, Coffee, Utensils, Wine, Bell, CreditCard, ShieldAlert, Lock,
  AlertTriangle, Accessibility, ChevronUp, ChevronDown, Plus, Trash2, Palette, Link2, HelpCircle, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

const ZONE_COLORS = [
  { name: 'Sky Blue', value: 'border-sky-500/40 bg-sky-500/10 text-sky-300 headerBg: bg-sky-950/90' },
  { name: 'Emerald', value: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 headerBg: bg-emerald-950/90' },
  { name: 'Purple', value: 'border-purple-500/40 bg-purple-500/10 text-purple-300 headerBg: bg-purple-950/90' },
  { name: 'Amber', value: 'border-amber-500/40 bg-amber-500/10 text-amber-300 headerBg: bg-amber-950/90' },
  { name: 'Rose', value: 'border-rose-500/40 bg-rose-500/10 text-rose-300 headerBg: bg-rose-950/90' },
  { name: 'Teal', value: 'border-teal-500/40 bg-teal-500/10 text-teal-300 headerBg: bg-teal-950/90' },
];

const SHAPES = [
  { value: 'Square', label: 'Square Table' },
  { value: 'Round', label: 'Round Table' },
  { value: 'Rectangle', label: 'Long Rectangle' },
  { value: 'Booth', label: 'Plush Booth' },
];

// 8 Distinct Non-Colliding Status Colors & Icon Pairings
const REALTIME_STATUS_THEMES = {
  Available: {
    label: 'Available (Empty)',
    nodeBg: 'bg-emerald-950/90 border-emerald-400 text-emerald-100',
    badgeBg: 'bg-emerald-400 text-slate-950 font-black',
    glow: 'shadow-[0_0_18px_rgba(16,185,129,0.35)]',
    seatColor: 'bg-emerald-400/80 border-emerald-300',
    dot: 'bg-emerald-400',
    icon: CheckCircle2,
  },
  Occupied: {
    label: 'Occupied (Diner Seated)',
    nodeBg: 'bg-orange-950/90 border-orange-400 text-orange-100',
    badgeBg: 'bg-orange-500 text-slate-950 font-black',
    glow: 'shadow-[0_0_22px_rgba(249,115,22,0.4)] ring-2 ring-orange-400/50 animate-pulse',
    seatColor: 'bg-orange-400/80 border-orange-300',
    dot: 'bg-orange-500',
    icon: Users,
  },
  'Needs Attention': {
    label: 'Needs Attention 🛎️',
    nodeBg: 'bg-rose-950/90 border-rose-400 text-rose-100',
    badgeBg: 'bg-rose-500 text-white font-black animate-bounce',
    glow: 'shadow-[0_0_25px_rgba(244,63,94,0.5)] ring-2 ring-rose-400/60',
    seatColor: 'bg-rose-500/80 border-rose-300',
    dot: 'bg-rose-500',
    icon: Bell,
  },
  'Bill Requested': {
    label: 'Bill Requested 💳',
    nodeBg: 'bg-purple-950/90 border-purple-400 text-purple-100',
    badgeBg: 'bg-purple-400 text-slate-950 font-black',
    glow: 'shadow-[0_0_20px_rgba(168,85,247,0.4)] ring-2 ring-purple-400/50',
    seatColor: 'bg-purple-400/80 border-purple-300',
    dot: 'bg-purple-400',
    icon: CreditCard,
  },
  Reserved: {
    label: 'Reserved Table',
    nodeBg: 'bg-cyan-950/90 border-cyan-400 text-cyan-100',
    badgeBg: 'bg-cyan-400 text-slate-950 font-black',
    glow: 'shadow-[0_0_16px_rgba(6,182,212,0.35)]',
    seatColor: 'bg-cyan-400/80 border-cyan-300',
    dot: 'bg-cyan-400',
    icon: Lock,
  },
  Cleaning: {
    label: 'Cleaning in Progress',
    nodeBg: 'bg-amber-950/90 border-amber-400 text-amber-100',
    badgeBg: 'bg-amber-400 text-slate-950 font-black',
    glow: 'shadow-[0_0_15px_rgba(251,191,36,0.35)]',
    seatColor: 'bg-amber-400/80 border-amber-300',
    dot: 'bg-amber-400',
    icon: Sparkles,
  },
  Maintenance: {
    label: 'Out of Service',
    nodeBg: 'bg-red-950/90 border-red-700 text-red-100 opacity-90',
    badgeBg: 'bg-red-700 text-white font-bold',
    glow: 'ring-2 ring-red-700/50',
    seatColor: 'bg-red-700/80 border-red-600',
    dot: 'bg-red-700',
    icon: ShieldAlert,
  },
  Inactive: {
    label: 'Inactive Table',
    nodeBg: 'bg-slate-900/60 border-slate-700 text-slate-400 opacity-50',
    badgeBg: 'bg-slate-700 text-slate-300 font-bold',
    glow: '',
    seatColor: 'bg-slate-700 border-slate-600',
    dot: 'bg-slate-500',
    icon: LogOut,
  },
};

const DEFAULT_ZONES = [
  { id: 'z1', name: 'Main Dining Hall', colorIndex: 0, posX: 20, posY: 50, width: 440, height: 250 },
  { id: 'z2', name: 'Outdoor Patio Deck', colorIndex: 1, posX: 475, posY: 50, width: 440, height: 250 },
  { id: 'z3', name: 'VIP Lounge & Private', colorIndex: 2, posX: 20, posY: 315, width: 440, height: 265 },
  { id: 'z4', name: 'Bar Counter Area', colorIndex: 3, posX: 475, posY: 315, width: 440, height: 265 },
];

export default function ArchitecturalFloorPlan({
  tables = [],
  canManage = false,
  onStatusChange,
  onViewOrder,
  onQrClick,
  onEditTable,
  onSaveLayout,
  isSavingLayout = false,
}) {
  const [selectedZone, setSelectedZone] = useState('All');
  const [isEditMode, setIsEditMode] = useState(false);
  const [localTables, setLocalTables] = useState([]);
  const [activeTable, setActiveTable] = useState(null);

  // Custom Manager Zones State (Data-driven blank canvas zones)
  const [customZones, setCustomZones] = useState(() => {
    try {
      const saved = localStorage.getItem('dinesync_custom_zones');
      return saved ? JSON.parse(saved) : DEFAULT_ZONES;
    } catch {
      return DEFAULT_ZONES;
    }
  });

  // Pointer & Drag State
  const [dragState, setDragState] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(true);
  const [newZoneName, setNewZoneName] = useState('');
  const [isAddingZone, setIsAddingZone] = useState(false);

  // Zone Deletion Confirmation Target Modal State
  const [zoneToDeleteTarget, setZoneToDeleteTarget] = useState(null);

  // Draggable Canvas Fixtures
  const [fixtures, setFixtures] = useState([]);

  const canvasRef = useRef(null);

  // Helper to normalize table ID format safely (supports _id ObjectId, _id string, id string)
  const getTableId = (t) => (t?._id ? String(t._id) : t?.id ? String(t.id) : null);

  // Auto-detect containing zone for a table based on center coordinate
  const detectZoneForTable = (posX, posY, shape, zonesList) => {
    const width = shape === 'Rectangle' ? 125 : shape === 'Booth' ? 115 : 105;
    const height = shape === 'Round' ? 95 : 75;
    const centerX = posX + width / 2;
    const centerY = posY + height / 2;

    const matched = zonesList.find(
      (z) =>
        centerX >= z.posX &&
        centerX <= z.posX + z.width &&
        centerY >= z.posY &&
        centerY <= z.posY + z.height
    );

    return matched ? matched.name : 'Unassigned / Open Floor';
  };

  // Helper to read local storage saved positions fallback
  const getSavedPosition = (tId) => {
    try {
      const savedStr = localStorage.getItem('dinesync_saved_table_positions');
      if (savedStr) {
        const map = JSON.parse(savedStr);
        return map[tId];
      }
    } catch {
      // Ignore read errors
    }
    return null;
  };

  // Synchronize local table state when tables prop changes from backend/parent without snap-back
  useEffect(() => {
    setLocalTables((prevLocal) => {
      return tables.map((t) => {
        const tId = getTableId(t);
        const savedPos = getSavedPosition(tId);
        const existingLocal = prevLocal?.find((l) => getTableId(l) === tId);

        const posX = existingLocal?.positionX ?? savedPos?.positionX ?? t.positionX ?? 100;
        const posY = existingLocal?.positionY ?? savedPos?.positionY ?? t.positionY ?? 100;
        const shape = existingLocal?.shape ?? savedPos?.shape ?? t.shape;
        const zone = existingLocal?.zone ?? savedPos?.zone ?? t.zone;

        const detected = detectZoneForTable(posX, posY, shape, customZones);

        return {
          ...t,
          ...(existingLocal || {}),
          positionX: posX,
          positionY: posY,
          shape: shape || 'Square',
          zone: zone || detected,
        };
      });
    });
  }, [tables, customZones]);

  // Persist custom zones to localStorage whenever modified
  useEffect(() => {
    try {
      localStorage.setItem('dinesync_custom_zones', JSON.stringify(customZones));
    } catch {
      // Ignore localStorage write errors
    }
  }, [customZones]);

  // Filtered zone list for top control bar
  const availableZoneNames = useMemo(() => {
    const names = customZones.map((z) => z.name);
    return ['All', ...names, 'Unassigned / Open Floor'];
  }, [customZones]);

  const filteredTables = localTables.filter((t) => {
    if (selectedZone === 'All' || isEditMode) return true;
    const currentZone = t.zone || 'Unassigned / Open Floor';
    return currentZone === selectedZone;
  });

  // Collision detection between tables on canvas
  const collisions = useMemo(() => {
    const collidingSet = new Set();
    const collisionPairs = [];

    for (let i = 0; i < filteredTables.length; i++) {
      for (let j = i + 1; j < filteredTables.length; j++) {
        const t1 = filteredTables[i];
        const t2 = filteredTables[j];
        const t1Id = getTableId(t1);
        const t2Id = getTableId(t2);

        const x1 = t1.positionX || 100;
        const y1 = t1.positionY || 100;
        const x2 = t2.positionX || 100;
        const y2 = t2.positionY || 100;

        const width1 = t1.shape === 'Rectangle' ? 125 : t1.shape === 'Booth' ? 115 : 105;
        const height1 = t1.shape === 'Round' ? 95 : 75;

        const width2 = t2.shape === 'Rectangle' ? 125 : t2.shape === 'Booth' ? 115 : 105;
        const height2 = t2.shape === 'Round' ? 95 : 75;

        const dx = Math.abs(x1 - x2);
        const dy = Math.abs(y1 - y2);

        if (dx < (width1 / 2 + width2 / 2 - 12) && dy < (height1 / 2 + height2 / 2 - 12)) {
          if (t1Id) collidingSet.add(t1Id);
          if (t2Id) collidingSet.add(t2Id);
          collisionPairs.push(`Table ${t1.tableNumber} & Table ${t2.tableNumber}`);
        }
      }
    }

    return { set: collidingSet, pairs: collisionPairs };
  }, [filteredTables]);

  // Single-click Auto-Unstack Overlapping Tables Helper (Phase 3)
  const handleUnstackCollisions = () => {
    setLocalTables((prev) => {
      const updated = [...prev];
      for (let i = 0; i < updated.length; i++) {
        for (let j = i + 1; j < updated.length; j++) {
          const t1 = updated[i];
          const t2 = updated[j];

          const dx = Math.abs((t1.positionX || 100) - (t2.positionX || 100));
          const dy = Math.abs((t1.positionY || 100) - (t2.positionY || 100));

          if (dx < 90 && dy < 70) {
            // Nudge t2 to the right to resolve collision
            const newX = Math.min(840, (t2.positionX || 100) + 130);
            const autoZone = detectZoneForTable(newX, t2.positionY || 100, t2.shape, customZones);
            updated[j] = {
              ...t2,
              positionX: newX,
              zone: autoZone,
            };
          }
        }
      }
      return updated;
    });
    setHasUnsavedChanges(true);
  };

  // Compute merged table groups for visual boundary rendering (Fixed Phase 2: Adjacent tables only <= 240px)
  const mergedGroups = useMemo(() => {
    const groups = [];
    const processed = new Set();

    localTables.forEach((t) => {
      const tId = getTableId(t);
      if (!tId || processed.has(tId)) return;

      if (t.mergedTables && t.mergedTables.length > 0) {
        const groupTableIds = [tId, ...t.mergedTables.map((st) => (typeof st === 'object' ? getTableId(st) : String(st)))];
        groupTableIds.forEach((id) => processed.add(id));

        const groupNodes = localTables.filter((node) => groupTableIds.includes(getTableId(node)));
        if (groupNodes.length > 1) {
          const minX = Math.min(...groupNodes.map((n) => n.positionX || 100)) - 15;
          const minY = Math.min(...groupNodes.map((n) => n.positionY || 100)) - 15;
          const maxX = Math.max(...groupNodes.map((n) => (n.positionX || 100) + 110)) + 15;
          const maxY = Math.max(...groupNodes.map((n) => (n.positionY || 100) + 80)) + 15;

          const spanW = maxX - minX;
          const spanH = maxY - minY;

          // Only render bounding box if merged tables are adjacent (<= 320px span) to avoid stray cross-zone line artifacts
          if (spanW <= 320 && spanH <= 240) {
            groups.push({
              primaryId: tId,
              primaryNumber: t.tableNumber,
              tableCount: groupNodes.length,
              totalCap: groupNodes.reduce((sum, n) => sum + (n.capacity || 0), 0),
              posX: minX,
              posY: minY,
              width: spanW,
              height: spanH,
            });
          }
        }
      }
    });

    return groups;
  }, [localTables]);

  // Unified Pointer Event Mechanics (Touch + Mouse with setPointerCapture)
  const handlePointerDown = (e, id, type, itemData = {}) => {
    if (!isEditMode) return;
    e.stopPropagation();
    e.preventDefault();

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const pointerX = e.clientX - canvasRect.left;
    const pointerY = e.clientY - canvasRect.top;

    if (e.currentTarget && e.pointerId !== undefined) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Fallback for pointer capture
      }
    }

    const startX = itemData.posX ?? itemData.positionX ?? 100;
    const startY = itemData.posY ?? itemData.positionY ?? 100;

    const dragId = String(id);

    if (type === 'table') {
      console.log(`[DRAG_START] Table ID: ${dragId} | Start Pos: (${startX}, ${startY})`);
    }

    setDragState({
      id: dragId,
      type,
      pointerId: e.pointerId,
      startX: pointerX,
      startY: pointerY,
      origX: startX,
      origY: startY,
      origW: itemData.width ?? 300,
      origH: itemData.height ?? 200,
    });
  };

  const handlePointerMove = (e) => {
    if (!dragState || !canvasRef.current || !isEditMode) return;
    e.preventDefault();

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const currentX = e.clientX - canvasRect.left;
    const currentY = e.clientY - canvasRect.top;

    const deltaX = currentX - dragState.startX;
    const deltaY = currentY - dragState.startY;

    if (dragState.type === 'table') {
      const rawX = dragState.origX + deltaX;
      const rawY = dragState.origY + deltaY;

      // 10px Grid Snapping
      const snapX = Math.max(10, Math.min(Math.round(rawX / 10) * 10, canvasRect.width - 120));
      const snapY = Math.max(45, Math.min(Math.round(rawY / 10) * 10, canvasRect.height - 80));

      const targetTable = localTables.find((t) => getTableId(t) === String(dragState.id));
      const autoZone = detectZoneForTable(snapX, snapY, targetTable?.shape || 'Square', customZones);

      setLocalTables((prev) =>
        prev.map((t) =>
          getTableId(t) === String(dragState.id)
            ? { ...t, positionX: snapX, positionY: snapY, zone: autoZone }
            : t
        )
      );
      setHasUnsavedChanges(true);
    } else if (dragState.type === 'fixture') {
      const rawX = dragState.origX + deltaX;
      const rawY = dragState.origY + deltaY;

      const snapX = Math.max(10, Math.min(Math.round(rawX / 10) * 10, canvasRect.width - 120));
      const snapY = Math.max(45, Math.min(Math.round(rawY / 10) * 10, canvasRect.height - 50));

      setFixtures((prev) =>
        prev.map((f) => (f.id === dragState.id ? { ...f, posX: snapX, posY: snapY } : f))
      );
      setHasUnsavedChanges(true);
    } else if (dragState.type === 'zone') {
      const rawX = dragState.origX + deltaX;
      const rawY = dragState.origY + deltaY;

      const snapX = Math.max(10, Math.min(Math.round(rawX / 10) * 10, canvasRect.width - dragState.origW));
      const snapY = Math.max(45, Math.min(Math.round(rawY / 10) * 10, canvasRect.height - dragState.origH));

      const updatedZones = customZones.map((z) =>
        z.id === dragState.id ? { ...z, posX: snapX, posY: snapY } : z
      );
      setCustomZones(updatedZones);

      // Re-evaluate table zones based on updated zone position
      setLocalTables((prev) =>
        prev.map((t) => {
          const autoZone = detectZoneForTable(t.positionX || 100, t.positionY || 100, t.shape, updatedZones);
          return { ...t, zone: autoZone };
        })
      );
      setHasUnsavedChanges(true);
    } else if (dragState.type === 'zone-resize') {
      const rawW = dragState.origW + deltaX;
      const rawH = dragState.origH + deltaY;

      const snapW = Math.max(180, Math.round(rawW / 10) * 10);
      const snapH = Math.max(120, Math.round(rawH / 10) * 10);

      const updatedZones = customZones.map((z) =>
        z.id === dragState.id ? { ...z, width: snapW, height: snapH } : z
      );
      setCustomZones(updatedZones);

      // Re-evaluate table zones based on resized zone dimensions
      setLocalTables((prev) =>
        prev.map((t) => {
          const autoZone = detectZoneForTable(t.positionX || 100, t.positionY || 100, t.shape, updatedZones);
          return { ...t, zone: autoZone };
        })
      );
      setHasUnsavedChanges(true);
    }
  };

  const handlePointerUp = (e) => {
    if (dragState) {
      if (e?.currentTarget && dragState.pointerId !== undefined) {
        try {
          e.currentTarget.releasePointerCapture(dragState.pointerId);
        } catch {
          // Pointer capture release cleanup
        }
      }
      const wasTableDrag = dragState.type === 'table';
      const draggedId = dragState.id;
      setDragState(null);

      // Auto-save on table drop so position changes persist immediately
      if (wasTableDrag && onSaveLayout) {
        const targetTable = localTables.find((t) => getTableId(t) === String(draggedId));
        console.log(
          `[DRAG_END/DROP] Table ID: ${draggedId} | Drop Pos: (${targetTable?.positionX}, ${targetTable?.positionY})`
        );

        const layoutItems = localTables.map((t) => ({
          _id: getTableId(t),
          positionX: t.positionX ?? 100,
          positionY: t.positionY ?? 100,
          shape: t.shape || 'Square',
          zone: t.zone || 'Unassigned / Open Floor',
          isAccessible: Boolean(t.isAccessible),
          rotation: t.rotation || 0,
          width: t.width || 90,
          height: t.height || 90,
        }));

        const draggedPayloadItem = layoutItems.find((item) => String(item._id) === String(draggedId));
        console.log(
          `[PAYLOAD_SENT] Payload item for Table ${draggedId}:`,
          draggedPayloadItem
        );

        onSaveLayout(layoutItems, true)
          .then(() => {
            console.log(`[SAVE_SUCCESS] Auto-save background resolved for Table ID: ${draggedId}`);
          })
          .catch((err) => console.error('Auto-save table layout failed:', err));
      }
    }
  };

  // Add a new custom zone to blank canvas
  const handleAddZone = () => {
    if (!newZoneName.trim()) return;
    const newZone = {
      id: `z-${Date.now()}`,
      name: newZoneName.trim(),
      colorIndex: customZones.length % ZONE_COLORS.length,
      posX: 100 + (customZones.length * 30) % 300,
      posY: 100 + (customZones.length * 30) % 200,
      width: 320,
      height: 220,
    };
    setCustomZones((prev) => [...prev, newZone]);
    setNewZoneName('');
    setIsAddingZone(false);
    setHasUnsavedChanges(true);
  };

  // Open Zone Deletion Confirmation Dialog
  const handleRequestDeleteZone = (zoneObj) => {
    const affectedTables = localTables.filter((t) => t.zone === zoneObj.name);
    setZoneToDeleteTarget({
      ...zoneObj,
      affectedCount: affectedTables.length,
      affectedTableNumbers: affectedTables.map((t) => t.tableNumber).join(', '),
    });
  };

  // Confirm Zone Deletion & Reassign Tables to 'Unassigned / Open Floor'
  const handleConfirmDeleteZone = () => {
    if (!zoneToDeleteTarget) return;

    const zoneName = zoneToDeleteTarget.name;
    const updatedZones = customZones.filter((z) => z.id !== zoneToDeleteTarget.id);
    setCustomZones(updatedZones);

    // Reassign tables in deleted zone to 'Unassigned / Open Floor'
    setLocalTables((prev) =>
      prev.map((t) => (t.zone === zoneName ? { ...t, zone: 'Unassigned / Open Floor' } : t))
    );

    setZoneToDeleteTarget(null);
    setHasUnsavedChanges(true);
  };

  const handleSavePositions = async () => {
    if (!onSaveLayout) return;
    const layoutItems = localTables.map((t) => ({
      _id: getTableId(t),
      positionX: t.positionX ?? 100,
      positionY: t.positionY ?? 100,
      shape: t.shape || 'Square',
      zone: t.zone || 'Unassigned / Open Floor',
      isAccessible: Boolean(t.isAccessible),
      rotation: t.rotation || 0,
      width: t.width || 90,
      height: t.height || 90,
    }));

    // Cache saved position map locally so re-entering Edit Mode remembers exact layout positions
    try {
      const positionMap = layoutItems.reduce((acc, item) => {
        acc[item._id] = { positionX: item.positionX, positionY: item.positionY, zone: item.zone, shape: item.shape };
        return acc;
      }, {});
      localStorage.setItem('dinesync_saved_table_positions', JSON.stringify(positionMap));
    } catch {
      // Ignore cache write error
    }

    await onSaveLayout(layoutItems);
    setHasUnsavedChanges(false);
    setIsEditMode(false);
  };

  const handleShapeChange = (tableId, newShape) => {
    setLocalTables((prev) =>
      prev.map((t) => (getTableId(t) === String(tableId) ? { ...t, shape: newShape } : t))
    );
    setHasUnsavedChanges(true);
  };

  // Inspector Zone Change -> Moves table into selected Zone box!
  const handleZoneChange = (tableId, newZone) => {
    const targetZoneObj = customZones.find((z) => z.name === newZone);

    setLocalTables((prev) =>
      prev.map((t) => {
        if (getTableId(t) !== String(tableId)) return t;

        if (targetZoneObj) {
          // Move table to center of target zone box
          const width = t.shape === 'Rectangle' ? 125 : t.shape === 'Booth' ? 115 : 105;
          const height = t.shape === 'Round' ? 95 : 75;

          const newX = Math.round((targetZoneObj.posX + targetZoneObj.width / 2 - width / 2) / 10) * 10;
          const newY = Math.round((targetZoneObj.posY + targetZoneObj.height / 2 - height / 2) / 10) * 10;

          return { ...t, zone: newZone, positionX: newX, positionY: newY };
        }
        return { ...t, zone: newZone };
      })
    );
    setHasUnsavedChanges(true);
  };

  const handleAccessibleToggle = (tableId, isAccessible) => {
    setLocalTables((prev) =>
      prev.map((t) => (getTableId(t) === String(tableId) ? { ...t, isAccessible } : t))
    );
    setHasUnsavedChanges(true);
  };

  // Node tap handler
  const handleTableNodeClick = (table) => {
    if (isEditMode) {
      setActiveTable(getTableId(activeTable) === getTableId(table) ? null : table);
    } else {
      if (onViewOrder) {
        onViewOrder(table);
      } else {
        setActiveTable(table);
      }
    }
  };

  // Render accurate perimeter seat dots based on table capacity
  const renderPerimeterSeats = (capacity, seatColor) => {
    const cap = Math.max(1, parseInt(capacity, 10) || 2);

    // For capacity <= 6: Render exact perimeter dots
    if (cap <= 6) {
      const topCount = Math.ceil(cap / 2);
      const bottomCount = Math.floor(cap / 2);

      return (
        <>
          {/* Top perimeter seats */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-1 z-10 pointer-events-none">
            {Array.from({ length: topCount }).map((_, i) => (
              <div key={`top-${i}`} className={`h-2.5 w-2.5 rounded-full border shadow-sm ${seatColor}`} />
            ))}
          </div>
          {/* Bottom perimeter seats */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10 pointer-events-none">
            {Array.from({ length: bottomCount }).map((_, i) => (
              <div key={`bot-${i}`} className={`h-2.5 w-2.5 rounded-full border shadow-sm ${seatColor}`} />
            ))}
          </div>
        </>
      );
    }

    // For capacity >= 7: Render 4 corner dots + explicit numeric capacity indicator
    return (
      <>
        <div className="absolute -top-1.5 -left-1.5 z-10 pointer-events-none">
          <div className={`h-2.5 w-2.5 rounded-full border shadow-sm ${seatColor}`} />
        </div>
        <div className="absolute -top-1.5 -right-1.5 z-10 pointer-events-none">
          <div className={`h-2.5 w-2.5 rounded-full border shadow-sm ${seatColor}`} />
        </div>
        <div className="absolute -bottom-1.5 -left-1.5 z-10 pointer-events-none">
          <div className={`h-2.5 w-2.5 rounded-full border shadow-sm ${seatColor}`} />
        </div>
        <div className="absolute -bottom-1.5 -right-1.5 z-10 pointer-events-none">
          <div className={`h-2.5 w-2.5 rounded-full border shadow-sm ${seatColor}`} />
        </div>
      </>
    );
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Top Header Bar: Service Mode Indicator, Zone Filters & Manager Controls */}
      <div className="bg-card border border-border/60 p-3.5 rounded-2xl shadow-sm space-y-3">
        {/* Top Row: Mode Toggle Switch & Manager Action Buttons */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Mode Toggle Switch: Live Service View vs Edit Layout */}
          <div className="flex items-center h-10 bg-muted/70 p-1 rounded-2xl border border-border/60">
            <Button
              variant={!isEditMode ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setIsEditMode(false);
                setLocalTables(tables);
                setHasUnsavedChanges(false);
              }}
              className={`h-8 text-xs font-bold rounded-xl gap-1.5 px-3.5 transition-all ${
                !isEditMode ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-300 animate-ping" />
              Live Service Floor View
            </Button>

            {canManage && (
              <Button
                variant={isEditMode ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setIsEditMode(true)}
                className={`h-8 text-xs font-bold rounded-xl gap-1.5 px-3.5 transition-all ${
                  isEditMode ? 'bg-amber-600 text-white shadow-sm' : 'text-muted-foreground'
                }`}
              >
                <Move size={14} /> Edit Layout Mode
              </Button>
            )}
          </div>

          {/* Manager Actions: Add Custom Zone & Save Layout (Edit mode only) */}
          {isEditMode && canManage && (
            <div className="flex items-center gap-2 flex-wrap">
              {!isAddingZone ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingZone(true)}
                  className="h-10 text-xs rounded-2xl border-dashed border-sky-500/50 text-sky-600 dark:text-sky-400 gap-1.5 font-bold hover:bg-sky-500/10 px-4"
                >
                  <Plus size={14} /> Add Zone
                </Button>
              ) : (
                <div className="flex items-center gap-1.5 h-10">
                  <input
                    type="text"
                    placeholder="Zone Name..."
                    value={newZoneName}
                    onChange={(e) => setNewZoneName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddZone()}
                    className="h-10 text-xs bg-background border rounded-xl px-3 font-bold w-36 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  <Button size="sm" onClick={handleAddZone} className="h-10 text-xs bg-sky-600 text-white rounded-xl font-bold px-3">
                    Add
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsAddingZone(false)} className="h-10 text-xs text-muted-foreground px-2">
                    Cancel
                  </Button>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLocalTables(tables);
                  setHasUnsavedChanges(false);
                  setIsEditMode(false);
                }}
                className="h-10 text-xs rounded-2xl gap-1.5 font-bold px-4"
              >
                <RotateCcw size={14} /> Cancel
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={handleSavePositions}
                disabled={isSavingLayout}
                className="h-10 text-xs rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-bold shadow-md shadow-emerald-600/20 px-5"
              >
                {isSavingLayout ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Save size={14} />
                )}
                Save Layout
              </Button>
            </div>
          )}
        </div>

        {/* Bottom Row: Zone Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none pt-2 border-t border-border/40">
          <span className="text-xs font-bold text-muted-foreground mr-1 flex items-center gap-1 shrink-0">
            <Compass size={14} className="text-primary" /> Filter Zone:
          </span>
          {availableZoneNames.map((zone) => (
            <Button
              key={zone}
              variant={selectedZone === zone ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedZone(zone)}
              className={`h-7 text-xs rounded-xl font-bold transition-all shrink-0 ${selectedZone === zone
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'hover:bg-muted text-muted-foreground'
                }`}
            >
              {zone}
            </Button>
          ))}
        </div>
      </div>

      {/* Collision Warning Banner with Auto-Unstack Action Button (Phase 3) */}
      {collisions.pairs.length > 0 && (
        <div className="bg-rose-950/90 border border-rose-500/80 text-rose-200 text-xs px-4 py-2.5 rounded-xl flex items-center justify-between font-bold shadow-lg animate-pulse gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>
              <strong>Table Collision Alert:</strong> {collisions.pairs.join(', ')} are overlapping!
            </span>
          </div>

          <Button
            size="sm"
            onClick={handleUnstackCollisions}
            className="h-7 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-lg px-3 font-bold gap-1 shrink-0 shadow-sm"
          >
            <Sparkles size={12} /> Auto-Unstack Tables
          </Button>
        </div>
      )}

      {/* Edit Mode Active Banner */}
      {isEditMode && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 font-medium shadow-xs">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping shrink-0" />
          <span>
            <strong>FREEFORM EDIT MODE ACTIVE</strong> — Drag tables into zone boxes to auto-assign floor zones, or position freely.
          </span>
        </div>
      )}

      {/* Live Floor Canvas Container */}
      <div className="relative w-full rounded-3xl border-2 border-slate-800 bg-slate-950 p-2 shadow-2xl overflow-hidden select-none touch-none">
        {/* Top Canvas Bar */}
        <div className="w-full bg-slate-900/90 border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between text-[11px] font-mono text-slate-400 z-10 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-slate-200 font-bold">
              <Grid size={14} className="text-emerald-400" /> DineSync Freeform Blueprint Canvas
            </span>
            <span className="text-slate-700">|</span>
            <span className="text-slate-400">
              {!isEditMode ? 'Tap table to inspect live session drawer' : 'Drag tables into zone boxes to auto-connect floor zones'}
            </span>
          </div>
        </div>

        {/* Blueprint Canvas Grid */}
        <div
          ref={canvasRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="relative w-full h-[620px] bg-slate-950 overflow-hidden"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px)
            `,
            backgroundSize: '25px 25px',
          }}
        >
          {/* Render Manager-Defined Custom Zones (Data-Driven Blank Canvas Zones) */}
          {customZones.map((z) => {
            const colorTheme = ZONE_COLORS[z.colorIndex % ZONE_COLORS.length] || ZONE_COLORS[0];
            return (
              <div
                key={z.id}
                onPointerDown={(e) => handlePointerDown(e, z.id, 'zone', z)}
                style={{
                  transform: `translate(${z.posX}px, ${z.posY}px)`,
                  width: `${z.width}px`,
                  height: `${z.height}px`,
                  cursor: isEditMode ? 'grab' : 'default',
                  touchAction: 'none',
                }}
                className={`absolute border-2 border-dashed rounded-3xl p-3 backdrop-blur-xs transition-shadow ${colorTheme.value} ${isEditMode ? 'hover:border-solid hover:shadow-lg' : 'pointer-events-none'
                  }`}
              >
                {/* Zone Title Header */}
                <div className="flex items-center justify-between pointer-events-auto">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-950/90 border border-slate-700 text-slate-200 text-[10px] font-extrabold uppercase tracking-wider rounded-lg shadow-sm">
                    <Utensils size={12} /> {z.name}
                  </div>

                  {isEditMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRequestDeleteZone(z);
                      }}
                      className="p-1 rounded-md text-rose-400 hover:bg-rose-500/20 transition-colors pointer-events-auto"
                      title="Delete Zone Boundary"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                {/* Zone Resize Handle (Edit mode only) */}
                {isEditMode && (
                  <div
                    onPointerDown={(e) => handlePointerDown(e, z.id, 'zone-resize', z)}
                    className="absolute bottom-1 right-1 h-5 w-5 bg-slate-800 border border-slate-600 rounded-br-2xl cursor-se-resize flex items-center justify-center text-[10px] text-slate-400 hover:text-white pointer-events-auto"
                    title="Drag to resize zone boundary"
                  >
                    ↘
                  </div>
                )}
              </div>
            );
          })}

          {/* Render Visual Boundaries for Merged Table Groups (Adjacent tables <= 320px) */}
          {mergedGroups.map((mg) => (
            <div
              key={`merged-group-${mg.primaryId}`}
              style={{
                transform: `translate(${mg.posX}px, ${mg.posY}px)`,
                width: `${mg.width}px`,
                height: `${mg.height}px`,
              }}
              className="absolute border-2 border-dashed border-purple-500 bg-purple-500/10 rounded-3xl pointer-events-none z-10 animate-pulse shadow-[0_0_20px_rgba(168,85,247,0.3)]"
            >
              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-950 border border-purple-400 text-purple-200 text-[9px] font-black uppercase rounded-md shadow-md absolute -top-3 left-3">
                <Link2 size={10} className="text-purple-400" />
                <span>Merged Group (Cap: {mg.totalCap} Guests)</span>
              </div>
            </div>
          ))}

          {/* Render Draggable Architectural Canvas Fixtures (Strictly bounded inside canvas) */}
          {fixtures.map((fix) => (
            <div
              key={fix.id}
              onPointerDown={(e) => handlePointerDown(e, fix.id, 'fixture', fix)}
              style={{
                transform: `translate(${fix.posX}px, ${fix.posY}px)`,
                cursor: isEditMode ? 'grab' : 'default',
                touchAction: 'none',
              }}
              className={`absolute min-h-[38px] px-3 py-1 rounded-full font-extrabold text-[11px] border backdrop-blur-md transition-shadow z-30 flex items-center gap-1.5 ${fix.color} ${isEditMode ? 'ring-2 ring-amber-400/80 shadow-lg hover:scale-105' : ''
                } ${dragState?.id === fix.id ? 'opacity-80 scale-110 shadow-2xl z-40' : ''}`}
            >
              <span>{fix.icon}</span>
              <span>{fix.name}</span>
              {isEditMode && <Move size={10} className="text-amber-400" />}
            </div>
          ))}

          {/* Render Table Nodes tied to Real-Time Table Session State Machine */}
          {filteredTables.map((t) => {
            const tableId = getTableId(t);
            const posX = t.positionX || 100;
            const posY = t.positionY || 100;
            const shape = t.shape || 'Square';
            const theme = REALTIME_STATUS_THEMES[t.status] || REALTIME_STATUS_THEMES.Available;
            const isSelected = getTableId(activeTable) === tableId;
            const isOccupied = t.status === 'Occupied';
            const hasHost = Boolean(t.currentHostName);
            const isColliding = collisions.set.has(tableId);
            const isMerged = Boolean(t.mergedInto || (t.mergedTables && t.mergedTables.length > 0));
            const StatusIcon = theme.icon;

            let shapeClasses = 'rounded-2xl w-[105px] h-[75px]';
            if (shape === 'Round') shapeClasses = 'rounded-full w-[95px] h-[95px]';
            if (shape === 'Booth') shapeClasses = 'rounded-2xl border-t-4 border-t-amber-500 w-[115px] h-[75px]';
            if (shape === 'Rectangle') shapeClasses = 'rounded-2xl w-[125px] h-[75px]';

            return (
              <div
                key={tableId}
                onPointerDown={(e) => handlePointerDown(e, tableId, 'table', t)}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTableNodeClick(t);
                }}
                style={{
                  transform: `translate(${posX}px, ${posY}px)`,
                  cursor: isEditMode ? 'grab' : 'pointer',
                  minWidth: '44px',
                  minHeight: '44px',
                  touchAction: 'none',
                }}
                className={`absolute transition-all duration-150 flex flex-col items-center justify-center p-2 border-2 backdrop-blur-md ${shapeClasses} ${theme.nodeBg} ${theme.glow} ${isColliding ? 'ring-4 ring-rose-500 shadow-rose-500/50 animate-bounce z-40' : ''
                  } ${isMerged ? 'ring-2 ring-purple-400' : ''} ${isSelected ? 'ring-4 ring-primary scale-105 z-30' : 'z-20 hover:scale-105'} ${dragState?.id === tableId ? 'opacity-80 scale-110 shadow-2xl z-40' : ''
                  }`}
                title={`${t.tableNumber} - ${theme.label} (${t.zone || 'Unassigned'})`}
              >
                {/* Accurate Perimeter Seats */}
                {renderPerimeterSeats(t.capacity, theme.seatColor)}

                {/* Table Number & Real-time Status Badge */}
                <div className={`px-2 py-0.5 rounded-full font-black text-xs tracking-tight shadow-sm flex items-center gap-1 ${theme.badgeBg}`}>
                  {StatusIcon ? <StatusIcon size={11} /> : <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} />}
                  <span>Table {t.tableNumber}</span>
                  {t.isAccessible && <span title="Wheelchair Accessible">♿</span>}
                </div>

                {/* Seats Capacity */}
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-200 mt-1">
                  <Users size={11} className="text-slate-400" />
                  <span>{t.capacity} Seats</span>
                </div>

                {/* Host or Reserved Guest Name Badge */}
                {(isOccupied || t.status === 'Reserved') && (hasHost || t.currentHostName) && (
                  <div className={`mt-0.5 px-1.5 py-0.2 rounded font-black text-[9px] truncate max-w-[95px] ${t.status === 'Reserved' ? 'bg-cyan-400/25 text-cyan-300 border border-cyan-400/30' : 'bg-amber-400/20 text-amber-300'
                    }`}>
                    {t.status === 'Reserved' ? '📅' : '👤'} {t.currentHostName || 'Reserved'}
                  </div>
                )}
              </div>
            );
          })}

          {/* Floating Real-time Status Legend Overlay (Cleanly bounded bottom-right) */}
          <div className="absolute bottom-3 right-3 z-30 max-w-[260px]">
            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl p-2.5 text-xs text-slate-200 transition-all">
              <button
                onClick={() => setIsLegendOpen(!isLegendOpen)}
                className="flex items-center justify-between w-full font-extrabold text-[11px] text-slate-400 hover:text-white px-1 mb-1"
              >
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Realtime Status Legend
                </span>
                {isLegendOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>

              {isLegendOpen && (
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1 border-t border-slate-800 text-[10px] font-medium">
                  {Object.entries(REALTIME_STATUS_THEMES).map(([statusKey, theme]) => {
                    const StatusIcon = theme.icon;
                    return (
                      <div key={statusKey} className="flex items-center gap-1.5 truncate">
                        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${theme.dot}`} />
                        <span className="truncate text-slate-300 flex items-center gap-1">
                          {StatusIcon && <StatusIcon size={10} className="text-slate-400 shrink-0" />}
                          <span className="truncate">{statusKey}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Mode Inspector Drawer (Connected 2-way with actual table positions & zones) */}
      {isEditMode && (
        <Card className="border border-amber-500/40 bg-card p-4 rounded-2xl space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-extrabold text-foreground flex items-center gap-2">
              <Layers size={16} className="text-amber-500" /> Architectural Layout &amp; Zone Inspector
            </h4>
            <span className="text-xs text-muted-foreground font-medium">
              Floor zone auto-syncs when tables are dropped inside zone boxes, or choose zone below to move table into box
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {localTables.map((t) => {
              const tableId = getTableId(t);
              return (
                <div key={tableId} className="p-3 bg-muted/40 rounded-xl border border-border/40 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-extrabold">
                    <span className="flex items-center gap-1.5 truncate max-w-[170px]">
                      <span className="truncate">Table {t.tableNumber}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary font-mono truncate max-w-[90px]">
                        {t.zone || 'Unassigned'}
                      </span>
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{t.capacity} Seats</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground font-bold">Shape</label>
                      <select
                        value={t.shape || 'Square'}
                        onChange={(e) => handleShapeChange(tableId, e.target.value)}
                        className="w-full mt-0.5 text-xs bg-background border border-input rounded-lg p-1.5 font-bold"
                      >
                        {SHAPES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-muted-foreground font-bold">Floor Zone</label>
                      <select
                        value={t.zone || 'Unassigned / Open Floor'}
                        onChange={(e) => handleZoneChange(tableId, e.target.value)}
                        className="w-full mt-0.5 text-xs bg-background border border-input rounded-lg p-1.5 font-bold truncate"
                      >
                        {availableZoneNames.filter(z => z !== 'All').map((z) => (
                          <option key={z} value={z}>{z}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Accessibility Toggle */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
                    <label className="flex items-center gap-1.5 font-bold cursor-pointer text-muted-foreground hover:text-foreground">
                      <input
                        type="checkbox"
                        checked={Boolean(t.isAccessible)}
                        onChange={(e) => handleAccessibleToggle(tableId, e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                      />
                      <span>Wheelchair Accessible (♿)</span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Zone Deletion Safety Confirmation Modal (Phase 4) */}
      {zoneToDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <button
              onClick={() => setZoneToDeleteTarget(null)}
              className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="p-2.5 rounded-xl bg-amber-500/10">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-foreground">Delete Zone Boundary</h3>
                <p className="text-xs text-muted-foreground">Confirm removing architectural zone "{zoneToDeleteTarget.name}"</p>
              </div>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs space-y-2 text-muted-foreground">
              <p>
                This zone currently encompasses <strong>{zoneToDeleteTarget.affectedCount} table(s)</strong>
                {zoneToDeleteTarget.affectedTableNumbers ? ` (${zoneToDeleteTarget.affectedTableNumbers})` : ''}.
              </p>
              <p className="font-semibold text-foreground">
                Deleting this boundary will reassign affected tables to <span className="text-primary font-mono font-bold">'Unassigned / Open Floor'</span>. No tables will be deleted from your layout.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoneToDeleteTarget(null)}
                className="flex-1 text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmDeleteZone}
                className="flex-1 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
              >
                Confirm Delete Zone
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
