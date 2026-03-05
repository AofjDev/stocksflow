import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
  approved: boolean;
  is_admin: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isApproved: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  isApproved: false,
  isAdmin: false,
  signOut: async () => {},
  refetchProfile: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (authUser: User) => {
    const fallbackName = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuário';

    await supabase.rpc('bootstrap_current_user', { _full_name: fallbackName });

    const [{ data: profileData }, { data: rolesData }] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle(),
      supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authUser.id),
    ]);

    setProfile(profileData as Profile | null);
    setIsAdmin((rolesData || []).some((r: any) => r.role === 'admin'));
  };

  useEffect(() => {
    const hydrateSession = async (currentSession: Session | null) => {
      setSession(currentSession);

      if (currentSession?.user) {
        await fetchProfile(currentSession.user);
      } else {
        setProfile(null);
        setIsAdmin(false);
      }

      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      void hydrateSession(currentSession);
    });

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      void hydrateSession(currentSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setIsAdmin(false);
  };

  const refetchProfile = async () => {
    if (session?.user) {
      await fetchProfile(session.user);
    }
  };

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      profile,
      loading,
      isApproved: profile?.approved ?? false,
      isAdmin,
      signOut,
      refetchProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

