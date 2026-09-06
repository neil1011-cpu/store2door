'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, ShieldCheck, AlertCircle, Fingerprint, CheckCircle2 } from 'lucide-react';
import { useSupabase } from '@/components/supabase-provider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
});

export default function SetupAdminPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isElevatingSession, setIsElevatingSession] = useState(false);
  const { supabase, user: currentUser } = useSupabase();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: 'admin@neilussolutions.com',
      password: '',
    },
  });

  const handleElevateCurrentSession = async () => {
      if (!currentUser) {
          toast({ title: 'No Session Found', description: 'Please sign in first.', variant: 'destructive' });
          return;
      }
      setIsElevatingSession(true);
      try {
          const { error } = await supabase.rpc('manage_user_role', { 
            target_user_id: currentUser.id, 
            new_role: 'admin' 
          });

          if (error) throw error;

          toast({ title: 'Privileges Granted!', description: 'Your administrator identity has been synchronized.' });
          
          setTimeout(() => {
            router.push('/admin');
          }, 1500);
      } catch (error: any) {
          console.error("Elevation error:", error);
          toast({ title: 'Setup Failed', description: error.message, variant: "destructive" });
      } finally {
          setIsElevatingSession(false);
      }
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    
    try {
        const response = await fetch('/api/admin/setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
        });

        const result = await response.json();

        if (!response.ok) throw new Error(result.message || 'Setup protocol failed.');

        toast({
            title: 'Identity Secured',
            description: 'Master Admin account created and confirmed successfully.',
        });
        
        setTimeout(() => {
            router.push('/admin-login');
        }, 2000);

    } catch (error: any) {
        toast({
            title: 'Setup Error',
            description: error.message,
            variant: 'destructive',
        });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-12 px-4 md:px-6 max-w-lg">
      <Card className="shadow-xl overflow-hidden border-none">
        <CardHeader className="text-center bg-primary/5 pb-8">
          <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="text-3xl mt-4 font-black italic uppercase tracking-tighter">Admin Recovery Hub</CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase tracking-widest">
            Establish Supabase Master Admin (@neilussolutions.com)
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
           <Alert className="mb-6 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-900">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertTitle className="font-bold uppercase text-xs">Administrative Protocol</AlertTitle>
                <AlertDescription className="text-[10px] uppercase leading-relaxed mt-1">
                    This terminal will auto-confirm your master email and grant full database access.
                </AlertDescription>
            </Alert>

          {currentUser ? (
              <div className="space-y-4 mb-8">
                  <div className="p-4 border-2 border-dashed rounded-xl bg-muted/30 flex items-center gap-4">
                      <Fingerprint className="h-8 w-8 text-primary" />
                      <div className="overflow-hidden">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">Active Session</p>
                          <p className="font-bold truncate text-sm">{currentUser.email}</p>
                      </div>
                  </div>
                  <Button onClick={handleElevateCurrentSession} disabled={isElevatingSession} className="w-full h-14 font-black uppercase italic shadow-lg" variant="secondary">
                      {isElevatingSession ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                      Elevate Current Account
                  </Button>
                  <div className="relative py-4">
                    <Separator />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-[10px] uppercase font-bold text-muted-foreground">OR CONFIGURE MASTER</span>
                  </div>
              </div>
          ) : null}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase opacity-60">Master Admin ID</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="admin@neilussolutions.com" {...field} className="h-12 border-2" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase opacity-60">Secure Key</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} className="h-12 border-2" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" size="lg" className="w-full h-14 text-lg font-black uppercase italic shadow-xl" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Authorizing...</> : 'Bypass Verification & Initialize'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
