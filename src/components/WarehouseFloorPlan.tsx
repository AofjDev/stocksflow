import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface LocationData {
  id: string;
  area: string;
  position: string;
  full_address: string | null;
  capacity: number;
  active: boolean;
}

interface InventoryItem {
  location_id: string;
  quantity: number;
}

interface FloorPlanProps {
  onSelectArea?: (areaId: string) => void;
  locations?: LocationData[];
  inventory?: InventoryItem[];
}

/** Maps floor‑plan zone IDs → real DB area values */
const ZONE_AREA_MAP: Record<string, string[]> = {
  rua: ['RUA'],
  ruamn: ['RUAMN'],
  ruamx: ['RUAMX'],
  lateral_l: ['L'],
  lateral_r: ['R'],
  cong: ['CONG'],
};

const WarehouseFloorPlan = ({ onSelectArea, locations = [], inventory = [] }: FloorPlanProps) => {
  // Pre‑compute occupancy per area
  const areaStats = useMemo(() => {
    const stats: Record<string, { total: number; capacity: number; occupied: number }> = {};
    for (const loc of locations) {
      if (!loc.active) continue;
      const area = loc.area;
      if (!stats[area]) stats[area] = { total: 0, capacity: 0, occupied: 0 };
      stats[area].total += 1;
      stats[area].capacity += loc.capacity;
      const qty = inventory
        .filter(i => i.location_id === loc.id)
        .reduce((s, i) => s + i.quantity, 0);
      stats[area].occupied += qty;
    }
    return stats;
  }, [locations, inventory]);

  const getZoneStats = (zoneId: string) => {
    const dbAreas = ZONE_AREA_MAP[zoneId];
    if (!dbAreas) return null;
    const combined = { total: 0, capacity: 0, occupied: 0 };
    for (const a of dbAreas) {
      const s = areaStats[a];
      if (s) {
        combined.total += s.total;
        combined.capacity += s.capacity;
        combined.occupied += s.occupied;
      }
    }
    return combined.total > 0 ? combined : null;
  };

  const getOccupancyColor = (occupied: number, capacity: number) => {
    if (capacity === 0) return 'bg-muted/40';
    const pct = (occupied / capacity) * 100;
    if (pct === 0) return 'bg-muted/40';
    if (pct < 50) return 'bg-emerald-500/20';
    if (pct < 80) return 'bg-amber-500/20';
    return 'bg-red-500/20';
  };

  const getOccupancyBorder = (occupied: number, capacity: number) => {
    if (capacity === 0) return 'border-border';
    const pct = (occupied / capacity) * 100;
    if (pct === 0) return 'border-border';
    if (pct < 50) return 'border-emerald-500/40';
    if (pct < 80) return 'border-amber-500/40';
    return 'border-red-500/40';
  };

  const handleClick = (areaId: string) => {
    // Pass the real DB area name(s) — use the first one
    const dbAreas = ZONE_AREA_MAP[areaId];
    if (dbAreas && dbAreas.length > 0) {
      onSelectArea?.(dbAreas[0]);
    } else {
      onSelectArea?.(areaId);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 overflow-auto">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded bg-muted/40 border border-border" /> Vazio</div>
        <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded bg-emerald-500/20 border border-emerald-500/40" /> &lt;50%</div>
        <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded bg-amber-500/20 border border-amber-500/40" /> &lt;80%</div>
        <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded bg-red-500/20 border border-red-500/40" /> ≥80%</div>
      </div>

      <div className="relative mx-auto" style={{ width: 900, height: 680 }}>
        {/* ─── OUTER WALLS ─── */}
        <div className="absolute inset-0 border-2 border-foreground/60 rounded-sm" />

        {/* ─── DOCK DOORS (top edge) ─── */}
        <div className="absolute top-0 left-[160px] right-[340px] flex justify-between px-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="w-1.5 h-5 bg-foreground/40 rounded-b" />
          ))}
        </div>

        {/* ─── ÁREA DE CARREGAMENTO (CONG) ─── */}
        <FloorZone
          zoneId="cong"
          label="Carregamento (CONG)"
          stats={getZoneStats('cong')}
          onClick={handleClick}
          getOccupancyColor={getOccupancyColor}
          getOccupancyBorder={getOccupancyBorder}
          style={{ top: 8, left: 140, width: 420, height: 100 }}
          className="border-dashed"
        />

        {/* ─── PERFIS / ACABAMENTO (decorative, no DB area) ─── */}
        <div
          className="absolute rounded border border-foreground/30 bg-muted/30"
          style={{ top: 30, left: 12, width: 110, height: 80 }}
        >
          <p className="text-[9px] text-muted-foreground text-center mt-2 px-1 leading-tight">
            Perfis, Discos/Fitas de acabamento
          </p>
        </div>

        {/* ─── SALA LOGÍSTICA (decorative) ─── */}
        <div
          className="absolute rounded border border-foreground/30 bg-muted/30"
          style={{ top: 60, left: 600, width: 80, height: 55 }}
        >
          <p className="text-[9px] text-muted-foreground text-center mt-3 px-1 leading-tight">
            Sala Logística
          </p>
        </div>

        {/* ─── LATERAL L (Left racks) ─── */}
        <FloorZone
          zoneId="lateral_l"
          label="Lateral L"
          sublabel="L-01 a L-11"
          stats={getZoneStats('lateral_l')}
          onClick={handleClick}
          getOccupancyColor={getOccupancyColor}
          getOccupancyBorder={getOccupancyBorder}
          style={{ top: 120, left: 12, width: 120, height: 220 }}
        />

        {/* ─── RUA (Main aisles, center block) ─── */}
        <FloorZone
          zoneId="rua"
          label="Ruas Principais"
          sublabel="RUA-01 a RUA-31"
          stats={getZoneStats('rua')}
          onClick={handleClick}
          getOccupancyColor={getOccupancyColor}
          getOccupancyBorder={getOccupancyBorder}
          style={{ top: 120, left: 150, width: 340, height: 220 }}
        />

        {/* ─── RUAMN (Minor aisles, right-center) ─── */}
        <FloorZone
          zoneId="ruamn"
          label="Ruas Menores"
          sublabel="RUAMN-32 a RUAMN-50"
          stats={getZoneStats('ruamn')}
          onClick={handleClick}
          getOccupancyColor={getOccupancyColor}
          getOccupancyBorder={getOccupancyBorder}
          style={{ top: 120, left: 510, width: 190, height: 140 }}
        />

        {/* ─── RUAMX (Mixed aisles, right) ─── */}
        <FloorZone
          zoneId="ruamx"
          label="Ruas Mistas"
          sublabel="RUAMX-51 a RUAMX-67"
          stats={getZoneStats('ruamx')}
          onClick={handleClick}
          getOccupancyColor={getOccupancyColor}
          getOccupancyBorder={getOccupancyBorder}
          style={{ top: 120, left: 720, width: 168, height: 140 }}
        />

        {/* ─── LATERAL R (Right racks) ─── */}
        <FloorZone
          zoneId="lateral_r"
          label="Lateral R"
          sublabel="R-01 a R-08"
          stats={getZoneStats('lateral_r')}
          onClick={handleClick}
          getOccupancyColor={getOccupancyColor}
          getOccupancyBorder={getOccupancyBorder}
          style={{ top: 280, left: 510, width: 378, height: 110 }}
        />

        {/* ─── INDUSTRIAL (decorative) ─── */}
        <div
          className="absolute rounded"
          style={{
            top: 370, left: 12, width: 340, height: 170,
            border: '2px dashed hsl(var(--foreground) / 0.3)',
          }}
        >
          <p className="text-xs font-semibold text-muted-foreground absolute bottom-4 left-4">
            Industrial
          </p>
        </div>

        {/* ─── RACKS MPs (bottom-right, decorative) ─── */}
        <div
          className="absolute rounded border border-foreground/30"
          style={{ top: 420, left: 400, width: 488, height: 200 }}
        >
          <p className="text-[10px] font-semibold text-muted-foreground ml-3 mt-2">
            Racks MPs
          </p>
          <div
            className="absolute border border-dashed border-foreground/20 rounded"
            style={{ top: 25, left: 10, width: 360, height: 50 }}
          >
            <span className="text-[9px] text-muted-foreground absolute -top-2.5 right-2 bg-card px-1">SC25</span>
          </div>
          <div
            className="absolute border border-dashed border-foreground/20 rounded"
            style={{ top: 25, left: 380, width: 98, height: 50 }}
          >
            <span className="text-[9px] text-muted-foreground absolute -top-2.5 right-1 bg-card px-1">SC26</span>
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex gap-1">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="flex-1 h-8 rounded-sm border border-foreground/15 bg-muted/30" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Clickable zone with live stats ─── */
const FloorZone = ({
  zoneId, label, sublabel, stats, onClick, getOccupancyColor, getOccupancyBorder, style, className,
}: {
  zoneId: string;
  label: string;
  sublabel?: string;
  stats: { total: number; capacity: number; occupied: number } | null;
  onClick: (id: string) => void;
  getOccupancyColor: (o: number, c: number) => string;
  getOccupancyBorder: (o: number, c: number) => string;
  style: React.CSSProperties;
  className?: string;
}) => {
  const occupied = stats?.occupied ?? 0;
  const capacity = stats?.capacity ?? 0;
  const pct = capacity > 0 ? Math.round((occupied / capacity) * 100) : 0;
  const bgColor = stats ? getOccupancyColor(occupied, capacity) : 'bg-muted/20';
  const borderColor = stats ? getOccupancyBorder(occupied, capacity) : 'border-foreground/20';

  return (
    <div
      onClick={() => onClick(zoneId)}
      className={cn(
        'absolute cursor-pointer hover:brightness-110 hover:shadow-md transition-all rounded border-2 flex flex-col items-center justify-center',
        bgColor,
        borderColor,
        className,
      )}
      style={style}
    >
      <p className="text-[10px] font-semibold text-foreground/80 leading-tight text-center px-1">
        {label}
      </p>
      {sublabel && (
        <p className="text-[8px] text-muted-foreground mt-0.5">{sublabel}</p>
      )}
      {stats && stats.total > 0 && (
        <div className="mt-1.5 text-center">
          <p className="text-[10px] font-bold text-foreground/70">
            {occupied}/{capacity}
          </p>
          <div className="w-12 h-1 rounded-full bg-foreground/10 mt-0.5 mx-auto overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full',
                pct < 50 ? 'bg-emerald-500' : pct < 80 ? 'bg-amber-500' : 'bg-red-500',
              )}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </div>
      )}
      {stats && stats.total === 0 && (
        <p className="text-[8px] text-muted-foreground mt-1">Sem endereços</p>
      )}
    </div>
  );
};

export default WarehouseFloorPlan;
