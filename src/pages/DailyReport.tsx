import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowDown, ArrowUp, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DailyReport = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const dayStart = startOfDay(new Date(selectedDate + 'T12:00:00')).toISOString();
  const dayEnd = endOfDay(new Date(selectedDate + 'T12:00:00')).toISOString();

  const { data: movements } = useQuery({
    queryKey: ['daily-movements', selectedDate],
    queryFn: async () => {
      const { data } = await supabase
        .from('movements')
        .select('*, products(name, sku), from:locations!movements_from_location_id_fkey(full_address, area), to:locations!movements_to_location_id_fkey(full_address, area)')
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: counts } = useQuery({
    queryKey: ['daily-counts', selectedDate],
    queryFn: async () => {
      const { data } = await supabase
        .from('inventory_counts')
        .select('*, count_items(*)')
        .eq('count_date', selectedDate);
      return data || [];
    },
  });

  const { data: inventory } = useQuery({
    queryKey: ['inventory-snapshot'],
    queryFn: async () => {
      const { data } = await supabase.from('inventory').select('product_id, location_id, quantity');
      return data || [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products-list'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('id, sku, name').eq('active', true);
      return data || [];
    },
  });

  const entradas = movements?.filter(m => m.movement_type === 'entrada') || [];
  const saidas = movements?.filter(m => m.movement_type === 'saida') || [];
  const totalEntrada = entradas.reduce((s, m) => s + m.quantity, 0);
  const totalSaida = saidas.reduce((s, m) => s + m.quantity, 0);

  // Count accuracy: compare counted qty vs system qty per product
  const countItems = counts?.flatMap((c: any) => c.count_items || []) || [];
  const countAccuracy = countItems.map((ci: any) => {
    const systemQty = inventory?.filter(i => i.product_id === ci.product_id).reduce((s, i) => s + i.quantity, 0) || 0;
    const product = products?.find(p => p.id === ci.product_id);
    const diff = ci.quantity - systemQty;
    return { sku: ci.sku || product?.sku || '—', name: product?.name || '—', counted: ci.quantity, system: systemQty, diff, ok: diff === 0 };
  });

  const accurateCount = countAccuracy.filter(c => c.ok).length;
  const totalCounted = countAccuracy.length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <div>
          <Label>Data do Relatório</Label>
          <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-44" />
        </div>
        <h2 className="text-lg font-semibold mt-5">
          {format(new Date(selectedDate + 'T12:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20"><ArrowDown className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-2xl font-bold">{totalEntrada}</p>
              <p className="text-xs text-muted-foreground">Entradas ({entradas.length} mov.)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/20"><ArrowUp className="h-5 w-5 text-red-600" /></div>
            <div>
              <p className="text-2xl font-bold">{totalSaida}</p>
              <p className="text-xs text-muted-foreground">Saídas ({saidas.length} mov.)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20"><CheckCircle className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold">{totalCounted}</p>
              <p className="text-xs text-muted-foreground">Itens Contados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: totalCounted > 0 && accurateCount === totalCounted ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)' }}>
              {totalCounted > 0 && accurateCount === totalCounted ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              )}
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCounted > 0 ? Math.round((accurateCount / totalCounted) * 100) : 0}%</p>
              <p className="text-xs text-muted-foreground">Acurácia Contagem</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Entries */}
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><ArrowDown className="h-4 w-4 text-green-600" /> Entradas do Dia</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entradas.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">Nenhuma entrada</TableCell></TableRow>
                ) : entradas.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm">{m.products?.name || '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{m.products?.sku}</TableCell>
                    <TableCell className="font-semibold text-green-600">+{m.quantity}</TableCell>
                    <TableCell className="text-xs">{m.to?.full_address || m.to?.area || '—'}</TableCell>
                    <TableCell className="text-xs font-mono">{m.lot_number || '—'}</TableCell>
                    <TableCell className="text-xs font-mono">{format(new Date(m.created_at), 'HH:mm')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Exits */}
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><ArrowUp className="h-4 w-4 text-red-600" /> Saídas do Dia</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {saidas.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">Nenhuma saída</TableCell></TableRow>
                ) : saidas.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm">{m.products?.name || '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{m.products?.sku}</TableCell>
                    <TableCell className="font-semibold text-red-600">-{m.quantity}</TableCell>
                    <TableCell className="text-xs">{m.from?.full_address || m.from?.area || '—'}</TableCell>
                    <TableCell className="text-xs font-mono">{m.lot_number || '—'}</TableCell>
                    <TableCell className="text-xs font-mono">{format(new Date(m.created_at), 'HH:mm')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Count Accuracy */}
      {countAccuracy.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><CheckCircle className="h-4 w-4 text-blue-600" /> Acurácia da Contagem (FIFO)</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Contado</TableHead>
                    <TableHead>Sistema</TableHead>
                    <TableHead>Diferença</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {countAccuracy.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{c.name}</TableCell>
                      <TableCell className="font-mono text-xs">{c.sku}</TableCell>
                      <TableCell>{c.counted}</TableCell>
                      <TableCell>{c.system}</TableCell>
                      <TableCell className={`font-semibold ${c.diff > 0 ? 'text-green-600' : c.diff < 0 ? 'text-red-600' : ''}`}>
                        {c.diff > 0 ? `+${c.diff}` : c.diff}
                      </TableCell>
                      <TableCell>
                        {c.ok ? (
                          <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 text-xs gap-1"><CheckCircle className="h-3 w-3" /> OK</Badge>
                        ) : (
                          <Badge className="bg-destructive/20 text-destructive text-xs gap-1"><XCircle className="h-3 w-3" /> Divergente</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DailyReport;
