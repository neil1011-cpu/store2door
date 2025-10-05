
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
import { Loader2, Route } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

export default function AdminLoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const auth = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    // For this prototype, we'll use a simple hardcoded check for the admin user.
    if (values.email !== 'admin@example.com') {
         toast({
            title: 'Sign In Failed',
            description: 'This page is for admin access only.',
            variant: 'destructive',
        });
        setLoading(false);
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, values.email, values.password);
        toast({
            title: 'Admin Sign In Successful!',
            description: 'Welcome back! Redirecting to the admin dashboard...',
        });
        router.push('/admin');
    } catch(error) {
        toast({
            title: 'Sign In Failed',
            description: 'Invalid email or password for admin account.',
            variant: 'destructive',
        });
        setLoading(false);
    }
  };

  return (
    <div className="container mx-auto flex items-center justify-center min-h-screen py-12 px-4 md:px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
            <div className="flex justify-center items-center gap-2 mb-4">
                <Route className="size-8 text-primary" />
                <h1 className="text-2xl font-bold">FromStore2Door</h1>
            </div>
        </div>
        <Card>
            <CardHeader>
            <CardTitle className="text-2xl">Admin Sign In</CardTitle>
            <CardDescription>
                Access the courier management dashboard.
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
                        <Input type="email" placeholder="admin@example.com" {...field} />
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
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                    {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing In...</> : 'Sign In'}
                </Button>
                </form>
            </Form>
             <p className="mt-6 text-center text-sm text-muted-foreground">
                Go back to the <Link href="/" className="font-semibold text-primary hover:underline">main site</Link>.
             </p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
