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
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, type User } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
});

export default function SetupAdminPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: 'admin@neilussolutions.com',
      password: '',
    },
  });

  const setupAdminAndMetadataDocs = async (user: User) => {
    const batch = writeBatch(firestore);

    // 1. User Profile Document
    const userDocRef = doc(firestore, 'users', user.uid);
    const userProfile = {
        id: user.uid,
        fullName: 'Administrator',
        email: user.email,
        phone: 'N/A',
        trn: 'N/A',
        mailboxNumber: `FSTD-ADMIN`,
        address: {
            address1: '4350 NE 5th Terrace Bay #3',
            address2: `FSTD-ADMIN`,
            city: 'Oakland Park',
            state: 'Florida',
            zip: '33334',
        },
        createdAt: serverTimestamp(),
    };
    batch.set(userDocRef, userProfile, { merge: true });

    // 2. Admin Role Document
    const adminRoleRef = doc(firestore, 'admin_roles', user.uid);
    batch.set(adminRoleRef, { isAdmin: true, updatedAt: serverTimestamp() }, { merge: true });
    
    // 3. Initialize Mailbox Counter
    const mailboxCounterRef = doc(firestore, 'metadata', 'mailboxCounter');
    batch.set(mailboxCounterRef, { next: 101 }, { merge: true });

    await batch.commit();
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    
    try {
        let user: User;
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
            user = userCredential.user;
        } catch (authError: any) {
            if (authError.code === 'auth/email-already-in-use') {
                const signInCred = await signInWithEmailAndPassword(auth, values.email, values.password);
                user = signInCred.user;
            } else {
                throw authError;
            }
        }
        
        await setupAdminAndMetadataDocs(user);

        toast({
            title: 'Admin Account Configured!',
            description: 'You can now log in at the admin login page.',
        });
        router.push('/admin-login');

    } catch (error: any) {
        console.error("Admin setup error:", error);
        toast({
            title: 'Setup Failed',
            description: error.message,
            variant: 'destructive',
        });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-12 px-4 md:px-6 max-w-lg">
      <Card>
        <CardHeader className="text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="text-3xl mt-4">Admin Account Setup</CardTitle>
          <CardDescription>
            Create or recover your primary administrator account.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <Alert className="mb-6 bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Recovery Mode</AlertTitle>
                <AlertDescription className="text-amber-700 text-xs">
                    This tool will assign administrator privileges to the email provided. Use it if you are locked out of your admin dashboard.
                </AlertDescription>
            </Alert>
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
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Configuring Account...</> : 'Apply Admin Privileges'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}