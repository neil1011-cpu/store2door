
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
import { doc, serverTimestamp, writeBatch, getDoc } from 'firebase/firestore';
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
    const batch = writeBatch(firestore);

    // 1. User Profile Document
    const userDocRef = doc(firestore, 'users', user.uid);
    batch.set(userDocRef, {
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
    }, { merge: true });

    // 2. Admin Role Document
    const adminRoleRef = doc(firestore, 'admin_roles', user.uid);
    batch.set(adminRoleRef, { isAdmin: true, updatedAt: serverTimestamp() }, { merge: true });
    
    // 3. Initialize Mailbox Counter if missing
    const mailboxCounterRef = doc(firestore, 'metadata', 'mailboxCounter');
    const counterSnap = await getDoc(mailboxCounterRef);
    if (!counterSnap.exists()) {
        batch.set(mailboxCounterRef, { next: 101 }, { merge: true });
    }

    await batch.commit();
  }

  const handleElevateCurrentSession = async () => {
      if (!currentUser) return;
      setIsElevatingSession(true);
      try {
          await setupAdminPrivileges(currentUser);
          toast({ title: 'Privileges Restored!', description: 'Your current session has been granted administrator access.' });
          router.push('/admin');
      } catch (error: any) {
          toast({ title: 'Elevation Failed', description: error.message, variant: 'destructive' });
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
            title: 'Privileges Restored!',
            description: 'Your account has been granted administrator access.',
        });
        router.push('/admin-login');

    } catch (error: any) {
        console.error("Admin setup error:", error);
        let errorMessage = error.message;
        if (error.code === 'auth/invalid-credential') {
            errorMessage = "Incorrect password for the existing account. Please sign in normally first, then use the session elevation tool below.";
        }
        toast({
            title: 'Setup Failed',
            description: errorMessage,
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
          <CardTitle className="text-3xl mt-4">Admin Recovery Tool</CardTitle>
          <CardDescription>
            Re-assign administrator privileges to your primary account.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
           <Alert className="mb-6 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertTitle>Privilege Linker</AlertTitle>
                <AlertDescription className="text-xs">
                    This tool will verify your credentials and link your account to the <strong>admin_roles</strong> database collection.
                </AlertDescription>
            </Alert>

          {currentUser ? (
              <div className="space-y-4 mb-8">
                  <div className="p-4 border rounded-lg bg-muted/30 flex items-center gap-4">
                      <Fingerprint className="h-8 w-8 text-primary" />
                      <div>
                          <p className="text-xs font-bold uppercase text-muted-foreground">Active Session Detected</p>
                          <p className="font-bold">{currentUser.email}</p>
                      </div>
                  </div>
                  <Button onClick={handleElevateCurrentSession} disabled={isElevatingSession} className="w-full h-12 font-bold" variant="secondary">
                      {isElevatingSession ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                      Link Current Session to Admin Roles
                  </Button>
                  <div className="relative py-4">
                    <Separator />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-[10px] uppercase font-bold text-muted-foreground">Or setup different account</span>
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Authorizing...</> : 'Apply Admin Privileges'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
