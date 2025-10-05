
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
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
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const formSchema = z.object({
  email: z.string().email().refine(val => val === 'admin@example.com', {
    message: "Email must be 'admin@example.com' to create an admin account."
  }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
});

export default function CreateAdminPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: 'admin@example.com',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    
    if (!auth || !firestore) {
        toast({ title: 'Firebase not initialized', description: 'Please wait a moment and try again.', variant: 'destructive'});
        setLoading(false);
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        const user = userCredential.user;

        const adminUserDoc = {
            id: user.uid,
            fullName: 'Admin User',
            email: values.email,
            phone: 'N/A',
            trn: 'N/A',
            mailboxNumber: 'ADMIN-001',
            address: {
                address1: 'N/A',
                address2: 'N/A',
                city: 'N/A',
                state: 'N/A',
                zip: 'N/A',
            },
            createdAt: serverTimestamp(),
            isAdmin: true, // Custom flag to identify admin
        };

        const userDocRef = doc(firestore, 'users', user.uid);
        await setDoc(userDocRef, adminUserDoc);

        toast({
            title: 'Admin Account Created!',
            description: 'You can now log in to the admin dashboard.',
        });
        
        router.push('/admin-login');

    } catch(error) {
         toast({
            title: 'Admin Creation Failed',
            description: (error as Error).message.includes('email-already-in-use') 
                ? 'An admin account already exists. You can proceed to the admin login.'
                : (error as Error).message,
            variant: 'destructive',
        });
    } finally {
        setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto py-12 px-4 md:px-6 max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Create Admin Account</CardTitle>
          <CardDescription>
            Use this form to set up the administrative account for the dashboard.
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
                    <FormLabel>Admin Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="admin@example.com" {...field} />
                    </FormControl>
                     <FormDescription>This email is fixed to 'admin@example.com'.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Choose Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Choose a strong password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Admin...</> : 'Create Admin Account'}
              </Button>
            </form>
          </Form>
           <p className="mt-6 text-center text-sm text-muted-foreground">
            Already created the admin account?{' '}
            <Link href="/admin-login" className="font-semibold text-primary hover:underline">
                Go to Admin Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
