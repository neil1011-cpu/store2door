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
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, values.email, values.password);
      // Standardized to admin_roles
      const adminSnap = await getDoc(doc(firestore, 'admin_roles', cred.user.uid));
      
      if (adminSnap.exists()) {
        setShowWelcome(true);
      } else {
        await signOut(auth);
        toast({ title: 'Access Denied', description: 'No admin privileges detected.', variant: 'destructive' });
      }
    } catch (error: any) {
        toast({ title: 'Login Failed', description: 'Invalid credentials.', variant: 'destructive' });
    } finally {
        setLoading(false);
    }
  };

  if (showWelcome) return <AdminWelcomeAnimation onComplete={() => router.push('/admin')} />;

  return (
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2 bg-background font-body">
       <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex">
         <Image 
            src="https://picsum.photos/seed/delivery-van-dark/1200/1800"
            alt="Admin panel"
            fill
            className="object-cover brightness-50"
            data-ai-hint="delivery van"
        />
        <div className="relative z-20 flex items-center text-2xl font-bold italic tracking-tighter font-headline">
          SwiftRoute OS v3.0
        </div>
        <div className="relative z-20 mt-auto bg-black/20 backdrop-blur-md p-6 rounded-xl border border-white/10">
          <ShieldCheck className="h-8 w-8 mb-4 text-primary" />
          <p className="text-lg font-medium leading-relaxed italic">
            "Reliability is the foundation of every successful logistical network. Access restricted to authorized personnel only."
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center p-8">
        <div className="mx-auto w-full max-w-[400px] space-y-8">
          <div className="space-y-2 text-center">
            <h1 className="text-4xl font-black tracking-tight uppercase font-headline">Admin Entry</h1>
            <p className="text-muted-foreground text-sm font-medium">Verify your credentials to manage the network.</p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Admin Email</FormLabel><FormControl><Input placeholder="admin@swiftroute.com" {...field} className="h-12 border-2" /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem><FormLabel>Secure Key</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} className="h-12 border-2" /></FormControl><FormMessage /></FormItem>
              )}/>
              <Button type="submit" size="lg" className="w-full h-14 text-lg font-bold shadow-xl" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : "Authorize Access"}
              </Button>
            </form>
          </Form>
          <div className="pt-4 text-center border-t">
              <Button variant="link" asChild className="text-muted-foreground"><Link href="/">Return to Public Website</Link></Button>
          </div>
        </div>
      </div>
    </div>
  );
}