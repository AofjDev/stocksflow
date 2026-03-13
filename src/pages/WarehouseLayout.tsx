import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Maximize2, Minimize2, LayoutGrid, List, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WarehouseFloorPlan from '@/components/WarehouseFloorPlan';

const WarehouseLayout = () => {
  const [layoutTab, setLayoutTab] = useState<'grid' | 'planta'>('grid');
  const [viewMode, setViewMode] = useState<'grid' | 'row'>('row');
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [columns, setColumns] = useState('6');
  const [filterArea, setFilterArea] = useState('all');

  const { data: locations } = useQuery({
    queryKey: ['layout-locations'],
    queryFn: async () => {
      const { data } = await supabase.from('locations').select('*').order('area').order('position');
      return data || [];
    },
  });

  const { data: inventory } = useQuery({
    queryKey: ['layout-inventory'],
    queryFn: async () => {
      const { data } = await supabase.from('inventory').select('*, products(*), inventory_statuses(*)');
      return data || [];
    },
  });

  const activeLocations = locations?.filter(l => l.active) || [];
  const areas = [...new Set(activeLocations.map(l => l.area))].sort();

  const filteredLocations = filterArea === 'all'
    ? activeLocations
    : activeLocations.filter(l => l.area === filterArea);

  const getSlotData = (locId: string) => {
    const items = inventory?.filter(i => i.location_id === locId) || [];
    const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
    return { items, totalQty };
  };

  const getSlotColor = (occupied: number, capacity: number) => {
    if (occupied === 0) return { bg: 'bg-muted/40', border: 'border-border', text: 'text-muted-foreground' };
    const pct = (occupied / capacity) * 100;
    if (pct < 50) return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', text: 'text-emerald-600' };
    if (pct < 80) return { bg: 'bg-amber-500/10', border: 'border-amber-500/40', text: 'text-amber-600' };
    if (pct < 100) return { bg: 'bg-orange-500/10', border: 'border-orange-500/40', text: 'text-orange-600' };
    return { bg: 'bg-red-500/10', border: 'border-red-500/40', text: 'text-red-600' };
  };

  const totalCapacity = filteredLocations.reduce((s, l) => s + l.capacity, 0);
  const totalOccupied = filteredLocations.reduce((s, l) => s + getSlotData(l.id).totalQty, 0);
  const occupancyPct = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

  // Group by area for row view
  const groupedByArea = filteredLocations.reduce((acc, loc) => {
    if (!acc[loc.area]) acc[loc.area] = [];
    acc[loc.area].push(loc);
    return acc;
  }, {} as Record<string, typeof filteredLocations>);

  return (
    <div className="space-y-4 animate-fade-in">
      <Tabs value={layoutTab} onValueChange={v => setLayoutTab(v as 'grid' | 'planta')}>
        <TabsList>
          <TabsTrigger value="grid" className="flex items-center gap-1.5">
            <LayoutGrid className="h-3.5 w-3.5" /> Grade
          </TabsTrigger>
          <TabsTrigger value="planta" className="flex items-center gap-1.5">
            <Map className="h-3.5 w-3.5" /> Planta
          </TabsTrigger>
        </TabsList>

        <TabsContent value="planta" className="mt-4">
          <WarehouseFloorPlan />
        </TabsContent>

        <TabsContent value="grid" className="mt-4 space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Área</Label>
              <Select value={filterArea} onValueChange={setFilterArea}>
                <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {areas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Colunas</Label>
              <Input type="number" min={2} max={20} value={columns} onChange={e => setColumns(e.target.value)} className="w-20 h-9" />
            </div>
            <div className="flex gap-1 border border-border rounded-md p-0.5">
              <Button variant={viewMode === 'row' ? 'default' : 'ghost'} size="sm" className="h-8 px-2" onClick={() => setViewMode('row')}>
                <List className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" className="h-8 px-2" onClick={() => setViewMode('grid')}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            <div className="ml-auto flex gap-4 items-center text-sm">
              <div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-muted border border-border" /><span className="text-muted-foreground text-xs">Vazio</span></div>
              <div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-emerald-500/30 border border-emerald-500/40" /><span className="text-muted-foreground text-xs">&lt;50%</span></div>
              <div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-amber-500/30 border border-amber-500/40" /><span className="text-muted-foreground text-xs">&lt;80%</span></div>
              <div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-red-500/30 border border-red-500/40" /><span className="text-muted-foreground text-xs">≥100%</span></div>
            </div>
          </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat-card">
          <p className="text-xs text-muted-foreground">Total Vagas</p>
          <p className="text-xl font-bold">{filteredLocations.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground">Capacidade Total</p>
          <p className="text-xl font-bold">{totalCapacity}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground">Ocupado</p>
          <p className="text-xl font-bold">{totalOccupied}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground">Ocupação</p>
          <p className={cn("text-xl font-bold", occupancyPct > 90 ? "text-destructive" : occupancyPct > 70 ? "text-warning" : "text-success")}>{occupancyPct}%</p>
        </div>
      </div>

      {/* Layout visualization */}
      {viewMode === 'row' ? (
        <div className="space-y-4">
          {Object.entries(groupedByArea).map(([area, locs]) => (
            <div key={area} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Área {area}</h3>
                <span className="text-xs text-muted-foreground">
                  {locs.length} vagas · {locs.reduce((s, l) => s + getSlotData(l.id).totalQty, 0)}/{locs.reduce((s, l) => s + l.capacity, 0)}
                </span>
              </div>
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${parseInt(columns) || 6}, minmax(0, 1fr))` }}
              >
                {locs.map(loc => {
                  const { totalQty } = getSlotData(loc.id);
                  const colors = getSlotColor(totalQty, loc.capacity);
                  const pct = loc.capacity > 0 ? Math.round((totalQty / loc.capacity) * 100) : 0;

                  return (
                    <div
                      key={loc.id}
                      onClick={() => setSelectedSlot(loc)}
                      className={cn(
                        "relative rounded-lg border-2 p-2 text-center cursor-pointer transition-all hover:scale-105 hover:shadow-md",
                        colors.bg, colors.border
                      )}
                      title={`${loc.full_address} — ${totalQty}/${loc.capacity}`}
                    >
                      <p className={cn("text-xs font-bold font-mono", colors.text)}>{loc.position}</p>
                      <p className="text-[10px] text-muted-foreground">{totalQty}/{loc.capacity}</p>
                      {/* Progress bar */}
                      <div className="mt-1 h-1 rounded-full bg-border overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", 
                            pct < 50 ? "bg-emerald-500" : pct < 80 ? "bg-amber-500" : "bg-red-500"
                          )}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-4">
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${parseInt(columns) || 6}, minmax(0, 1fr))` }}
          >
            {filteredLocations.map(loc => {
              const { totalQty } = getSlotData(loc.id);
              const colors = getSlotColor(totalQty, loc.capacity);
              const pct = loc.capacity > 0 ? Math.round((totalQty / loc.capacity) * 100) : 0;

              return (
                <div
                  key={loc.id}
                  onClick={() => setSelectedSlot(loc)}
                  className={cn(
                    "relative rounded-lg border-2 p-3 text-center cursor-pointer transition-all hover:scale-105 hover:shadow-md",
                    colors.bg, colors.border
                  )}
                >
                  <p className={cn("text-sm font-bold font-mono", colors.text)}>{loc.full_address}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{totalQty}/{loc.capacity}</p>
                  <p className="text-[10px] text-muted-foreground">{loc.location_type}</p>
                  <div className="mt-1.5 h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all",
                        pct < 50 ? "bg-emerald-500" : pct < 80 ? "bg-amber-500" : "bg-red-500"
                      )}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
       )}
        </TabsContent>
      </Tabs>

      {/* Slot detail dialog */}
      <Dialog open={!!selectedSlot} onOpenChange={v => { if (!v) setSelectedSlot(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono">{selectedSlot?.full_address}</DialogTitle>
          </DialogHeader>
          {selectedSlot && <SlotDetail location={selectedSlot} inventory={inventory || []} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const SlotDetail = ({ location, inventory }: { location: any; inventory: any[] }) => {
  const items = inventory.filter(i => i.location_id === location.id);
  const totalQty = items.reduce((sum: number, i: any) => sum + i.quantity, 0);
  const pct = location.capacity > 0 ? Math.round((totalQty / location.capacity) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">Tipo</p>
          <p className="font-semibold text-sm">{location.location_type}</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">Capacidade</p>
          <p className="font-semibold text-sm">{location.capacity}</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">Ocupação</p>
          <p className={cn("font-semibold text-sm", pct > 90 ? "text-destructive" : pct > 70 ? "text-warning" : "text-success")}>{pct}%</p>
        </div>
      </div>

      {/* Occupancy bar */}
      <div className="h-3 rounded-full bg-border overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all",
            pct < 50 ? "bg-emerald-500" : pct < 80 ? "bg-amber-500" : "bg-red-500"
          )}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      <div>
        <h4 className="text-sm font-semibold mb-2">Itens nesta vaga ({items.length})</h4>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Vaga vazia</p>
        ) : (
          <ScrollArea className="max-h-60">
            <div className="space-y-2">
              {items.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-2 rounded-lg border border-border/60 bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">{item.products?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      SKU: {item.products?.sku}
                      {item.lot_number && ` · Lote: ${item.lot_number}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{item.quantity}</p>
                    {(item as any).inventory_statuses && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: (item as any).inventory_statuses.color + '20',
                          color: (item as any).inventory_statuses.color,
                        }}
                      >
                        {(item as any).inventory_statuses.name}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default WarehouseLayout;
