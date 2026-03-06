import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, ArrowUpDown } from 'lucide-react';
import { format, isAfter } from 'date-fns';

const CATEGORY_LABELS: Record<string, string> = {
  placa_st: 'Placa ST', placa_ru: 'Placa RU', placa_rf: 'Placa RF',
  placa_fortissima: 'Fortíssima', perfil_metalico: 'Perfil', acessorio: 'Acessório', massa: 'Massa', fita: 'Fita',
};

const Inventory = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sortField, setSortField] = useState<'name' | 'quantity' | 'expiry'>('name');

  const { data: inventory, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const { data } = await supabase.from('inventory').select('*, products(*), locations(*), inventory_statuses(*)');
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

  const { data: statuses } = useQuery({
    queryKey: ['inventory-statuses'],
    queryFn: async () => {
      const { data } = await supabase.from('inventory_statuses').select('*').order('sort_order');
      return data || [];
    },
  });

  const [form, setForm] = useState({
    product_id: '', location_id: '', quantity: '', lot_number: '',
    manufacturing_date: '', expiry_date: '', status_id: '',
  });

  const addInventory = useMutation({
    mutationFn: async () => {
      const { error: invError } = await supabase.from('inventory').insert({
        product_id: form.product_id,
        location_id: form.location_id,
        quantity: parseInt(form.quantity),
        lot_number: form.lot_number || null,
        manufacturing_date: form.manufacturing_date || null,
        expiry_date: form.expiry_date || null,
        status_id: form.status_id || null,
      });
      if (invError) throw invError;

      const { error: movError } = await supabase.from('movements').insert({
        product_id: form.product_id,
        to_location_id: form.location_id,
        movement_type: 'entrada',
        quantity: parseInt(form.quantity),
        lot_number: form.lot_number || null,
        performed_by: user!.id,
        notes: 'Entrada inicial de estoque',
      });
      if (movError) throw movError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-inventory'] });
      toast({ title: 'Sucesso', description: 'Estoque adicionado' });
      setDialogOpen(false);
      setForm({ product_id: '', location_id: '', quantity: '', lot_number: '', manufacturing_date: '', expiry_date: '', status_id: '' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const filtered = inventory?.filter(item => {
    const matchSearch = !search ||
      item.products?.name.toLowerCase().includes(search.toLowerCase()) ||
      item.products?.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.locations?.full_address?.toLowerCase().includes(search.toLowerCase()) ||
      item.lot_number?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === 'all' || item.products?.category === categoryFilter;
    return matchSearch && matchCategory;
  }).sort((a, b) => {
    if (sortField === 'quantity') return b.quantity - a.quantity;
    if (sortField === 'expiry') {
      if (!a.expiry_date) return 1;
      if (!b.expiry_date) return -1;
      return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
    }
    return (a.products?.name || '').localeCompare(b.products?.name || '');
  }) || [];

  const today = new Date();

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar produto, SKU, endereço..." className="pl-9" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Entrada</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Entrada de Estoque</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); addInventory.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Produto</Label>
                <Select value={form.product_id} onValueChange={v => setForm(f => ({ ...f, product_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {products?.map(p => <SelectItem key={p.id} value={p.id}>{p.sku} - {p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Select value={form.location_id} onValueChange={v => setForm(f => ({ ...f, location_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {locations?.map(l => <SelectItem key={l.id} value={l.id}>{l.full_address} ({l.location_type})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} required min={1} />
                </div>
                <div className="space-y-2">
                  <Label>Lote</Label>
                  <Input value={form.lot_number} onChange={e => setForm(f => ({ ...f, lot_number: e.target.value }))} placeholder="Ex: L2024-001" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Data Fabricação</Label>
                  <Input type="date" value={form.manufacturing_date} onChange={e => setForm(f => ({ ...f, manufacturing_date: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Data Validade</Label>
                  <Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status_id} onValueChange={v => setForm(f => ({ ...f, status_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sem status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sem status</SelectItem>
                    {statuses?.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                          {s.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={addInventory.isPending}>
                {addInventory.isPending ? 'Salvando...' : 'Registrar Entrada'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => setSortField('name')}>
                <span className="flex items-center gap-1">Produto <ArrowUpDown className="h-3 w-3" /></span>
              </TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Endereço</TableHead>
              <TableHead>Lote</TableHead>
              <TableHead className="cursor-pointer" onClick={() => setSortField('quantity')}>
                <span className="flex items-center gap-1">Qtd <ArrowUpDown className="h-3 w-3" /></span>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => setSortField('expiry')}>
                <span className="flex items-center gap-1">Validade <ArrowUpDown className="h-3 w-3" /></span>
              </TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum item encontrado</TableCell></TableRow>
            ) : (
              filtered.map(item => {
                const isExpired = item.expiry_date && !isAfter(new Date(item.expiry_date), today);
                const isExpiring = item.expiry_date && !isExpired && !isAfter(new Date(item.expiry_date), new Date(today.getTime() + 30 * 86400000));

                return (
                  <TableRow key={item.id} className={isExpired ? 'bg-destructive/5' : isExpiring ? 'bg-yellow-500/5' : ''}>
                    <TableCell className="font-medium">{item.products?.name}</TableCell>
                    <TableCell className="font-mono text-xs">{item.products?.sku}</TableCell>
                    <TableCell><span className="text-xs px-2 py-0.5 rounded-full bg-secondary">{CATEGORY_LABELS[item.products?.category || ''] || item.products?.category}</span></TableCell>
                    <TableCell className="font-mono text-sm">{item.locations?.full_address}</TableCell>
                    <TableCell className="text-sm">{item.lot_number || '—'}</TableCell>
                    <TableCell className="font-semibold">{item.quantity}</TableCell>
                    <TableCell>
                      {item.expiry_date ? (
                        <span className={`text-xs font-mono ${isExpired ? 'text-destructive font-bold' : isExpiring ? 'text-yellow-500 font-medium' : ''}`}>
                          {format(new Date(item.expiry_date), 'dd/MM/yyyy')}
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      {(item as any).inventory_statuses ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{
                          backgroundColor: (item as any).inventory_statuses.color + '20',
                          color: (item as any).inventory_statuses.color,
                        }}>
                          {(item as any).inventory_statuses.name}
                        </span>
                      ) : '—'}
                    </TableCell>
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

export default Inventory;
