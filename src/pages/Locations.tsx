import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

const Locations = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ area: '', position: '', capacity: '20', location_type: 'pallet' });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data } = await supabase.from('locations').select('*').eq('active', true).order('area').order('position');
      return data || [];
    },
  });

  const { data: inventory } = useQuery({
    queryKey: ['inventory-occupancy'],
    queryFn: async () => {
      const { data } = await supabase.from('inventory').select('location_id, quantity');
      return data || [];
    },
  });

  const addLocation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('locations').insert({
        area: form.area.toUpperCase(),
        position: form.position.padStart(2, '0'),
        capacity: parseInt(form.capacity),
        location_type: form.location_type,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast({ title: 'Endereço criado!' });
      setDialogOpen(false);
      setForm({ area: '', position: '', capacity: '20', location_type: 'pallet' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  // Group by area
  const areas = locations?.reduce((acc, loc) => {
    if (!acc[loc.area]) acc[loc.area] = [];
    acc[loc.area].push(loc);
    return acc;
  }, {} as Record<string, typeof locations>) || {};

  const getOccupancy = (locId: string) => {
    const items = inventory?.filter(i => i.location_id === locId);
    return items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{locations?.length || 0} endereços cadastrados</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Novo Endereço</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Endereço</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); addLocation.mutate(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Área</Label>
                  <Input value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} placeholder="Ex: A" required maxLength={5} />
                </div>
                <div className="space-y-2">
                  <Label>Posição</Label>
                  <Input value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} placeholder="Ex: 06" required maxLength={5} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Capacidade</Label>
                  <Input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} required min={1} />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={form.location_type} onValueChange={v => setForm(f => ({ ...f, location_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pallet">Pallet</SelectItem>
                      <SelectItem value="estante">Estante</SelectItem>
                      <SelectItem value="blocado">Blocado</SelectItem>
                      <SelectItem value="picking">Picking</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={addLocation.isPending}>Criar Endereço</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Visual map */}
      {Object.entries(areas).map(([area, locs]) => (
        <div key={area} className="stat-card">
          <h3 className="text-sm font-semibold mb-3">Área {area}</h3>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-2">
            {locs?.map(loc => {
              const occ = getOccupancy(loc.id);
              const pct = loc.capacity > 0 ? (occ / loc.capacity) * 100 : 0;
              return (
                <div
                  key={loc.id}
                  className={cn(
                    "relative rounded-lg border p-2 text-center transition-all cursor-default",
                    pct === 0 && "border-border bg-muted/30",
                    pct > 0 && pct < 80 && "border-success/40 bg-success/5",
                    pct >= 80 && pct < 100 && "border-warning/40 bg-warning/5",
                    pct >= 100 && "border-destructive/40 bg-destructive/5"
                  )}
                  title={`${loc.full_address} — ${occ}/${loc.capacity} (${loc.location_type})`}
                >
                  <MapPin className={cn(
                    "h-4 w-4 mx-auto mb-1",
                    pct === 0 && "text-muted-foreground",
                    pct > 0 && pct < 80 && "text-success",
                    pct >= 80 && pct < 100 && "text-warning",
                    pct >= 100 && "text-destructive"
                  )} />
                  <p className="text-xs font-mono font-medium">{loc.full_address}</p>
                  <p className="text-[10px] text-muted-foreground">{occ}/{loc.capacity}</p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Locations;
