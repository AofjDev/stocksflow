import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Search, Power } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type ProductCategory = Database['public']['Enums']['product_category'];
type UnitOfMeasure = Database['public']['Enums']['unit_of_measure'];

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  placa_st: 'Placa ST', placa_ru: 'Placa RU', placa_rf: 'Placa RF',
  placa_fortissima: 'Fortíssima', perfil_metalico: 'Perfil Metálico',
  acessorio: 'Acessório', massa: 'Massa', fita: 'Fita',
};

const UNIT_LABELS: Record<UnitOfMeasure, string> = {
  unidade: 'Unidade', metro: 'Metro', metro_quadrado: 'm²',
  pacote: 'Pacote', caixa: 'Caixa', kg: 'Kg', litro: 'Litro',
};

const EMPTY_FORM = {
  name: '', sku: '', category: '' as string, unit: 'unidade' as string,
  description: '', dimensions: '', weight_kg: '', shelf_life_days: '',
  min_stock: '0', max_stock: '9999',
};

const Products = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: products, isLoading } = useQuery({
    queryKey: ['products-all'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('*').order('name');
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        sku: form.sku,
        category: form.category as ProductCategory,
        unit: form.unit as UnitOfMeasure,
        description: form.description || null,
        dimensions: form.dimensions || null,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        shelf_life_days: form.shelf_life_days ? parseInt(form.shelf_life_days) : null,
        min_stock: parseInt(form.min_stock) || 0,
        max_stock: parseInt(form.max_stock) || 9999,
      };
      if (editingId) {
        const { error } = await supabase.from('products').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-all'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: editingId ? 'Material atualizado!' : 'Material cadastrado!' });
      closeDialog();
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('products').update({ active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-all'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: 'Status atualizado!' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const openEdit = (p: any) => {
    setEditingId(p.id);
    setForm({
      name: p.name, sku: p.sku, category: p.category, unit: p.unit,
      description: p.description || '', dimensions: p.dimensions || '',
      weight_kg: p.weight_kg ? String(p.weight_kg) : '',
      shelf_life_days: p.shelf_life_days ? String(p.shelf_life_days) : '',
      min_stock: String(p.min_stock), max_stock: String(p.max_stock),
    });
    setDialogOpen(true);
  };

  const filtered = products?.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s);
  }) || [];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar material..." className="pl-9" />
        </div>

        <Dialog open={dialogOpen} onOpenChange={v => { if (!v) closeDialog(); else setDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Novo Material</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editingId ? 'Editar Material' : 'Novo Material'}</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>SKU *</Label>
                  <Input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} required placeholder="Ex: PL-ST-1200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Categoria *</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(UNIT_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Dimensões</Label>
                  <Input value={form.dimensions} onChange={e => setForm(f => ({ ...f, dimensions: e.target.value }))} placeholder="1200x2400mm" />
                </div>
                <div className="space-y-2">
                  <Label>Peso (kg)</Label>
                  <Input type="number" step="0.1" value={form.weight_kg} onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Val. (dias)</Label>
                  <Input type="number" value={form.shelf_life_days} onChange={e => setForm(f => ({ ...f, shelf_life_days: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Estoque Mín.</Label>
                  <Input type="number" value={form.min_stock} onChange={e => setForm(f => ({ ...f, min_stock: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Estoque Máx.</Label>
                  <Input type="number" value={form.max_stock} onChange={e => setForm(f => ({ ...f, max_stock: e.target.value }))} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {editingId ? 'Salvar Alterações' : 'Cadastrar Material'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Dimensões</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum material encontrado</TableCell></TableRow>
            ) : (
              filtered.map(p => (
                <TableRow key={p.id} className={cn(!p.active && 'opacity-50')}>
                  <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell><span className="text-xs px-2 py-0.5 rounded-full bg-secondary">{CATEGORY_LABELS[p.category] || p.category}</span></TableCell>
                  <TableCell className="text-sm">{UNIT_LABELS[p.unit] || p.unit}</TableCell>
                  <TableCell className="text-xs">{p.dimensions || '—'}</TableCell>
                  <TableCell>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", p.active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>
                      {p.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActive.mutate({ id: p.id, active: !p.active })}>
                      <Power className={cn("h-3.5 w-3.5", p.active ? "text-success" : "text-muted-foreground")} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Products;
