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
import Link from 'next/link';
import { useState } from 'react';
import { Loader2, ArrowLeft, Mail, ShieldAlert } from 'lucide-react';
import { useSupabase } from '@/components/supabase-provider';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const { supabase } = useSupabase();
  const [loading, setLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    
    try {
        // Use the browser location origin to ensure correct redirection on production URL
        const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
            redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`
        });

        if (error) throw error;

        toast({
            title: 'Instructions Dispatched',
            description: 'Check your inbox for a secure reset link.',
        });
        setIsSent(true);
    } catch (error: any) {
        console.error("Password reset error:", error);
        toast({
            title: 'System Interruption',
            description: error.message || 'There was an issue processing your request.',
            variant: 'destructive',
        });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-12 px-4 md:px-6 max-w-lg min-h-[70vh] flex items-center justify-center">
      <Card className="w-full shadow-2xl border-none">
        <CardHeader className="text-center space-y-2 pb-8">
            <div className="mx-auto bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-2">
                <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-black italic uppercase tracking-tighter">Reset Secure Key</CardTitle>
            <CardDescription className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">
                Authorize instructions for your logistics identity.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isSent ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase opacity-60">Verified Email Address</FormLabel>
                      <FormControl>
                        <Input placeholder="you@example.com" {...field} className="h-12 border-2 focus:border-primary" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" size="lg" className="w-full h-14 text-lg font-black uppercase italic shadow-xl" disabled={loading}>
                   {loading ? <><Loader2 className="mr-2 h-6 w-6 animate-spin" /> Authorizing...</> : 'Dispatch Reset Link'}
                </Button>
              </form>
            </Form>
          ) : (
            <div className="py-8 text-center space-y-6">
               <div className="bg-green-50 border-2 border-dashed border-green-200 p-6 rounded-2xl">
                 <ShieldAlert className="h-10 w-10 text-green-600 mx-auto mb-4" />
                 <p className="text-sm font-bold uppercase tracking-tight text-green-800">Uplink Successful</p>
                 <p className="text-xs text-green-700/70 font-medium leading-relaxed mt-2">
                   We have dispatched a one-time secure link to your registered email. Follow the instructions to finalize your new access key.
                 </p>
               </div>
               <Button variant="outline" className="w-full h-12 font-black uppercase italic border-2" asChild>
                 <Link href="/signin">Return to Sign In</Link>
               </Button>
            </div>
          )}
          
          <div className="pt-6 text-center border-t border-dashed flex flex-col gap-4">
              <Link href="/signin" className="text-xs font-bold text-primary hover:underline flex items-center justify-center gap-2 uppercase tracking-widest">
                <ArrowLeft className="h-3 w-3" /> Back to Secure Sign In
              </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
