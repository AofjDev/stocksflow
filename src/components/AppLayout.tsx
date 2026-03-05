import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LayoutDashboard, Package, MapPin, ArrowLeftRight, AlertTriangle, LogOut, Menu, X, Warehouse, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { signOut, user, isAdmin } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/estoque', icon: Package, label: 'Estoque' },
    { to: '/enderecos', icon: MapPin, label: 'Endereços' },
    { to: '/movimentacoes', icon: ArrowLeftRight, label: 'Movimentações' },
    { to: '/nao-conformidades', icon: AlertTriangle, label: 'Não Conformidades' },
    ...(isAdmin ? [{ to: '/admin/usuarios', icon: Users, label: 'Usuários' }] : []),
  ];

  const currentLabel = navItems.find(i => i.to === location.pathname)?.label || 'Gypsum WMS';

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-60 flex flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:static lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Warehouse className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-sidebar-primary-foreground">Gypsum WMS</h2>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {navItems.map(item => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-sidebar-foreground/60">
            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-[10px]">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <span className="truncate flex-1">{user?.email}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent mt-1 h-8 text-xs">
            <LogOut className="mr-2 h-3.5 w-3.5" /> Sair
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card lg:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold">{currentLabel}</h1>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
