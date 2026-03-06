import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const InventoryStatuses = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', color: '#6b7280' });

  const { data: statuses } = useQuery({
    queryKey: ['inventory-statuses'],
    queryFn: async () => {
      const { data } = await supabase.from('inventory_statuses').select('*').order('sort_order');
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { error } = await supabase.from('inventory_statuses').update({ name: form.name, color: form.color }).eq('id', editingId);
        if (error) throw error;
      } else {
        const maxOrder = statuses?.reduce((max, s) => Math.max(max, s.sort_order), 0) || 0;
        const { error } = await supabase.from('inventory_statuses').insert({ name: form.name, color: form.color, sort_order: maxOrder + 1 });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-statuses'] });
      toast({ title: editingId ? 'Status atualizado!' : 'Status criado!' });
      closeDialog();
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('inventory_statuses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-statuses'] });
      toast({ title: 'Status excluído!' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm({ name: '', color: '#6b7280' });
  };

  const openEdit = (s: any) => {
    setEditingId(s.id);
    setForm({ name: s.name, color: s.color });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{statuses?.length || 0} status cadastrados</p>
        <Dialog open={dialogOpen} onOpenChange={v => { if (!v) closeDialog(); else setDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Novo Status</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? 'Editar Status' : 'Novo Status'}</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: FIFO 4" required />
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="h-10 w-14 rounded border border-border cursor-pointer" />
                  <Input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="flex-1 font-mono" />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {editingId ? 'Salvar' : 'Criar Status'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cor</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {statuses?.map(s => (
              <TableRow key={s.id}>
                <TableCell>
                  <div className="h-5 w-5 rounded-full border border-border" style={{ backgroundColor: s.color }} />
                </TableCell>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(s.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {(!statuses || statuses.length === 0) && (
              <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Nenhum status cadastrado</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default InventoryStatuses;
