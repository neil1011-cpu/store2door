
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
import { Loader2, Eye, EyeOff } from 'lucide-react';
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
    <div className="container mx-auto py-12 px-4 max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Sign In</CardTitle>
          <CardDescription>Access your Supabase-powered dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="you@example.com" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type={showPassword ? "text" : "password"} {...field} />
                        <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff /> : <Eye />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                </FormItem>
              )}/>
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                 {loading ? <Loader2 className="animate-spin" /> : 'Sign In'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
