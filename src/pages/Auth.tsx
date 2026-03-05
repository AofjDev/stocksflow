import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Warehouse, LogIn, UserPlus } from 'lucide-react';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupDone, setSignupDone] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { toast } = useToast();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setEmail(normalizedEmail);
      setResetSent(true);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setEmail(normalizedEmail);
        setSignupDone(true);
      }
    } catch (error: any) {
      const rawMessage = String(error?.message ?? '');
      const isInvalidCredentials = rawMessage.toLowerCase().includes('invalid login credentials');
      toast({
        title: 'Erro',
        description: isInvalidCredentials
          ? 'Email ou senha inválidos. Confira se o email está correto e tente novamente.'
          : rawMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (signupDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-lg border-border/50">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
              <Warehouse className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold">Conta criada!</h1>
            <p className="text-sm text-muted-foreground">
              Sua conta foi criada. Se você receber email de confirmação, confirme-o antes do login; depois, um administrador precisa aprovar seu acesso ao sistema.
            </p>
            <Button variant="outline" onClick={() => { setSignupDone(false); setIsLogin(true); }}>
              Voltar ao login
            </Button>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (resetSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-lg border-border/50">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
              <Warehouse className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold">Email enviado!</h1>
            <p className="text-sm text-muted-foreground">
              Enviamos um link de recuperação para <strong>{email}</strong>. Verifique sua caixa de entrada.
            </p>
            <Button variant="outline" onClick={() => { setResetSent(false); setForgotMode(false); }}>
              Voltar ao login
            </Button>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (forgotMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-lg border-border/50">
          <CardHeader className="text-center space-y-4 pb-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
              <Warehouse className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Recuperar senha</h1>
              <p className="text-sm text-muted-foreground mt-1">Informe seu email para receber o link de recuperação</p>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Aguarde...' : 'Enviar link de recuperação'}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                <button type="button" onClick={() => setForgotMode(false)} className="text-primary font-medium hover:underline">
                  Voltar ao login
                </button>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg border-border/50">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <Warehouse className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">StockFlow</h1>
            <p className="text-sm text-muted-foreground mt-1">Warehouse Management System</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Seu nome" required />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
              {isLogin && (
                <button type="button" onClick={() => setForgotMode(true)} className="text-xs text-primary hover:underline mt-1 block ml-auto">
                  Esqueceu a senha?
                </button>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Aguarde...' : isLogin ? (
                <><LogIn className="mr-2 h-4 w-4" /> Entrar</>
              ) : (
                <><UserPlus className="mr-2 h-4 w-4" /> Criar conta</>
              )}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {isLogin ? 'Não tem conta?' : 'Já tem conta?'}{' '}
              <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-primary font-medium hover:underline">
                {isLogin ? 'Criar conta' : 'Fazer login'}
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
