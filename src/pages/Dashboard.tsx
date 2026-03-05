import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Package, MapPin, AlertTriangle, ArrowLeftRight, Clock, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, isAfter, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CATEGORY_LABELS: Record<string, string> = {
  placa_st: 'Placa ST', placa_ru: 'Placa RU', placa_rf: 'Placa RF',
  placa_fortissima: 'Fortíssima', perfil_metalico: 'Perfil', acessorio: 'Acessório', massa: 'Massa', fita: 'Fita',
};

const COLORS = ['hsl(25,95%,53%)', 'hsl(145,63%,40%)', 'hsl(45,93%,47%)', 'hsl(0,72%,51%)', 'hsl(200,80%,50%)', 'hsl(30,80%,40%)', 'hsl(180,60%,40%)', 'hsl(340,70%,50%)'];

const Dashboard = () => {
  const { data: inventory } = useQuery({
    queryKey: ['dashboard-inventory'],
    queryFn: async () => {
      const { data } = await supabase.from('inventory').select('*, products(*), locations(*)');
      return data || [];
    },
  });

  const { data: locations } = useQuery({
    queryKey: ['dashboard-locations'],
    queryFn: async () => {
      const { data } = await supabase.from('locations').select('*').eq('active', true);
      return data || [];
    },
  });

  const { data: movements } = useQuery({
    queryKey: ['dashboard-movements'],
    queryFn: async () => {
      const { data } = await supabase.from('movements').select('*').order('created_at', { ascending: false }).limit(50);
      return data || [];
    },
  });

  const { data: nonconformities } = useQuery({
    queryKey: ['dashboard-nc'],
    queryFn: async () => {
      const { data } = await supabase.from('nonconformities').select('*');
      return data || [];
    },
  });

  const totalItems = inventory?.reduce((sum, i) => sum + i.quantity, 0) || 0;
  const totalLocations = locations?.length || 0;

  // Occupied locations
  const occupiedLocationIds = new Set(inventory?.filter(i => i.quantity > 0).map(i => i.location_id));
  const occupancyRate = totalLocations > 0 ? Math.round((occupiedLocationIds.size / totalLocations) * 100) : 0;

  // Expiring soon (next 30 days)
  const today = new Date();
  const expiringSoon = inventory?.filter(i => i.expiry_date && isAfter(addDays(today, 30), new Date(i.expiry_date)) && isAfter(new Date(i.expiry_date), today)) || [];
  const expired = inventory?.filter(i => i.expiry_date && !isAfter(new Date(i.expiry_date), today)) || [];

  // Open NCs
  const openNCs = nonconformities?.filter(nc => nc.status === 'aberta' || nc.status === 'em_analise') || [];

  // Stock by category
  const categoryData = inventory?.reduce((acc, item) => {
    const cat = item.products?.category || 'outro';
    const label = CATEGORY_LABELS[cat] || cat;
    const existing = acc.find(a => a.name === label);
    if (existing) existing.value += item.quantity;
    else acc.push({ name: label, value: item.quantity });
    return acc;
  }, [] as { name: string; value: number }[]) || [];

  // Recent movements by day
  const movementsByDay = movements?.reduce((acc, m) => {
    const day = format(new Date(m.created_at), 'dd/MM', { locale: ptBR });
    const existing = acc.find(a => a.day === day);
    if (existing) existing.count++;
    else acc.push({ day, count: 1 });
    return acc;
  }, [] as { day: string; count: number }[]).reverse() || [];

  // Vacancy stats
  const freeLocations = totalLocations - occupiedLocationIds.size;

  const stats = [
    { label: 'Itens em Estoque', value: totalItems, icon: Package, color: 'text-primary' },
    { label: 'Ocupação', value: `${occupancyRate}%`, icon: MapPin, color: 'text-success' },
    { label: 'Vagas Livres', value: freeLocations, icon: MapPin, color: 'text-info' },
    { label: 'Vencendo em 30d', value: expiringSoon.length, icon: Clock, color: 'text-warning' },
    { label: 'Vencidos', value: expired.length, icon: TrendingDown, color: 'text-destructive' },
    { label: 'NCs Abertas', value: openNCs.length, icon: AlertTriangle, color: 'text-destructive' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-xs text-muted-foreground font-medium">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="stat-card">
          <h3 className="text-sm font-semibold mb-4">Movimentações Recentes</h3>
          <div className="h-64">
            {movementsByDay.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={movementsByDay}>
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(220,70%,45%)" radius={[4, 4, 0, 0]} name="Movimentações" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Sem movimentações registradas
              </div>
            )}
          </div>
        </div>

        <div className="stat-card">
          <h3 className="text-sm font-semibold mb-4">Estoque por Categoria</h3>
          <div className="h-64">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Sem estoque registrado
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Expiring */}
        <div className="stat-card">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-warning" /> Produtos Vencendo
          </h3>
          {[...expired, ...expiringSoon].length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-auto">
              {[...expired, ...expiringSoon].map(item => (
                <div key={item.id} className="flex justify-between items-center text-sm py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="font-medium">{item.products?.name}</p>
                    <p className="text-xs text-muted-foreground">Lote: {item.lot_number || 'N/A'} · {item.locations?.full_address}</p>
                  </div>
                  <span className={`text-xs font-mono font-medium ${!isAfter(new Date(item.expiry_date!), today) ? 'text-destructive' : 'text-warning'}`}>
                    {format(new Date(item.expiry_date!), 'dd/MM/yyyy')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum produto próximo do vencimento</p>
          )}
        </div>

        {/* Open NCs */}
        <div className="stat-card">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" /> Não Conformidades Abertas
          </h3>
          {openNCs.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-auto">
              {openNCs.map(nc => (
                <div key={nc.id} className="flex justify-between items-center text-sm py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="font-medium">{nc.type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{nc.description}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${nc.status === 'aberta' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>
                    {nc.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma NC aberta 🎉</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
