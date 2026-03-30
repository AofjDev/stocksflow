import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Shield, ShieldOff } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AdminUsers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const updateProfile = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: { approved?: boolean; is_admin?: boolean } }) => {
      const { error } = await supabase.from('profiles').update(updates).eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      toast({ title: 'Usuário atualizado!' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const pending = profiles?.filter(p => !p.approved) || [];
  const approved = profiles?.filter(p => p.approved) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Pending */}
      {pending.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-warning animate-pulse" />
            Aguardando aprovação ({pending.length})
          </h2>
          <div className="rounded-lg border border-warning/30 bg-warning/5 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name}</TableCell>
                    <TableCell className="text-sm">{p.role}</TableCell>
                    <TableCell className="text-xs font-mono">{format(new Date(p.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateProfile.mutate({ userId: p.user_id, updates: { approved: true } })}
                          className="gap-1"
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateProfile.mutate({ userId: p.user_id, updates: { approved: false } })}
                          className="gap-1"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Reprovar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Approved users */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Usuários ativos ({approved.length})</h2>
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : approved.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum usuário aprovado</TableCell></TableRow>
              ) : (
                approved.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name}</TableCell>
                    <TableCell className="text-sm">{p.role}</TableCell>
                    <TableCell>
                      {p.is_admin ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Admin</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono">{format(new Date(p.created_at), "dd/MM/yy", { locale: ptBR })}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateProfile.mutate({ userId: p.user_id, updates: { is_admin: !p.is_admin } })}
                          title={p.is_admin ? 'Remover admin' : 'Tornar admin'}
                        >
                          {p.is_admin ? <ShieldOff className="h-4 w-4 text-muted-foreground" /> : <Shield className="h-4 w-4 text-primary" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateProfile.mutate({ userId: p.user_id, updates: { approved: false } })}
                          title="Revogar acesso"
                        >
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
