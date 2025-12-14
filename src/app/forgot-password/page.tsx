
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
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const auth = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    
    try {
        await sendPasswordResetEmail(auth, values.email);
        toast({
          title: 'Password Reset Email Sent',
          description: 'If an account exists for this email, a reset link has been sent. Please check your inbox.',
        });
        form.reset();
    } catch (error: any) {
        console.error("Password reset error:", error);
        // For security, we don't reveal if an email doesn't exist.
        // We show the same success message regardless of the outcome.
        toast({
            title: 'Password Reset Email Sent',
            description: 'If an account exists for this email, a reset link has been sent. Please check your inbox.',
        });
    }

    setLoading(false);
  };

  return (
    <div className="container mx-auto py-12 px-4 md:px-6 max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Reset Your Password</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                 {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending Link...</> : 'Send Reset Link'}
              </Button>
            </form>
          </Form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remember your password?{' '}
            <Link href="/signin" className="font-semibold text-primary hover:underline">
              Sign In
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
