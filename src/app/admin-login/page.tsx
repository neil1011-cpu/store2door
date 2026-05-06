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
import { Loader2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useAuth, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, values.email, values.password);
      // Ensure we check the standardized 'admin_roles' collection
      const adminSnap = await getDoc(doc(firestore, 'admin_roles', cred.user.uid));
      
      if (adminSnap.exists()) {
        setShowWelcome(true);
      } else {
        await signOut(auth);
        toast({ 
            title: 'Access Denied', 
            description: 'This account does not have administrator privileges.', 
            variant: 'destructive' 
        });
      }
    } catch (error: any) {
        toast({ 
            title: 'Login Failed', 
            description: 'Invalid email or secure key.', 
            variant: 'destructive' 
        });
    } finally {
        setLoading(false);
    }
  };

  if (showWelcome) return <AdminWelcomeAnimation onComplete={() => router.push('/admin')} />;

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-[450px] shadow-2xl border-none">
        <CardHeader className="text-center space-y-2">
            <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-2">
                <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-black tracking-tight uppercase">Admin Entry</CardTitle>
            <CardDescription className="font-medium">
                Verify your credentials to manage the FromStore2Door network.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                    <FormLabel>Admin Email</FormLabel>
                    <FormControl>
                        <Input placeholder="admin@example.com" {...field} className="h-12" />
                    </FormControl>
                    <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                    <FormLabel>Secure Key</FormLabel>
                    <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} className="h-12" />
                    </FormControl>
                    <FormMessage />
                </FormItem>
              )}/>
              <Button type="submit" size="lg" className="w-full h-14 text-lg font-bold shadow-lg mt-2" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : "Authorize Access"}
              </Button>
            </form>
          </Form>
          <div className="pt-4 text-center border-t">
              <Button variant="link" asChild className="text-muted-foreground">
                  <Link href="/">Return to Public Website</Link>
              </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}