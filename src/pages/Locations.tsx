import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, MapPin, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const EMPTY_FORM = { area: '', position: '', capacity: '20', location_type: 'pallet' };

const Locations = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data } = await supabase.from('locations').select('*').order('area').order('position');
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

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        area: form.area.toUpperCase(),
        position: form.position.padStart(2, '0'),
        capacity: parseInt(form.capacity),
        location_type: form.location_type,
      };
      if (editingId) {
        const { error } = await supabase.from('locations').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('locations').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast({ title: editingId ? 'Endereço atualizado!' : 'Endereço criado!' });
      closeDialog();
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('locations').update({ active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast({ title: 'Status atualizado!' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const deleteLocation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('locations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast({ title: 'Endereço excluído!' });
      setDeleteId(null);
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const openEdit = (loc: any) => {
    setEditingId(loc.id);
    setForm({ area: loc.area, position: loc.position, capacity: String(loc.capacity), location_type: loc.location_type });
    setDialogOpen(true);
  };

  const activeLocations = locations?.filter(l => l.active) || [];
  const inactiveLocations = locations?.filter(l => !l.active) || [];

  const areas = activeLocations.reduce((acc, loc) => {
    if (!acc[loc.area]) acc[loc.area] = [];
    acc[loc.area].push(loc);
    return acc;
  }, {} as Record<string, typeof activeLocations>);

  const getOccupancy = (locId: string) => {
    const items = inventory?.filter(i => i.location_id === locId);
    return items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{activeLocations.length} ativos · {inactiveLocations.length} inativos</p>
        <Dialog open={dialogOpen} onOpenChange={v => { if (!v) closeDialog(); else setDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Novo Endereço</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? 'Editar Endereço' : 'Novo Endereço'}</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
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
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={saveMutation.isPending}>
                  {editingId ? 'Salvar Alterações' : 'Criar Endereço'}
                </Button>
                {editingId && (
                  <Button type="button" variant="destructive" onClick={() => { closeDialog(); setDeleteId(editingId); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {Object.entries(areas).map(([area, locs]) => (
        <div key={area} className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">Área {area}</h3>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-2">
            {locs?.map(loc => {
              const occ = getOccupancy(loc.id);
              const pct = loc.capacity > 0 ? (occ / loc.capacity) * 100 : 0;
              return (
                <div
                  key={loc.id}
                  onClick={() => openEdit(loc)}
                  className={cn(
                    "relative rounded-lg border p-2 text-center transition-all cursor-pointer hover:ring-2 hover:ring-primary/30",
                    pct === 0 && "border-border bg-muted/30",
                    pct > 0 && pct < 80 && "border-green-500/40 bg-green-500/5",
                    pct >= 80 && pct < 100 && "border-yellow-500/40 bg-yellow-500/5",
                    pct >= 100 && "border-destructive/40 bg-destructive/5"
                  )}
                  title={`${loc.full_address} — ${occ}/${loc.capacity} (${loc.location_type}) — Clique para editar`}
                >
                  <MapPin className={cn(
                    "h-4 w-4 mx-auto mb-1",
                    pct === 0 && "text-muted-foreground",
                    pct > 0 && pct < 80 && "text-green-500",
                    pct >= 80 && pct < 100 && "text-yellow-500",
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

      {inactiveLocations.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 opacity-60">
          <h3 className="text-sm font-semibold mb-3">Inativos</h3>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-2">
            {inactiveLocations.map(loc => (
              <div
                key={loc.id}
                className="relative rounded-lg border border-dashed border-border p-2 text-center cursor-pointer hover:ring-2 hover:ring-primary/30"
                onClick={() => openEdit(loc)}
                title="Clique para editar"
              >
                <MapPin className="h-4 w-4 mx-auto mb-1 text-muted-foreground/40" />
                <p className="text-xs font-mono font-medium text-muted-foreground">{loc.full_address}</p>
                <button
                  onClick={e => { e.stopPropagation(); toggleActive.mutate({ id: loc.id, active: true }); }}
                  className="text-[10px] text-primary hover:underline mt-0.5"
                >Reativar</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir endereço?</AlertDialogTitle>
            <AlertDialogDescription>Se houver estoque neste endereço, a exclusão poderá falhar.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteLocation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Locations;
