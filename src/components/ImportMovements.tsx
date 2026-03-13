import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface ParsedRow {
  sku: string;
  quantity: number;
  lot_number: string;
  date: string;
  product_id?: string;
  product_name?: string;
  location_id?: string;
  error?: string;
}

interface ImportMovementsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ImportMovements = ({ open, onOpenChange }: ImportMovementsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'entrada' | 'saida'>('entrada');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');

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

  const { data: inventory } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const { data } = await supabase.from('inventory').select('*, products(*), locations(*)').order('received_at', { ascending: true });
      return data || [];
    },
    enabled: tab === 'saida',
  });

  const parseExcel = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

        const parsed: ParsedRow[] = jsonData.map((row) => {
          // Try common column name variations
          const sku = String(row['SKU'] || row['sku'] || row['Código'] || row['codigo'] || row['Material'] || row['material'] || '').trim();
          const quantity = parseInt(String(row['Quantidade'] || row['quantidade'] || row['Qtd'] || row['qtd'] || row['QTD'] || '0'));
          const lot = String(row['Lote'] || row['lote'] || row['Lot'] || row['lot'] || '').trim();
          
          let dateStr = '';
          const rawDate = row['Data'] || row['data'] || row['Date'] || row['date'];
          if (rawDate instanceof Date) {
            dateStr = rawDate.toISOString().split('T')[0];
          } else if (typeof rawDate === 'number') {
            // Excel serial date
            const excelDate = XLSX.SSF.parse_date_code(rawDate);
            if (excelDate) {
              dateStr = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
            }
          } else if (rawDate) {
            dateStr = String(rawDate).trim();
          }

          const product = products?.find(p => p.sku.toLowerCase() === sku.toLowerCase());

          return {
            sku,
            quantity: isNaN(quantity) ? 0 : quantity,
            lot_number: lot,
            date: dateStr,
            product_id: product?.id,
            product_name: product?.name,
            location_id: undefined,
            error: !sku ? 'SKU vazio' : !product ? `SKU "${sku}" não encontrado` : quantity <= 0 ? 'Quantidade inválida' : undefined,
          };
        });

        setRows(parsed);
        setFileName(file.name);
      } catch {
        toast({ title: 'Erro ao ler arquivo', description: 'Verifique se é um arquivo Excel válido.', variant: 'destructive' });
      }
    };
    reader.readAsArrayBuffer(file);
  }, [products, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) parseExcel(file);
  }, [parseExcel]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseExcel(file);
    e.target.value = '';
  }, [parseExcel]);

  const setRowLocation = (index: number, locationId: string) => {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, location_id: locationId } : r));
  };

  const setAllLocations = (locationId: string) => {
    setRows(prev => prev.map(r => ({ ...r, location_id: locationId })));
  };

  const validRows = rows.filter(r => !r.error && r.product_id);
  const entryReady = tab === 'entrada' && validRows.length > 0 && validRows.every(r => r.location_id);
  const exitReady = tab === 'saida' && validRows.length > 0;

  const importEntries = useMutation({
    mutationFn: async () => {
      for (const row of validRows) {
        const { error: invError } = await supabase.from('inventory').insert({
          product_id: row.product_id!,
          location_id: row.location_id!,
          quantity: row.quantity,
          lot_number: row.lot_number || null,
          received_at: row.date ? new Date(row.date).toISOString() : new Date().toISOString(),
        });
        if (invError) throw invError;

        const { error: movError } = await supabase.from('movements').insert({
          product_id: row.product_id!,
          to_location_id: row.location_id!,
          movement_type: 'entrada',
          quantity: row.quantity,
          lot_number: row.lot_number || null,
          performed_by: user!.id,
          notes: `Importação Excel: ${fileName}`,
        });
        if (movError) throw movError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-inventory'] });
      toast({ title: 'Entradas importadas!', description: `${validRows.length} itens registrados com sucesso.` });
      resetState();
    },
    onError: (err: any) => toast({ title: 'Erro na importação', description: err.message, variant: 'destructive' }),
  });

  const importExits = useMutation({
    mutationFn: async () => {
      if (!inventory) throw new Error('Estoque não carregado');

      // Clone inventory for FIFO consumption
      const availableStock = inventory.map(i => ({ ...i, remaining: i.quantity }));

      for (const row of validRows) {
        let qtyToConsume = row.quantity;
        // Filter matching items by product (and lot if provided), sorted by received_at ASC (FIFO)
        const matchingItems = availableStock
          .filter(i => i.product_id === row.product_id && i.remaining > 0 && (!row.lot_number || i.lot_number === row.lot_number))
          .sort((a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime());

        if (matchingItems.reduce((sum, i) => sum + i.remaining, 0) < qtyToConsume) {
          throw new Error(`Estoque insuficiente para SKU "${row.sku}" (necessário: ${qtyToConsume})`);
        }

        for (const item of matchingItems) {
          if (qtyToConsume <= 0) break;
          const consumed = Math.min(item.remaining, qtyToConsume);
          item.remaining -= consumed;
          qtyToConsume -= consumed;

          const newQty = item.quantity - (item.quantity - item.remaining);
          if (item.remaining <= 0) {
            const { error } = await supabase.from('inventory').delete().eq('id', item.id);
            if (error) throw error;
          } else {
            const { error } = await supabase.from('inventory').update({ quantity: item.remaining }).eq('id', item.id);
            if (error) throw error;
          }

          const { error: movError } = await supabase.from('movements').insert({
            product_id: row.product_id!,
            from_location_id: item.location_id,
            movement_type: 'saida',
            quantity: consumed,
            lot_number: row.lot_number || item.lot_number || null,
            performed_by: user!.id,
            notes: `Saída FIFO - Importação Excel: ${fileName}`,
          });
          if (movError) throw movError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-inventory'] });
      toast({ title: 'Saídas importadas!', description: `${validRows.length} itens processados com FIFO.` });
      resetState();
    },
    onError: (err: any) => toast({ title: 'Erro na importação', description: err.message, variant: 'destructive' }),
  });

  const resetState = () => {
    setRows([]);
    setFileName('');
    onOpenChange(false);
  };

  const isPending = importEntries.isPending || importExits.isPending;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) resetState(); else onOpenChange(true); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Importar Excel (SAP)
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={v => { setTab(v as 'entrada' | 'saida'); setRows([]); setFileName(''); }}>
          <TabsList className="w-full">
            <TabsTrigger value="entrada" className="flex-1">Entradas</TabsTrigger>
            <TabsTrigger value="saida" className="flex-1">Saídas (FIFO)</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="space-y-4 mt-4">
            <p className="text-xs text-muted-foreground">
              O Excel deve conter as colunas: <strong>SKU</strong>, <strong>Quantidade</strong>, <strong>Lote</strong>, <strong>Data</strong>.
              {tab === 'saida' && ' As saídas serão consumidas automaticamente pelo critério FIFO (mais antigo primeiro).'}
            </p>

            {rows.length === 0 ? (
              <label
                className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border p-10 cursor-pointer hover:bg-accent/30 transition-colors"
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
              >
                <Upload className="h-10 w-10 text-muted-foreground" />
                <span className="text-sm text-muted-foreground text-center">
                  Arraste um arquivo Excel aqui ou <span className="text-primary font-medium underline">clique para selecionar</span>
                </span>
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileInput} />
              </label>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-primary" /> {fileName}
                    <span className="text-muted-foreground">— {rows.length} linhas, {validRows.length} válidas</span>
                  </span>
                  <Button variant="outline" size="sm" onClick={() => { setRows([]); setFileName(''); }}>Limpar</Button>
                </div>

                {tab === 'entrada' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Endereço para todos:</span>
                    <Select onValueChange={setAllLocations}>
                      <SelectTrigger className="h-8 text-xs w-60">
                        <SelectValue placeholder="Selecionar endereço..." />
                      </SelectTrigger>
                      <SelectContent>
                        {locations?.map(l => <SelectItem key={l.id} value={l.id}>{l.full_address}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="rounded-lg border border-border overflow-hidden max-h-[45vh] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Qtd</TableHead>
                        <TableHead>Lote</TableHead>
                        <TableHead>Data</TableHead>
                        {tab === 'entrada' && <TableHead>Endereço</TableHead>}
                        <TableHead className="w-8"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row, idx) => (
                        <TableRow key={idx} className={row.error ? 'bg-destructive/5' : ''}>
                          <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                          <TableCell className="text-sm">{row.product_name || '—'}</TableCell>
                          <TableCell className="font-semibold">{row.quantity}</TableCell>
                          <TableCell className="text-xs">{row.lot_number || '—'}</TableCell>
                          <TableCell className="text-xs font-mono">{row.date || '—'}</TableCell>
                          {tab === 'entrada' && (
                            <TableCell>
                              {!row.error && (
                                <Select value={row.location_id || undefined} onValueChange={v => setRowLocation(idx, v)}>
                                  <SelectTrigger className="h-7 text-xs w-36">
                                    <SelectValue placeholder="Endereço" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {locations?.map(l => <SelectItem key={l.id} value={l.id}>{l.full_address}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              )}
                            </TableCell>
                          )}
                          <TableCell>
                            {row.error ? (
                              <span title={row.error}><AlertCircle className="h-4 w-4 text-destructive" /></span>
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-success" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {rows.some(r => r.error) && (
                  <div className="text-xs text-destructive space-y-0.5">
                    {rows.filter(r => r.error).map((r, i) => (
                      <p key={i}>Linha {rows.indexOf(r) + 1}: {r.error}</p>
                    ))}
                  </div>
                )}

                <Button
                  className="w-full"
                  disabled={isPending || (tab === 'entrada' ? !entryReady : !exitReady)}
                  onClick={() => tab === 'entrada' ? importEntries.mutate() : importExits.mutate()}
                >
                  {isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</>
                  ) : tab === 'entrada' ? (
                    `Importar ${validRows.length} Entradas`
                  ) : (
                    `Importar ${validRows.length} Saídas (FIFO)`
                  )}
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ImportMovements;
