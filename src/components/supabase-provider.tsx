'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, AlertTriangle, Key } from 'lucide-react';

type SupabaseContext = {
  supabase: SupabaseClient;
  user: User | null;
  isLoading: boolean;
};

const Context = createContext<SupabaseContext | undefined>(undefined);

export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigMissing, setIsConfigMissing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    // Validate configuration
    if (!url || !url.startsWith('http') || url.includes('your_project_url') || !key || key.includes('your_public_key')) {
      setIsConfigMissing(true);
      setIsLoading(false);
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
      if (event === 'SIGNED_IN') router.refresh();
      if (event === 'SIGNED_OUT') router.refresh();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  if (isConfigMissing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
        <Card className="max-w-md w-full shadow-2xl border-orange-200">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto bg-orange-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-4">
              <Database className="h-8 w-8 text-orange-600" />
            </div>
            <CardTitle className="text-2xl font-black italic uppercase tracking-tighter">Database Link Required</CardTitle>
            <CardDescription className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">
              Supabase configuration detected as missing or invalid
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="p-4 bg-orange-50 border border-dashed border-orange-200 rounded-xl flex gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0" />
              <p className="text-[11px] font-bold text-orange-800 uppercase leading-relaxed">
                To activate the Global Logistics OS, you must define your Supabase Project credentials in the environment settings (.env file).
              </p>
            </div>

            <div className="space-y-4 font-mono text-[10px]">
              <div className="p-3 bg-zinc-950 text-zinc-400 rounded-lg border border-white/5 space-y-2 shadow-inner">
                <div className="flex items-center gap-2">
                  <Key className="h-3 w-3 text-orange-500" />
                  <span className="text-zinc-500 italic uppercase font-black">Required Variables:</span>
                </div>
                <p>NEXT_PUBLIC_SUPABASE_URL</p>
                <p>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</p>
                <p>SUPABASE_SECRET_KEY</p>
              </div>
            </div>

            <p className="text-center text-[9px] font-medium text-muted-foreground uppercase tracking-tight italic">
              Refresh this page once you have updated your .env settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Context.Provider value={{ supabase, user, isLoading }}>
      {children}
    </Context.Provider>
  );
}

export const useSupabase = () => {
  const context = useContext(Context);
  if (context === undefined) {
    throw new Error('useSupabase must be used inside SupabaseProvider');
  }
  return context;
};