import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import Auth from "@/pages/Auth";
import PendingApproval from "@/pages/PendingApproval";
import Dashboard from "@/pages/Dashboard";
import Inventory from "@/pages/Inventory";
import Locations from "@/pages/Locations";
import Movements from "@/pages/Movements";
import NonConformities from "@/pages/NonConformities";
import AdminUsers from "@/pages/AdminUsers";
import InventoryStatuses from "@/pages/InventoryStatuses";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) => {
  const { session, loading, isApproved, isAdmin } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (!isApproved) return <PendingApproval />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return <AppLayout>{children}</AppLayout>;
};

const AuthRoute = () => {
  const { session, loading, isApproved } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (session && isApproved) return <Navigate to="/" replace />;
  if (session && !isApproved) return <PendingApproval />;
  return <Auth />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<AuthRoute />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/estoque" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
            <Route path="/enderecos" element={<ProtectedRoute><Locations /></ProtectedRoute>} />
            <Route path="/movimentacoes" element={<ProtectedRoute><Movements /></ProtectedRoute>} />
            <Route path="/nao-conformidades" element={<ProtectedRoute><NonConformities /></ProtectedRoute>} />
            <Route path="/admin/usuarios" element={<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/status" element={<ProtectedRoute adminOnly><InventoryStatuses /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
