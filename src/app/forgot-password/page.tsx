'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useState } from 'react';
import { Loader2, ArrowLeft, Mail, ShieldAlert, AlertCircle } from 'lucide-react';
import { useSupabase } from '@/components/supabase-provider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const formSchema = z.object({
  email: z.string().email({ message: 'Enter a valid registered email.' }),
});

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const { supabase } = useSupabase();
  const [loading, setLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    setRateLimited(false);
    try {
        // CRITICAL: Use the browser's actual origin to avoid build-time env var leakage
        const origin = window.location.origin;
        
        // Exact matching for Supabase Redirect Whitelist
        // Points to /auth/callback which handles the PKCE exchange
        const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
            redirectTo: `${origin}/auth/callback`
        });

        if (error) {
            if (error.status === 429 || error.message.toLowerCase().includes('rate limit')) {
                setRateLimited(true);
                throw new Error("Supabase security limit reached.");
            }
            throw error;
        }

        toast({ title: 'Link Dispatched', description: 'Check your inbox for security instructions.' });
        setIsSent(true);
    } catch (error: any) {
        toast({ 
            title: 'Request Denied', 
            description: error.message, 
            variant: 'destructive' 
        });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-24 px-4 flex justify-center items-center min-h-[70vh]">
      <Card className="w-full max-w-md shadow-2xl border-none">
        <CardHeader className="text-center space-y-2 pb-8">
            <div className="mx-auto bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-2"><Mail className="h-8 w-8 text-primary" /></div>
            <CardTitle className="text-3xl font-black italic uppercase tracking-tighter">Security Protocol</CardTitle>
            <CardDescription className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Request access key restoration.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {rateLimited && (
            <Alert variant="destructive" className="bg-destructive/5 border-dashed">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-xs font-black uppercase">Email Rate Limit</AlertTitle>
                <AlertDescription className="text-[10px] leading-relaxed mt-1">
                    Supabase allows 1 email per hour by default. To unblock testing:
                    <ol className="list-decimal pl-4 mt-2 space-y-1">
                        <li>Go to Supabase Dashboard > Authentication</li>
                        <li>Provider Settings > Email</li>
                        <li>Set "Rate Limit" to 1 second and Save.</li>
                    </ol>
                </AlertDescription>
            </Alert>
          )}

          {!isSent ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase opacity-60">Verified Identity Email</FormLabel>
                      <FormControl><Input placeholder="you@example.com" {...field} className="h-12 border-2" /></FormControl>
                      <FormMessage />
                    </FormItem>
                )}/>
                <Button type="submit" size="lg" className="w-full h-14 text-lg font-black uppercase italic shadow-xl" disabled={loading}>
                   {loading ? <><Loader2 className="mr-2 h-6 w-6 animate-spin" /> Authorizing...</> : 'Dispatch Reset Link'}
                </Button>
              </form>
            </Form>
          ) : (
            <div className="py-8 text-center space-y-6">
               <div className="bg-green-50 border-2 border-dashed border-green-200 p-6 rounded-2xl">
                 <ShieldAlert className="h-10 w-10 text-green-600 mx-auto mb-4" />
                 <p className="text-sm font-bold uppercase tracking-tight text-green-800">Dispatch Successful</p>
                 <p className="text-xs text-green-700/70 font-medium leading-relaxed mt-2">Follow the link in your email to define your new access key.</p>
               </div>
               <Button variant="outline" className="w-full h-12 font-black uppercase italic border-2" asChild><Link href="/signin">Return to Sign In</Link></Button>
            </div>
          )}
          <div className="pt-6 text-center border-t border-dashed"><Link href="/signin" className="text-xs font-bold text-primary hover:underline uppercase tracking-widest flex items-center justify-center gap-2"><ArrowLeft className="h-3 w-3" /> Back to Secure Entry</Link></div>
        </CardContent>
      </Card>
    </div>
  );
}
