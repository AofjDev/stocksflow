import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Camera, Plus, Edit2, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseQRCode } from '@/lib/qrcode-parser';
import { startQRScanner } from '@/lib/camera-permissions';

const Damages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const scannerRef = useRef<any>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [form, setForm] = useState({
    scanned_code: '', sku: '', product_id: '', quantity: '', material_type: 'PAV',
    responsible: '', damage_date: new Date().toISOString().split('T')[0], notes: '',
  });

  const { data: products } = useQuery({
    queryKey: ['products-list'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('id, sku, name').eq('active', true);
      return data || [];
    },
  });

  const { data: damages } = useQuery({
    queryKey: ['damages'],
    queryFn: async () => {
      const { data } = await supabase.from('damages').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: damagePhotos } = useQuery({
    queryKey: ['damage-photos'],
    queryFn: async () => {
      const { data } = await supabase.from('damage_photos').select('*');
      return data || [];
    },
  });

  const handleStartScanner = async () => {
    setScannerActive(true);
    await new Promise(r => setTimeout(r, 100));
    const result = await startQRScanner(
      'damage-qr-reader',
      (text) => {
        processQR(text);
        setScannerActive(false);
      },
      (error) => {
        toast({ title: 'Erro na câmera', description: error, variant: 'destructive' });
        setScannerActive(false);
      }
    );
    if (result) {
      scannerRef.current = result;
    } else {
      setScannerActive(false);
    }
  };

  const processQR = useCallback((code: string) => {
    const parsed = parseQRCode(code);
    if (parsed.valid) {
      const product = products?.find(p => p.sku.includes(parsed.materialCode));
      setForm(f => ({
        ...f,
        scanned_code: code,
        sku: product?.sku || parsed.materialCode,
        product_id: product?.id || '',
        quantity: String(parsed.quantity),
      }));
      toast({ title: 'QR lido!', description: `${product?.name || parsed.materialCode}` });
    } else {
      setForm(f => ({ ...f, scanned_code: code }));
    }
  }, [products, toast]);

  const saveDamage = useMutation({
    mutationFn: async () => {
      const { data: damage, error } = await supabase.from('damages').insert({
        scanned_code: form.scanned_code || null,
        sku: form.sku || null,
        product_id: form.product_id || null,
        quantity: parseInt(form.quantity) || 0,
        material_type: form.material_type,
        responsible: form.responsible,
        damage_date: form.damage_date,
        notes: form.notes || null,
        created_by: user!.id,
      }).select().single();
      if (error) throw error;

      // Upload photos
      for (const photo of photos) {
        const ext = photo.name.split('.').pop();
        const path = `${damage.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('damage-photos').upload(path, photo);
        if (upErr) continue;
        const { data: urlData } = supabase.storage.from('damage-photos').getPublicUrl(path);
        await supabase.from('damage_photos').insert({ damage_id: damage.id, photo_url: urlData.publicUrl });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['damages'] });
      qc.invalidateQueries({ queryKey: ['damage-photos'] });
      toast({ title: 'Avaria registrada!' });
      setShowNew(false);
      setPhotos([]);
      setForm({ scanned_code: '', sku: '', product_id: '', quantity: '', material_type: 'PAV', responsible: '', damage_date: new Date().toISOString().split('T')[0], notes: '' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const updateDamage = useMutation({
    mutationFn: async (updates: { id: string; [key: string]: any }) => {
      const { id, ...rest } = updates;
      const { error } = await supabase.from('damages').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['damages'] });
      setEditItem(null);
    },
  });

  const soldDamages = damages?.filter(d => d.sold) || [];
  const unsoldDamages = damages?.filter(d => !d.sold) || [];

  const materialColors: Record<string, string> = {
    PAV: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
    PIF: 'bg-orange-500/20 text-orange-700 dark:text-orange-400',
    OS: 'bg-purple-500/20 text-purple-700 dark:text-purple-400',
  };

  const renderDamageRow = (d: any) => {
    const product = products?.find(p => p.id === d.product_id);
    const dPhotos = damagePhotos?.filter(p => p.damage_id === d.id) || [];
    return (
      <TableRow key={d.id}>
        <TableCell className="text-sm">{product?.name || d.sku || '—'}</TableCell>
        <TableCell className="font-mono text-xs">{d.sku || '—'}</TableCell>
        <TableCell>{d.quantity}</TableCell>
        <TableCell><Badge className={`text-xs ${materialColors[d.material_type] || ''}`}>{d.material_type}</Badge></TableCell>
        <TableCell className="text-xs">{d.responsible}</TableCell>
        <TableCell className="text-xs font-mono">{format(new Date(d.damage_date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
        <TableCell>
          {d.sold ? (
            <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 text-xs">Vendido - {d.order_number}</Badge>
          ) : (
            <Badge variant="outline" className="text-xs">Disponível</Badge>
          )}
        </TableCell>
        <TableCell>
          <div className="flex gap-1">
            {dPhotos.slice(0, 2).map((p: any) => (
              <a key={p.id} href={p.photo_url} target="_blank" rel="noreferrer">
                <img src={p.photo_url} className="h-8 w-8 rounded object-cover border border-border" alt="" />
              </a>
            ))}
            {dPhotos.length > 2 && <span className="text-[10px] text-muted-foreground self-end">+{dPhotos.length - 2}</span>}
          </div>
        </TableCell>
        <TableCell>
          <Button size="sm" variant="ghost" onClick={() => setEditItem(d)}>
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <Tabs defaultValue="registrar">
        <TabsList>
          <TabsTrigger value="registrar">Registrar</TabsTrigger>
          <TabsTrigger value="catalogo">Catálogo ({unsoldDamages.length})</TabsTrigger>
          <TabsTrigger value="vendidos">Vendidos ({soldDamages.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="registrar" className="space-y-4">
          <Button onClick={() => setShowNew(true)} className="gap-2"><Plus className="h-4 w-4" /> Registrar Avaria</Button>

          {showNew && (
            <Card>
              <CardHeader><CardTitle className="text-base">Nova Avaria</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 items-end">
                  <Button variant="outline" onClick={scannerActive ? () => { scannerRef.current?.stop().catch(() => {}); setScannerActive(false); } : handleStartScanner} className="gap-2">
                    <Camera className="h-4 w-4" /> {scannerActive ? 'Parar' : 'Escanear QR'}
                  </Button>
                </div>

                {scannerActive && <div id="damage-qr-reader" className="w-full max-w-sm mx-auto rounded-lg overflow-hidden border border-border" />}

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Código QR</Label>
                    <Input value={form.scanned_code} onChange={e => {
                      setForm(f => ({ ...f, scanned_code: e.target.value }));
                      const parsed = parseQRCode(e.target.value);
                      if (parsed.valid) {
                        const product = products?.find(p => p.sku.includes(parsed.materialCode));
                        setForm(f => ({ ...f, sku: product?.sku || parsed.materialCode, product_id: product?.id || '', quantity: String(parsed.quantity) }));
                      }
                    }} placeholder="Q0006092983" />
                  </div>
                  <div>
                    <Label>SKU</Label>
                    <Select value={form.product_id || undefined} onValueChange={v => {
                      const p = products?.find(pr => pr.id === v);
                      setForm(f => ({ ...f, product_id: v, sku: p?.sku || '' }));
                    }}>
                      <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>
                        {products?.map(p => <SelectItem key={p.id} value={p.id}>{p.sku} - {p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Qtd Avariada</Label>
                    <Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Tipo Material</Label>
                    <Select value={form.material_type} onValueChange={v => setForm(f => ({ ...f, material_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PAV">PAV</SelectItem>
                        <SelectItem value="PIF">PIF</SelectItem>
                        <SelectItem value="OS">OS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Responsável</Label>
                    <Input value={form.responsible} onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Data da Avaria</Label>
                    <Input type="date" value={form.damage_date} onChange={e => setForm(f => ({ ...f, damage_date: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
                </div>
                <div>
                  <Label>Fotos (até 4)</Label>
                  <Input type="file" accept="image/*" multiple onChange={e => {
                    const files = Array.from(e.target.files || []).slice(0, 4);
                    setPhotos(files);
                  }} />
                  {photos.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {photos.map((f, i) => (
                        <img key={i} src={URL.createObjectURL(f)} className="h-16 w-16 rounded object-cover border border-border" alt="" />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => saveDamage.mutate()} disabled={!form.responsible || !form.quantity}>Registrar Avaria</Button>
                  <Button variant="outline" onClick={() => setShowNew(false)}>Cancelar</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="catalogo">
          <div className="rounded-lg border border-border bg-card overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fotos</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unsoldDamages.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhuma avaria disponível</TableCell></TableRow>
                ) : unsoldDamages.map(renderDamageRow)}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="vendidos">
          <div className="rounded-lg border border-border bg-card overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fotos</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {soldDamages.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum item vendido</TableCell></TableRow>
                ) : soldDamages.map(renderDamageRow)}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Avaria</DialogTitle></DialogHeader>
          {editItem && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Label>Vendido</Label>
                <Switch checked={editItem.sold} onCheckedChange={v => setEditItem((e: any) => ({ ...e, sold: v }))} />
              </div>
              {editItem.sold && (
                <div>
                  <Label>Nº do Pedido</Label>
                  <Input value={editItem.order_number || ''} onChange={e => setEditItem((ei: any) => ({ ...ei, order_number: e.target.value }))} placeholder="Número do pedido" />
                </div>
              )}
              <div>
                <Label>Tipo Material</Label>
                <Select value={editItem.material_type} onValueChange={v => setEditItem((e: any) => ({ ...e, material_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PAV">PAV</SelectItem>
                    <SelectItem value="PIF">PIF</SelectItem>
                    <SelectItem value="OS">OS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Responsável</Label>
                <Input value={editItem.responsible} onChange={e => setEditItem((ei: any) => ({ ...ei, responsible: e.target.value }))} />
              </div>
              <Button onClick={() => {
                if (editItem.sold && !editItem.order_number) {
                  toast({ title: 'Informe o nº do pedido', variant: 'destructive' });
                  return;
                }
                updateDamage.mutate({
                  id: editItem.id,
                  sold: editItem.sold,
                  order_number: editItem.order_number,
                  material_type: editItem.material_type,
                  responsible: editItem.responsible,
                });
                toast({ title: 'Avaria atualizada!' });
              }}>Salvar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Damages;
