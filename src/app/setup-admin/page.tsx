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
import { useState, useEffect } from 'react';
import { Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useAuth, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { createUserWithEmailAndPassword, type User } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, query, limit, writeBatch, getDocs } from 'firebase/firestore';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
});

export default function SetupAdminPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isSetupDone, setIsSetupDone] = useState<boolean | null>(null);
  const auth = useAuth();
  const firestore = useFirestore();

  const adminRolesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'admin_roles'), limit(1));
  }, [firestore]);
  const { data: adminRoles, isLoading: isLoadingAdmins } = useCollection(adminRolesQuery);

  useEffect(() => {
    if (!isLoadingAdmins) {
      setIsSetupDone(adminRoles !== null && adminRoles.length > 0);
    }
  }, [adminRoles, isLoadingAdmins]);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: 'admin@example.com',
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
    batch.set(userDocRef, userProfile);

    // 2. Admin Role Document - Standardized to admin_roles
    const adminRoleRef = doc(firestore, 'admin_roles', user.uid);
    batch.set(adminRoleRef, { isAdmin: true, createdAt: serverTimestamp() });
    
    // 3. Initialize Mailbox Counter
    const mailboxCounterRef = doc(firestore, 'metadata', 'mailboxCounter');
    batch.set(mailboxCounterRef, { next: 101 });

    await batch.commit();
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    
    const checkQuery = query(collection(firestore, 'admin_roles'), limit(1));
    const checkSnapshot = await getDocs(checkQuery);
    if (!checkSnapshot.empty) {
        toast({
            title: 'Setup Already Complete',
            description: 'An admin account has already been created.',
            variant: 'destructive',
        });
        setLoading(false);
        setIsSetupDone(true);
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        const user = userCredential.user;
        
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
            description: error.code === 'auth/email-already-in-use' 
                ? 'This email is already in use. Please use the admin login page if you have already set up an account.' 
                : error.message,
            variant: 'destructive',
        });
    }

    setLoading(false);
  };Loaders
  
  if (isSetupDone === null || isLoadingAdmins) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
  }

  if (isSetupDone) {
      return (
          <div className="container mx-auto py-12 px-4 md:px-6 max-w-lg">
             <Card>
                <CardHeader className="text-center">
                     <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
                    <CardTitle className="text-3xl mt-4">Setup Complete</CardTitle>
                    <CardDescription>
                        The initial admin account has already been created.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <Button className="w-full" onClick={() => router.push('/admin-login')}>
                        Go to Admin Login
                    </Button>
                </CardContent>
             </Card>
          </div>
      );
  }


  return (
    <div className="container mx-auto py-12 px-4 md:px-6 max-w-lg">
      <Card>
        <CardHeader className="text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="text-3xl mt-4">Admin Account Setup</CardTitle>
          <CardDescription>
            Create your primary administrator account. This is a one-time setup.
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
                      <Input type="password" placeholder="Choose a strong password (min. 8 characters)" {...field} />
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
        </CardContent>
      </Card>
    </div>
  );
}