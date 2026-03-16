import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, ArrowRight, ArrowLeft, RefreshCw, Minus, RotateCcw, FileSpreadsheet, Pencil, Trash2 } from 'lucide-react';
import ImportMovements from '@/components/ImportMovements';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';

type MovementType = Database['public']['Enums']['movement_type'];

const TYPE_CONFIG: Record<MovementType, { label: string; icon: typeof ArrowRight; color: string }> = {
  entrada: { label: 'Entrada', icon: ArrowRight, color: 'text-success' },
  saida: { label: 'Saída', icon: ArrowLeft, color: 'text-destructive' },
  transferencia: { label: 'Transferência', icon: RefreshCw, color: 'text-info' },
  ajuste: { label: 'Ajuste', icon: Minus, color: 'text-warning' },
  devolucao: { label: 'Devolução', icon: RotateCcw, color: 'text-muted-foreground' },
};

const Movements = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [editingMovement, setEditingMovement] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: movements, isLoading } = useQuery({
    queryKey: ['movements'],
    queryFn: async () => {
      const { data } = await supabase
        .from('movements')
        .select('*, products(*)')
        .order('created_at', { ascending: false })
        .limit(200);
      return data || [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('*').eq('active', true);
      return data || [];
    },
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data } = await supabase.from('locations').select('*').eq('active', true);
      return data || [];
    },
  });

  const [form, setForm] = useState({
    movement_type: 'entrada' as MovementType,
    product_id: '', from_location_id: '', to_location_id: '',
    quantity: '', lot_number: '', reference_doc: '', notes: '',
  });

  const createMovement = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('movements').insert({
        movement_type: form.movement_type,
        product_id: form.product_id,
        from_location_id: form.from_location_id || null,
        to_location_id: form.to_location_id || null,
        quantity: parseInt(form.quantity),
        lot_number: form.lot_number || null,
        reference_doc: form.reference_doc || null,
        notes: form.notes || null,
        performed_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-movements'] });
      toast({ title: 'Movimentação registrada!' });
      setDialogOpen(false);
      setForm({ movement_type: 'entrada', product_id: '', from_location_id: '', to_location_id: '', quantity: '', lot_number: '', reference_doc: '', notes: '' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const updateMovement = useMutation({
    mutationFn: async () => {
      if (!editingMovement) return;
      const { error } = await supabase.from('movements').update({
        movement_type: form.movement_type,
        product_id: form.product_id,
        from_location_id: form.from_location_id || null,
        to_location_id: form.to_location_id || null,
        quantity: parseInt(form.quantity),
        lot_number: form.lot_number || null,
        reference_doc: form.reference_doc || null,
        notes: form.notes || null,
      }).eq('id', editingMovement.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-movements'] });
      toast({ title: 'Movimentação atualizada!' });
      setDialogOpen(false);
      setEditingMovement(null);
      setForm({ movement_type: 'entrada', product_id: '', from_location_id: '', to_location_id: '', quantity: '', lot_number: '', reference_doc: '', notes: '' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const deleteMovement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('movements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-movements'] });
      toast({ title: 'Movimentação excluída!' });
      setDeleteId(null);
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const openEdit = (m: any) => {
    setEditingMovement(m);
    setForm({
      movement_type: m.movement_type,
      product_id: m.product_id,
      from_location_id: m.from_location_id || '',
      to_location_id: m.to_location_id || '',
      quantity: String(m.quantity),
      lot_number: m.lot_number || '',
      reference_doc: m.reference_doc || '',
      notes: m.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMovement) {
      updateMovement.mutate();
    } else {
      createMovement.mutate();
    }
  };

  const filtered = movements?.filter(m => typeFilter === 'all' || m.movement_type === typeFilter) || [];

  const getLocationLabel = (id: string | null) => {
    if (!id) return '—';
    return locations?.find(l => l.id === id)?.full_address || id;
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {Object.entries(TYPE_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Importar Excel
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Nova Movimentação</Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Movimentação</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); createMovement.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.movement_type} onValueChange={v => setForm(f => ({ ...f, movement_type: v as MovementType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Produto</Label>
                <Select value={form.product_id} onValueChange={v => setForm(f => ({ ...f, product_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {products?.map(p => <SelectItem key={p.id} value={p.id}>{p.sku} - {p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {(form.movement_type === 'saida' || form.movement_type === 'transferencia') && (
                <div className="space-y-2">
                  <Label>Origem</Label>
                  <Select value={form.from_location_id} onValueChange={v => setForm(f => ({ ...f, from_location_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {locations?.map(l => <SelectItem key={l.id} value={l.id}>{l.full_address}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {(form.movement_type === 'entrada' || form.movement_type === 'transferencia' || form.movement_type === 'devolucao') && (
                <div className="space-y-2">
                  <Label>Destino</Label>
                  <Select value={form.to_location_id} onValueChange={v => setForm(f => ({ ...f, to_location_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {locations?.map(l => <SelectItem key={l.id} value={l.id}>{l.full_address}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} required min={1} />
                </div>
                <div className="space-y-2">
                  <Label>Lote</Label>
                  <Input value={form.lot_number} onChange={e => setForm(f => ({ ...f, lot_number: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Documento Ref.</Label>
                <Input value={form.reference_doc} onChange={e => setForm(f => ({ ...f, reference_doc: e.target.value }))} placeholder="NF, OS, etc." />
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
              </div>
              <Button type="submit" className="w-full" disabled={createMovement.isPending}>Registrar</Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <ImportMovements open={importOpen} onOpenChange={setImportOpen} />

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Qtd</TableHead>
              <TableHead>Lote</TableHead>
              <TableHead>Ref.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma movimentação</TableCell></TableRow>
            ) : (
              filtered.map(m => {
                const config = TYPE_CONFIG[m.movement_type];
                const Icon = config.icon;
                return (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs font-mono">{format(new Date(m.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
                    <TableCell>
                      <span className={`flex items-center gap-1.5 text-xs font-medium ${config.color}`}>
                        <Icon className="h-3.5 w-3.5" /> {config.label}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-sm">{m.products?.name}</TableCell>
                    <TableCell className="font-mono text-xs">{getLocationLabel(m.from_location_id)}</TableCell>
                    <TableCell className="font-mono text-xs">{getLocationLabel(m.to_location_id)}</TableCell>
                    <TableCell className="font-semibold">{m.quantity}</TableCell>
                    <TableCell className="text-xs">{m.lot_number || '—'}</TableCell>
                    <TableCell className="text-xs">{m.reference_doc || '—'}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Movements;
