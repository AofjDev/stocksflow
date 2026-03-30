import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { QrCode, Plus, Upload, Trash2, Camera } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseQRCode } from '@/lib/qrcode-parser';
import * as XLSX from 'xlsx';

type CountItem = {
  sku: string;
  product_name?: string;
  product_id?: string;
  location_id?: string;
  location_name?: string;
  quantity: number;
  scanned_code?: string;
};

const Counts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showNewCount, setShowNewCount] = useState(false);
  const [countType, setCountType] = useState<string>('diario');
  const [items, setItems] = useState<CountItem[]>([]);
  const [scannerActive, setScannerActive] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [manualQty, setManualQty] = useState('');
  const [manualLocation, setManualLocation] = useState('');
  const [manualSku, setManualSku] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<any>(null);

  const { data: products } = useQuery({
    queryKey: ['products-list'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('id, sku, name').eq('active', true);
      return data || [];
    },
  });

  const { data: locations } = useQuery({
    queryKey: ['locations-list'],
    queryFn: async () => {
      const { data } = await supabase.from('locations').select('id, area, position, full_address').eq('active', true);
      return data || [];
    },
  });

  const { data: counts } = useQuery({
    queryKey: ['inventory-counts'],
    queryFn: async () => {
      const { data } = await supabase.from('inventory_counts').select('*').order('created_at', { ascending: false }).limit(50);
      return data || [];
    },
  });

  const { data: countItemsHistory } = useQuery({
    queryKey: ['count-items-history'],
    queryFn: async () => {
      const { data } = await supabase
        .from('count_items')
        .select('*, inventory_counts!inner(count_date, performed_by)')
        .order('created_at', { ascending: false })
        .limit(500);
      return data || [];
    },
  });

  const saveCount = useMutation({
    mutationFn: async () => {
      if (items.length === 0) throw new Error('Adicione itens à contagem');
      const { data: count, error: cErr } = await supabase
        .from('inventory_counts')
        .insert({ count_type: countType, performed_by: user!.id })
        .select()
        .single();
      if (cErr) throw cErr;

      const ciItems = items.map(it => ({
        count_id: count.id,
        product_id: it.product_id || null,
        location_id: it.location_id || null,
        quantity: it.quantity,
        sku: it.sku,
        scanned_code: it.scanned_code || null,
      }));
      const { error: iErr } = await supabase.from('count_items').insert(ciItems);
      if (iErr) throw iErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-counts'] });
      qc.invalidateQueries({ queryKey: ['count-items-history'] });
      toast({ title: 'Contagem salva!' });
      setItems([]);
      setShowNewCount(false);
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const processQRCode = useCallback((code: string) => {
    const parsed = parseQRCode(code);
    if (!parsed.valid) {
      toast({ title: 'QR Code inválido', description: `Código: ${code}`, variant: 'destructive' });
      return;
    }

    const product = products?.find(p => p.sku.includes(parsed.materialCode));
    setItems(prev => [...prev, {
      sku: product?.sku || parsed.materialCode,
      product_name: product?.name || `Material ${parsed.materialCode}`,
      product_id: product?.id,
      quantity: parsed.quantity,
      scanned_code: code,
    }]);
    toast({ title: 'Item escaneado!', description: `${product?.name || parsed.materialCode} — Qtd: ${parsed.quantity}` });
  }, [products, toast]);

  const startScanner = async () => {
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;
      setScannerActive(true);
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (text) => {
          processQRCode(text);
          scanner.stop().catch(() => {});
          setScannerActive(false);
        },
        () => {}
      );
    } catch (e: any) {
      toast({ title: 'Erro ao abrir câmera', description: e.message, variant: 'destructive' });
      setScannerActive(false);
    }
  };

  const stopScanner = () => {
    scannerRef.current?.stop().catch(() => {});
    setScannerActive(false);
  };

  const addManualItem = () => {
    if (!manualSku) return;
    const product = products?.find(p => p.sku === manualSku);
    const location = locations?.find(l => l.id === manualLocation);
    setItems(prev => [...prev, {
      sku: manualSku,
      product_name: product?.name || manualSku,
      product_id: product?.id,
      location_id: manualLocation || undefined,
      location_name: location?.full_address || undefined,
      quantity: parseInt(manualQty) || 0,
      scanned_code: manualCode || undefined,
    }]);
    setManualSku('');
    setManualQty('');
    setManualLocation('');
    setManualCode('');
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);
      const newItems: CountItem[] = rows.map(r => {
        const sku = String(r['SKU'] || r['sku'] || r['Código'] || '').trim();
        const product = products?.find(p => p.sku === sku);
        return {
          sku,
          product_name: product?.name || sku,
          product_id: product?.id,
          quantity: parseInt(r['Quantidade'] || r['quantidade'] || r['QTD'] || r['qtd'] || 0),
        };
      }).filter(i => i.sku);
      setItems(prev => [...prev, ...newItems]);
      toast({ title: `${newItems.length} itens importados` });
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Chart data: count items grouped by location area and date
  const chartData = (() => {
    if (!countItemsHistory?.length) return [];
    const byDate: Record<string, Record<string, number>> = {};
    for (const ci of countItemsHistory) {
      const date = (ci as any).inventory_counts?.count_date;
      if (!date) continue;
      if (!byDate[date]) byDate[date] = {};
      const loc = locations?.find(l => l.id === ci.location_id);
      const area = loc?.area || 'Sem área';
      byDate[date][area] = (byDate[date][area] || 0) + ci.quantity;
    }
    const areas = new Set<string>();
    Object.values(byDate).forEach(d => Object.keys(d).forEach(a => areas.add(a)));
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, areas_data]) => ({ date: format(new Date(date + 'T12:00:00'), 'dd/MM', { locale: ptBR }), ...areas_data }));
  })();

  const areaColors = ['hsl(var(--primary))', '#ef4444', '#f59e0b', '#10b981', '#6366f1', '#ec4899', '#8b5cf6', '#14b8a6'];
  const allAreas = [...new Set(chartData.flatMap(d => Object.keys(d).filter(k => k !== 'date')))];

  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs defaultValue="registrar">
        <TabsList>
          <TabsTrigger value="registrar">Registrar Contagem</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="grafico">Gráfico por Rua</TabsTrigger>
        </TabsList>

        <TabsContent value="registrar" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setShowNewCount(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Nova Contagem
            </Button>
          </div>

          {showNewCount && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Nova Contagem</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 flex-wrap">
                  <div>
                    <Label>Tipo</Label>
                    <Select value={countType} onValueChange={setCountType}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diario">Diário</SelectItem>
                        <SelectItem value="mensal">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2 items-end">
                    <Button variant="outline" onClick={scannerActive ? stopScanner : startScanner} className="gap-2">
                      <Camera className="h-4 w-4" /> {scannerActive ? 'Parar Scanner' : 'Escanear QR'}
                    </Button>
                    <div>
                      <Label>Importar Excel</Label>
                      <Input type="file" accept=".xlsx,.xls" onChange={handleExcelImport} className="w-48" />
                    </div>
                  </div>
                </div>

                {scannerActive && (
                  <div id="qr-reader" className="w-full max-w-sm mx-auto rounded-lg overflow-hidden border border-border" />
                )}

                {/* Manual add */}
                <div className="flex gap-2 flex-wrap items-end border-t border-border pt-4">
                  <div>
                    <Label>Código QR (opcional)</Label>
                    <Input value={manualCode} onChange={e => {
                      setManualCode(e.target.value);
                      if (e.target.value.startsWith('Q')) {
                        const parsed = parseQRCode(e.target.value);
                        if (parsed.valid) {
                          const product = products?.find(p => p.sku.includes(parsed.materialCode));
                          if (product) setManualSku(product.sku);
                          setManualQty(String(parsed.quantity));
                        }
                      }
                    }} placeholder="Q0006092983" className="w-40" />
                  </div>
                  <div>
                    <Label>SKU</Label>
                    <Select value={manualSku || undefined} onValueChange={setManualSku}>
                      <SelectTrigger className="w-48"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>
                        {products?.map(p => (
                          <SelectItem key={p.id} value={p.sku}>{p.sku} - {p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Quantidade</Label>
                    <Input type="number" value={manualQty} onChange={e => setManualQty(e.target.value)} className="w-24" />
                  </div>
                  <div>
                    <Label>Local</Label>
                    <Select value={manualLocation || undefined} onValueChange={setManualLocation}>
                      <SelectTrigger className="w-44"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>
                        {locations?.map(l => (
                          <SelectItem key={l.id} value={l.id}>{l.full_address || `${l.area}-${l.position}`}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={addManualItem} size="sm">Adicionar</Button>
                </div>

                {/* Items list */}
                {items.length > 0 && (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Material</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Qtd</TableHead>
                          <TableHead>Local</TableHead>
                          <TableHead>QR</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((it, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-sm">{it.product_name}</TableCell>
                            <TableCell className="font-mono text-xs">{it.sku}</TableCell>
                            <TableCell>{it.quantity}</TableCell>
                            <TableCell className="text-xs">{it.location_name || '—'}</TableCell>
                            <TableCell className="font-mono text-xs">{it.scanned_code || '—'}</TableCell>
                            <TableCell>
                              <Button size="sm" variant="ghost" onClick={() => setItems(prev => prev.filter((_, j) => j !== i))}>
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={() => saveCount.mutate()} disabled={items.length === 0}>
                    Salvar Contagem ({items.length} itens)
                  </Button>
                  <Button variant="outline" onClick={() => { setShowNewCount(false); setItems([]); }}>Cancelar</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="historico">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!counts?.length ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhuma contagem registrada</TableCell></TableRow>
                ) : counts.map(c => {
                  const itemCount = countItemsHistory?.filter(ci => ci.count_id === c.id).length || 0;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-sm">{format(new Date(c.count_date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                      <TableCell><Badge variant="outline">{c.count_type === 'diario' ? 'Diário' : 'Mensal'}</Badge></TableCell>
                      <TableCell>{itemCount}</TableCell>
                      <TableCell className="text-xs font-mono">{format(new Date(c.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="grafico">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contagens por Rua ao Longo do Tempo</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">Nenhuma contagem com localização para exibir</p>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Legend />
                    {allAreas.map((area, i) => (
                      <Line key={area} type="monotone" dataKey={area} stroke={areaColors[i % areaColors.length]} strokeWidth={2} dot={{ r: 3 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Counts;
