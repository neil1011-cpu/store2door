
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
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, ShieldCheck, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useSupabase } from '@/components/supabase-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminWelcomeAnimation } from '@/components/admin-welcome-animation';
import Image from 'next/image';
import Link from 'next/link';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

export default function AdminLoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { supabase } = useSupabase();
  const [loading, setLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password
      });

      if (error) throw error;

      // Verify Admin Status via RBAC RPC
      const { data: isAdmin, error: rpcError } = await supabase.rpc('is_admin');
      
      const isDomainAdmin = values.email === 'admin@neilussolutions.com';
      
      if (isAdmin || isDomainAdmin) {
        setShowWelcome(true);
      } else {
        await supabase.auth.signOut();
        toast({ 
            title: 'Access Denied', 
            description: 'Administrative privileges required. Please check your role assignment.', 
            variant: 'destructive' 
        });
      }
    } catch (error: any) {
        toast({ title: 'Authentication Failed', description: error.message, variant: 'destructive' });
    } finally {
        setLoading(false);
    }
  };

  if (showWelcome) return <AdminWelcomeAnimation onComplete={() => router.push('/admin')} />;

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-zinc-950 p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20 grayscale pointer-events-none">
          <Image src="https://picsum.photos/seed/delivery-van-dark/1920/1080" alt="Delivery Network" fill className="object-cover" data-ai-hint="delivery van" />
      </div>

      <Card className="w-full max-w-[450px] shadow-2xl border-none relative z-10 rounded-2xl">
        <CardHeader className="text-center space-y-2 pb-8">
            <div className="mx-auto bg-primary/10 w-20 h-20 rounded-2xl flex items-center justify-center mb-4 transform rotate-3 shadow-inner">
                <ShieldCheck className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-3xl font-black tracking-tighter uppercase italic">FromStore2Door OS</CardTitle>
            <CardDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[10px]">
                Administrative Access Control
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase opacity-60">Admin Identifier</FormLabel>
                    <FormControl><Input placeholder="admin@neilussolutions.com" {...field} className="h-12 border-2" /></FormControl>
                    <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase opacity-60">Secure Access Key</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} className="h-12 border-2" />
                        <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                </FormItem>
              )}/>
              <Button type="submit" size="lg" className="w-full h-14 text-lg font-black uppercase italic shadow-xl" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin h-6 w-6 mr-2" /> : "Authorize Entry"}
              </Button>
            </form>
          </Form>

          <div className="pt-6 border-t border-dashed flex flex-col gap-4">
              <Link href="/setup-admin" className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-2 uppercase tracking-widest">
                  <AlertCircle className="h-3 w-3" /> Initial System Setup / Recovery
              </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
