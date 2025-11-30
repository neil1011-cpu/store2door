
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
import { Loader2, Route } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { AdminWelcomeAnimation } from '@/components/admin-welcome-animation';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

export default function AdminLoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const auth = useAuth();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      const adminRoleRef = doc(firestore, 'roles_admin', user.uid);
      const adminDocSnap = await getDoc(adminRoleRef);
      
      if (adminDocSnap.exists()) {
        toast({
            title: 'Admin Sign In Successful!',
            description: 'Welcome back!',
        });
        setShowWelcome(true); // Trigger the animation
      } else {
        await signOut(auth);
        toast({
            title: 'Sign In Failed',
            description: 'You do not have admin privileges.',
            variant: 'destructive',
        });
      }
    } catch (error: any) {
        toast({
            title: 'Sign In Failed',
            description: error.message || 'Invalid email or password.',
            variant: 'destructive',
        });
    } finally {
        setLoading(false);
    }
  };

  if (showWelcome) {
    return <AdminWelcomeAnimation onComplete={() => router.push('/admin')} />;
  }

  return (
    <div className="w-full h-screen lg:grid lg:grid-cols-2">
       <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
         <Image 
            src="https://picsum.photos/seed/computer/1200/1800"
            alt="Admin panel background"
            fill
            className="object-cover brightness-50"
            data-ai-hint="computer technology"
        />
        <div className="relative z-20 flex items-center text-lg font-medium">
          <Route className="mr-2 h-6 w-6" />
          FromStore2Door Admin
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              &ldquo;Innovation distinguishes between a leader and a follower. This is where we lead.&rdquo;
            </p>
            <footer className="text-sm">Steve Jobs, Co-founder of Apple</footer>
          </blockquote>
        </div>
      </div>
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Admin Login</h1>
            <p className="text-balance text-muted-foreground">
              Enter your credentials to access the dashboard
            </p>
          </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
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
                        <div className="flex items-center">
                            <FormLabel>Password</FormLabel>
                             <Link
                                href="#"
                                className="ml-auto inline-block text-sm underline"
                            >
                                Forgot your password?
                            </Link>
                        </div>
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
            <div className="mt-4 text-center text-sm">
                <Link href="/" className="underline">
                    Back to main website
                </Link>
            </div>
        </div>
      </div>
    </div>
  );
}
