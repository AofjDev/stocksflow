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
import { Plus, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';

type NCType = Database['public']['Enums']['nonconformity_type'];
type NCStatus = Database['public']['Enums']['nonconformity_status'];

const TYPE_LABELS: Record<NCType, string> = {
  divergencia_quantidade: 'Divergência de Quantidade',
  produto_avariado: 'Produto Avariado',
  validade_vencida: 'Validade Vencida',
  produto_errado: 'Produto Errado',
  fifo_violado: 'FIFO Violado',
  endereco_errado: 'Endereço Errado',
  outro: 'Outro',
};

const STATUS_STYLES: Record<NCStatus, string> = {
  aberta: 'bg-destructive/10 text-destructive',
  em_analise: 'bg-warning/10 text-warning',
  resolvida: 'bg-success/10 text-success',
  encerrada: 'bg-muted text-muted-foreground',
};

const STATUS_LABELS: Record<NCStatus, string> = {
  aberta: 'Aberta', em_analise: 'Em Análise', resolvida: 'Resolvida', encerrada: 'Encerrada',
};

const DAMAGE_LABELS: Record<string, string> = {
  pav: 'PAV – Venda c/ Desconto',
  if: 'IF – Descarte',
};

const NonConformities = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: ncs, isLoading } = useQuery({
    queryKey: ['nonconformities'],
    queryFn: async () => {
      const { data } = await supabase
        .from('nonconformities')
        .select('*, products(*), locations(*)')
        .order('created_at', { ascending: false });
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
    type: 'divergencia_quantidade' as NCType,
    product_id: '', location_id: '', lot_number: '',
    description: '', expected_value: '', actual_value: '',
    damage_classification: '',
  });

  const createNC = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('nonconformities').insert({
        type: form.type,
        product_id: form.product_id || null,
        location_id: form.location_id || null,
        lot_number: form.lot_number || null,
        description: form.description,
        expected_value: form.expected_value || null,
        actual_value: form.actual_value || null,
        reported_by: user!.id,
        damage_classification: form.type === 'produto_avariado' && form.damage_classification ? form.damage_classification as any : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nonconformities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-nc'] });
      toast({ title: 'NC registrada!' });
      setDialogOpen(false);
      setForm({ type: 'divergencia_quantidade', product_id: '', location_id: '', lot_number: '', description: '', expected_value: '', actual_value: '', damage_classification: '' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const resolveNC = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      const { error } = await supabase.from('nonconformities').update({
        status: 'resolvida' as NCStatus,
        corrective_action: action,
        resolved_by: user!.id,
        resolved_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nonconformities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-nc'] });
      toast({ title: 'NC resolvida!' });
    },
  });

  const filtered = ncs?.filter(nc => statusFilter === 'all' || nc.status === statusFilter) || [];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive"><Plus className="mr-2 h-4 w-4" /> Registrar NC</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar Não Conformidade</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); createNC.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as NCType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Produto</Label>
                  <Select value={form.product_id} onValueChange={v => setForm(f => ({ ...f, product_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent>
                      {products?.map(p => <SelectItem key={p.id} value={p.id}>{p.sku}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Endereço</Label>
                  <Select value={form.location_id} onValueChange={v => setForm(f => ({ ...f, location_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent>
                      {locations?.map(l => <SelectItem key={l.id} value={l.id}>{l.full_address}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição *</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required rows={3} placeholder="Descreva a não conformidade..." />
              </div>
              {form.type === 'produto_avariado' && (
                <div className="space-y-2">
                  <Label>Classificação da Avaria *</Label>
                  <Select value={form.damage_classification} onValueChange={v => setForm(f => ({ ...f, damage_classification: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pav">PAV – Produto p/ venda c/ desconto</SelectItem>
                      <SelectItem value="if">IF – Produto p/ descarte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Valor Esperado</Label>
                  <Input value={form.expected_value} onChange={e => setForm(f => ({ ...f, expected_value: e.target.value }))} placeholder="Ex: 100 unidades" />
                </div>
                <div className="space-y-2">
                  <Label>Valor Encontrado</Label>
                  <Input value={form.actual_value} onChange={e => setForm(f => ({ ...f, actual_value: e.target.value }))} placeholder="Ex: 95 unidades" />
                </div>
              </div>
              <Button type="submit" variant="destructive" className="w-full" disabled={createNC.isPending}>Registrar NC</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Endereço</TableHead>
              <TableHead>Esperado</TableHead>
              <TableHead>Encontrado</TableHead>
              <TableHead>Classificação</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhuma NC encontrada</TableCell></TableRow>
            ) : (
              filtered.map(nc => (
                <TableRow key={nc.id}>
                  <TableCell className="text-xs font-mono">{format(new Date(nc.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
                  <TableCell className="text-xs font-medium">{TYPE_LABELS[nc.type]}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[nc.status]}`}>
                      {STATUS_LABELS[nc.status]}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">{nc.products?.sku || '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{nc.locations?.full_address || '—'}</TableCell>
                  <TableCell className="text-xs">{nc.expected_value || '—'}</TableCell>
                  <TableCell className="text-xs">{nc.actual_value || '—'}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{nc.description}</TableCell>
                  <TableCell>
                    {(nc.status === 'aberta' || nc.status === 'em_analise') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const action = prompt('Ação corretiva tomada:');
                          if (action) resolveNC.mutate({ id: nc.id, action });
                        }}
                        className="text-success hover:text-success"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
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

export default NonConformities;
