'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { Loader2, Eye, EyeOff, Lock } from 'lucide-react';
import { useSupabase } from '@/components/supabase-provider';

const formSchema = z.object({
  email: z.string().email({ message: 'Enter valid email.' }),
  password: z.string().min(1, { message: 'Password required.' }),
});

export default function SignInPage() {
  const { supabase } = useSupabase();
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
    });

    if (error) {
        toast({ title: 'Sign In Failed', description: error.message, variant: 'destructive' });
        setLoading(false);
    } else {
        toast({ title: 'Welcome Back!' });
        router.push('/account');
    }
  };

  return (
    <div className="container mx-auto py-24 px-4 flex justify-center items-center min-h-[80vh]">
      <Card className="w-full max-w-md shadow-2xl border-none">
        <CardHeader className="text-center space-y-2 pb-8">
            <div className="mx-auto bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-2">
                <Lock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-black italic uppercase tracking-tighter">Secure Sign In</CardTitle>
            <CardDescription className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">
                Authorize your global logistics session.
            </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase opacity-60">Account Identifier</FormLabel>
                  <FormControl><Input placeholder="you@example.com" {...field} className="h-12 border-2" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-[10px] font-bold uppercase opacity-60">Access Key</FormLabel>
                      <Link href="/forgot-password" size="sm" className="text-[10px] font-black uppercase text-primary hover:underline">
                        Forgot key?
                      </Link>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Input type={showPassword ? "text" : "password"} {...field} className="h-12 border-2 pr-12" />
                        <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                </FormItem>
              )}/>
              <Button type="submit" size="lg" className="w-full h-14 text-lg font-black uppercase italic shadow-xl" disabled={loading}>
                 {loading ? <Loader2 className="animate-spin mr-2" /> : 'Authorize Entry'}
              </Button>
            </form>
          </Form>
          
          <div className="mt-8 pt-6 border-t border-dashed text-center">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
              New to FromStore2Door? <Link href="/signup" className="text-primary hover:underline ml-1">Establish Account</Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
