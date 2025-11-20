
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
import Link from 'next/link';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { users as mockUsers } from '@/lib/mock-data';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

export default function SignInPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    // In a real app, this would be an API call to a proper authentication service (e.g., Firebase Auth)
    // We are simulating by checking against mock data.
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const user = mockUsers.find(u => u.email === values.email);

    if (user) {
      try {
        localStorage.setItem('accountDetails', JSON.stringify(user));
        toast({
          title: 'Sign In Successful!',
          description: 'Welcome back! Redirecting to your account...',
        });
        router.push('/account');
      } catch (error) {
        toast({
          title: 'Sign In Failed',
          description: 'Could not save session. Please enable cookies and try again.',
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Sign In Failed',
        description: 'Invalid email or password.',
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  return (
    <div className="container mx-auto py-12 px-4 md:px-6 max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Sign In</CardTitle>
          <CardDescription>
            Welcome back! Access your account dashboard.
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
            Don't have an account?{' '}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              Sign Up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
