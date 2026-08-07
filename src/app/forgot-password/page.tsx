
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
import { Loader2, ArrowLeft, Mail } from 'lucide-react';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    
    try {
        const response = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: values.email }),
        });

        const data = await response.json();

        if (response.ok) {
            toast({
                title: 'Instructions Dispatched',
                description: data.message || 'Check your inbox for a secure reset link.',
            });
            form.reset();
        } else {
            throw new Error(data.message || 'Failed to request reset.');
        }
    } catch (error: any) {
        console.error("Password reset error:", error);
        toast({
            title: 'System Interruption',
            description: error.message || 'There was an issue processing your request. Please try again later.',
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
          <div className="pt-6 text-center border-t border-dashed flex flex-col gap-4">
              <Link href="/signin" className="text-xs font-bold text-primary hover:underline flex items-center justify-center gap-2">
                <ArrowLeft className="h-4 w-4" /> Return to Secure Sign In
              </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
