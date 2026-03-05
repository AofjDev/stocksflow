import { Warehouse, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

const PendingApproval = () => {
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg border-border/50">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-warning/20">
            <Clock className="h-7 w-7 text-warning" />
          </div>
          <h1 className="text-xl font-bold">Aguardando aprovação</h1>
          <p className="text-sm text-muted-foreground">
            Sua conta <span className="font-medium text-foreground">{user?.email}</span> está aguardando aprovação de um administrador. Você será notificado quando seu acesso for liberado.
          </p>
          <Button variant="outline" onClick={signOut} className="mt-4">
            Sair
          </Button>
        </CardHeader>
      </Card>
    </div>
  );
};

export default PendingApproval;
