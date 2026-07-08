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
import { Loader2 } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, runTransaction, serverTimestamp } from 'firebase/firestore';

const formSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Enter a valid email.' }),
  password: z.string().min(8, { message: 'Min 8 characters.' }),
  phone: z.string().min(10, { message: 'Phone must be at least 10 digits.' }),
  trn: z.string().length(9, { message: 'TRN must be 9 digits.' }),
});

export default function SignUpPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      phone: '',
      trn: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);

    try {
      const userCred = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCred.user;

      await user.getIdToken(true);

      const mailbox = await runTransaction(firestore, async (tx) => {
        const ref = doc(firestore, "metadata", "mailboxCounter");
        const snap = await tx.get(ref);

        if (!snap.exists()) {
            tx.set(ref, { next: 102 });
            return `FSTD101`;
        }

        const current = snap.data().next;
        tx.update(ref, { next: current + 1 });

        return `FSTD${current}`;
      });

      const userAddress = {
          address1: '3507 NW 19th ST',
          address2: `${mailbox}-FSTD`,
          city: 'Lauderdale Lake',
          state: 'Florida',
          zip: '33311-4224',
      };
      
      await setDoc(doc(firestore, 'users', user.uid), {
        id: user.uid,
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        trn: values.trn,
        mailboxNumber: mailbox,
        address: userAddress,
        createdAt: serverTimestamp(),
        pickupPersonnel: [],
        dropoffAddresses: [],
      });

      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: values.email,
            subject: 'Welcome to the FromStore2Door Family!',
            body: `Hi ${values.fullName},\n\nWelcome to FromStore2Door! We're thrilled to have you with us.\n\nYour new, tax-free worldwide shipping credentials are ready.\n\nYour personal mailbox number is: ${mailbox}\n\nHere is your network shipping address for global store checkouts:\n\n${values.fullName}\n${userAddress.address1}\n${userAddress.address2}\n${userAddress.city}, ${userAddress.state} ${userAddress.zip}\n\nYou can start shopping at your favorite stores worldwide right away. Just use this address at checkout, and we'll handle the rest.\n\nHappy Shopping!`,
            recipientName: values.fullName,
          }),
        });
      } catch (emailError) {}

      toast({
        title: 'Account Created',
        description: `Your mailbox: ${mailbox}`
      });

      router.push('/account');

    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Signup Failed',
        description: error.message,
        variant: 'destructive'
      });
    }

    setLoading(false);
  };

  return (
    <div className="container mx-auto py-12 px-4 md:px-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Create Your Account</CardTitle>
          <CardDescription>
            Get your global mailbox & shipping address instantly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="fullName" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="trn" render={({ field }) => (
                <FormItem><FormLabel>TRN</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )}/>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? <><Loader2 className="animate-spin h-4 w-4 mr-2" /> Creating...</> : "Create Account"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
