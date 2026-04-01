import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Warehouse, LogIn, UserPlus } from 'lucide-react';
import { lovable } from '@/integrations/lovable/index';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupDone, setSignupDone] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast({ title: 'Erro', description: String(result.error), variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setGoogleLoading(false);
    }
  };

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
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">ou</span></div>
            </div>
            <Button type="button" variant="outline" className="w-full" disabled={googleLoading} onClick={handleGoogleSignIn}>
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              {googleLoading ? 'Aguarde...' : 'Entrar com Google'}
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
