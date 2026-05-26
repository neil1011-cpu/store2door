
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
import { Loader2, ShieldCheck, Truck } from 'lucide-react';
import Link from 'next/link';
import { useAuth, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminWelcomeAnimation } from '@/components/admin-welcome-animation';
import Image from 'next/image';

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
      
      const adminSnap = await getDoc(doc(firestore, 'admin_roles', cred.user.uid));
      // Reverted domain fallback
      const isDomainAdmin = values.email === 'admin@neilussolutions.com';
      
      if (adminSnap.exists() || isDomainAdmin) {
        setShowWelcome(true);
      } else {
        await signOut(auth);
        toast({ 
            title: 'Access Denied', 
            description: 'This account does not have administrator privileges in the database.', 
            variant: 'destructive' 
        });
      }
    } catch (error: any) {
        toast({ 
            title: 'Login Failed', 
            description: 'Invalid credentials. Please verify your admin email and password.', 
            variant: 'destructive' 
        });
    } finally {
        setLoading(false);
    }
  };

  if (showWelcome) return <AdminWelcomeAnimation onComplete={() => router.push('/admin')} />;

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-zinc-950 p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20 grayscale pointer-events-none">
          <Image 
            src="https://picsum.photos/seed/delivery-van-dark/1920/1080" 
            alt="Delivery Network" 
            fill 
            className="object-cover"
            data-ai-hint="delivery van"
          />
      </div>

      <Card className="w-full max-w-[450px] shadow-2xl border-none relative z-10">
        <CardHeader className="text-center space-y-2 pb-8">
            <div className="mx-auto bg-primary/10 w-20 h-20 rounded-2xl flex items-center justify-center mb-4 transform rotate-3 shadow-inner">
                <ShieldCheck className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-3xl font-black tracking-tighter uppercase italic">FromStore2Door OS</CardTitle>
            <CardDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[10px]">
                Administrator Authentication Required
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Admin ID</FormLabel>
                    <FormControl>
                        <Input placeholder="admin@neilussolutions.com" {...field} className="h-12 border-2 focus:border-primary" />
                    </FormControl>
                    <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Secure Key</FormLabel>
                    <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} className="h-12 border-2 focus:border-primary" />
                    </FormControl>
                    <FormMessage />
                </FormItem>
              )}/>
              <Button type="submit" size="lg" className="w-full h-14 text-lg font-black shadow-xl mt-4" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin h-6 w-6 mr-2" /> : "Authorize Entry"}
              </Button>
            </form>
          </Form>
          <div className="pt-6 text-center border-t border-dashed">
              <Button variant="link" asChild className="text-muted-foreground text-xs hover:text-primary">
                  <Link href="/">Return to Worldwide Shipping Portal</Link>
              </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
