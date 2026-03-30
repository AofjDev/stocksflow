import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, GripVertical, Trash2, Edit2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Tasks = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showNewTask, setShowNewTask] = useState(false);
  const [editTask, setEditTask] = useState<any>(null);
  const [showStatusManager, setShowStatusManager] = useState(false);
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('#6b7280');
  const [form, setForm] = useState({ title: '', description: '', priority: 'media', status_id: '', due_date: '' });

  const { data: statuses } = useQuery({
    queryKey: ['task-statuses'],
    queryFn: async () => {
      const { data } = await supabase.from('task_statuses').select('*').order('sort_order');
      return data || [];
    },
  });

  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ['profiles-list'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('user_id, full_name').eq('approved', true);
      return data || [];
    },
  });

  const createTask = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('tasks').insert({
        title: form.title,
        description: form.description || null,
        priority: form.priority,
        status_id: form.status_id || (statuses?.[0]?.id ?? null),
        due_date: form.due_date || null,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: 'Tarefa criada!' });
      setShowNewTask(false);
      setForm({ title: '', description: '', priority: 'media', status_id: '', due_date: '' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const updateTask = useMutation({
    mutationFn: async (updates: { id: string; [key: string]: any }) => {
      const { id, ...rest } = updates;
      const { error } = await supabase.from('tasks').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: 'Tarefa removida' });
    },
  });

  const createStatus = useMutation({
    mutationFn: async () => {
      const maxOrder = Math.max(0, ...(statuses?.map(s => s.sort_order) || []));
      const { error } = await supabase.from('task_statuses').insert({ name: newStatusName, color: newStatusColor, sort_order: maxOrder + 1 });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-statuses'] });
      setNewStatusName('');
      setNewStatusColor('#6b7280');
      toast({ title: 'Status criado!' });
    },
  });

  const deleteStatus = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('task_statuses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-statuses'] });
      toast({ title: 'Status removido' });
    },
  });

  const priorityColors: Record<string, string> = {
    baixa: 'bg-muted text-muted-foreground',
    media: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
    alta: 'bg-orange-500/20 text-orange-700 dark:text-orange-400',
    urgente: 'bg-destructive/20 text-destructive',
  };

  const priorityLabels: Record<string, string> = {
    baixa: 'Baixa', media: 'Média', alta: 'Alta', urgente: 'Urgente',
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex gap-2 flex-wrap">
        <Button onClick={() => setShowNewTask(true)} className="gap-2"><Plus className="h-4 w-4" /> Nova Tarefa</Button>
        {isAdmin && (
          <Button variant="outline" onClick={() => setShowStatusManager(true)}>Gerenciar Status</Button>
        )}
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {statuses?.map(status => {
          const statusTasks = tasks?.filter(t => t.status_id === status.id) || [];
          return (
            <div key={status.id} className="min-w-[280px] max-w-[320px] flex-shrink-0">
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: status.color }} />
                <h3 className="text-sm font-semibold">{status.name}</h3>
                <Badge variant="secondary" className="text-xs ml-auto">{statusTasks.length}</Badge>
              </div>
              <div className="space-y-2 min-h-[200px] rounded-lg border border-border bg-muted/30 p-2">
                {statusTasks.map(task => {
                  const assignee = profiles?.find(p => p.user_id === task.assigned_to);
                  return (
                    <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium leading-tight">{task.title}</p>
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => setEditTask(task)} className="text-muted-foreground hover:text-foreground">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            {isAdmin && (
                              <button onClick={() => deleteTask.mutate(task.id)} className="text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`text-[10px] ${priorityColors[task.priority]}`}>
                            {priorityLabels[task.priority] || task.priority}
                          </Badge>
                          {task.due_date && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(task.due_date + 'T12:00:00'), 'dd/MM', { locale: ptBR })}
                            </span>
                          )}
                          {assignee && (
                            <span className="text-[10px] text-muted-foreground">{assignee.full_name}</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Unassigned column */}
        {(() => {
          const unassigned = tasks?.filter(t => !t.status_id || !statuses?.find(s => s.id === t.status_id)) || [];
          if (unassigned.length === 0) return null;
          return (
            <div className="min-w-[280px] max-w-[320px] flex-shrink-0">
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="h-3 w-3 rounded-full bg-muted-foreground/30" />
                <h3 className="text-sm font-semibold text-muted-foreground">Sem Status</h3>
                <Badge variant="secondary" className="text-xs ml-auto">{unassigned.length}</Badge>
              </div>
              <div className="space-y-2 min-h-[200px] rounded-lg border border-border bg-muted/30 p-2">
                {unassigned.map(task => (
                  <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <p className="text-sm font-medium">{task.title}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* New Task Dialog */}
      <Dialog open={showNewTask} onOpenChange={setShowNewTask}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Título</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prioridade</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status_id} onValueChange={v => setForm(f => ({ ...f, status_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {statuses?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Data limite</Label>
              <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <Button onClick={() => createTask.mutate()} disabled={!form.title}>Criar Tarefa</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={!!editTask} onOpenChange={() => setEditTask(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Tarefa</DialogTitle></DialogHeader>
          {editTask && (
            <div className="space-y-3">
              <div>
                <Label>Título</Label>
                <Input value={editTask.title} onChange={e => setEditTask((t: any) => ({ ...t, title: e.target.value }))} />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={editTask.description || ''} onChange={e => setEditTask((t: any) => ({ ...t, description: e.target.value }))} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Prioridade</Label>
                  <Select value={editTask.priority} onValueChange={v => setEditTask((t: any) => ({ ...t, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={editTask.status_id || ''} onValueChange={v => setEditTask((t: any) => ({ ...t, status_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      {statuses?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Data limite</Label>
                <Input type="date" value={editTask.due_date || ''} onChange={e => setEditTask((t: any) => ({ ...t, due_date: e.target.value }))} />
              </div>
              <Button onClick={() => {
                updateTask.mutate({ id: editTask.id, title: editTask.title, description: editTask.description, priority: editTask.priority, status_id: editTask.status_id, due_date: editTask.due_date });
                setEditTask(null);
                toast({ title: 'Tarefa atualizada!' });
              }}>Salvar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Manager Dialog */}
      <Dialog open={showStatusManager} onOpenChange={setShowStatusManager}>
        <DialogContent>
          <DialogHeader><DialogTitle>Gerenciar Status</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {statuses?.map(s => (
              <div key={s.id} className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-sm flex-1">{s.name}</span>
                <Button size="sm" variant="ghost" onClick={() => deleteStatus.mutate(s.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2 items-end border-t border-border pt-3">
              <div className="flex-1">
                <Label>Nome</Label>
                <Input value={newStatusName} onChange={e => setNewStatusName(e.target.value)} placeholder="Novo status" />
              </div>
              <div>
                <Label>Cor</Label>
                <Input type="color" value={newStatusColor} onChange={e => setNewStatusColor(e.target.value)} className="w-16 h-10 p-1" />
              </div>
              <Button size="sm" onClick={() => createStatus.mutate()} disabled={!newStatusName}>Adicionar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tasks;
