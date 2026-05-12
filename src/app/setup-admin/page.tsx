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
import { Loader2, ShieldCheck, AlertCircle, UserPlus, Fingerprint } from 'lucide-react';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, type User } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
});

export default function SetupAdminPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isElevatingSession, setIsElevatingSession] = useState(false);
  const auth = useAuth();
  const firestore = useFirestore();
  const { user: currentUser } = useUser();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: 'admin@neilussolutions.com',
      password: '',
    },
  });

  const setupAdminPrivileges = async (user: User) => {
    // 1. Admin Role Document (existence is key for isAdmin() check)
    const adminRoleRef = doc(firestore, 'admin_roles', user.uid);
    await setDoc(adminRoleRef, { 
        isAdmin: true, 
        email: user.email,
        uid: user.uid,
        updatedAt: serverTimestamp() 
    }, { merge: true });

    // 2. User Profile Document (Fixes "Critical profile data missing" error)
    const userDocRef = doc(firestore, 'users', user.uid);
    await setDoc(userDocRef, {
        id: user.uid,
        fullName: user.displayName || 'System Administrator',
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
        pickupPersonnel: [],
        dropoffAddresses: [],
    }, { merge: true });
    
    // 3. Initialize Metadata if missing
    const mailboxCounterRef = doc(firestore, 'metadata', 'mailboxCounter');
    await setDoc(mailboxCounterRef, { next: 101 }, { merge: true });
  }

  const handleElevateCurrentSession = async () => {
      if (!currentUser) {
          toast({ title: 'No Session Found', description: 'Please sign in first.', variant: 'destructive' });
          return;
      }
      setIsElevatingSession(true);
      try {
          await setupAdminPrivileges(currentUser);
          toast({ title: 'Privileges Granted!', description: 'Your administrator identity and profile have been synchronized.' });
          
          // Clear any caches and redirect
          setTimeout(() => {
            window.location.href = '/admin';
          }, 1500);
      } catch (error: any) {
          console.error("Elevation error:", error);
          toast({ title: 'Setup Failed', description: error.message, variant: 'destructive' });
      } finally {
          setIsElevatingSession(false);
      }
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
        
        await setupAdminPrivileges(user);

        toast({
            title: 'Account Configured',
            description: 'Database privileges and user profile have been successfully linked.',
        });
        
        setTimeout(() => {
            window.location.href = '/admin-login';
        }, 1500);

    } catch (error: any) {
        toast({
            title: 'Setup Error',
            description: error.message,
            variant: 'destructive',
        });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-12 px-4 md:px-6 max-w-lg">
      <Card className="shadow-xl overflow-hidden">
        <CardHeader className="text-center bg-primary/5 pb-8">
          <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="text-3xl mt-4">System Access Recovery</CardTitle>
          <CardDescription>
            Authorize administrative access and fix profile errors.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
           <Alert className="mb-6 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertTitle>Action Required</AlertTitle>
                <AlertDescription className="text-xs">
                    This tool will force-create your <strong>admin_roles</strong> entry and your <strong>users</strong> profile to fix login loops.
                </AlertDescription>
            </Alert>

          {currentUser ? (
              <div className="space-y-4 mb-8">
                  <div className="p-4 border rounded-lg bg-muted/30 flex items-center gap-4">
                      <Fingerprint className="h-8 w-8 text-primary" />
                      <div className="overflow-hidden">
                          <p className="text-xs font-bold uppercase text-muted-foreground">Authenticated As</p>
                          <p className="font-bold truncate">{currentUser.email}</p>
                      </div>
                  </div>
                  <Button onClick={handleElevateCurrentSession} disabled={isElevatingSession} className="w-full h-12 font-bold" variant="secondary">
                      {isElevatingSession ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                      Authorize Current Session
                  </Button>
                  <div className="relative py-4">
                    <Separator />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-[10px] uppercase font-bold text-muted-foreground">Or setup different credentials</span>
                  </div>
              </div>
          ) : null}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="admin@neilussolutions.com" {...field} />
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
                    <FormLabel>Secure Key</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" size="lg" className="w-full h-12 font-bold shadow-lg" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : 'Link Admin Credentials'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}