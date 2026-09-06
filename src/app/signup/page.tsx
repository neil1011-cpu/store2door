
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
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useSupabase } from '@/components/supabase-provider';

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
  const { supabase } = useSupabase();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      // 1. Create Supabase Auth User
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.fullName,
            phone: values.phone,
            trn: values.trn
          }
        }
      });

      if (authError) throw authError;

      // The 'on_auth_user_created' trigger in PostgreSQL handles:
      // - Profile creation
      // - Unique Mailbox generation (FSTD101...)
      // - Default 'customer' role assignment

      // Wait a moment for the DB trigger to finish
      await new Promise(r => setTimeout(r, 1000));

      // 2. Update TRN and Phone (if not picked up by metadata or for extra safety)
      if (authData.user) {
          await supabase.from('profiles').update({
              phone: values.phone,
              trn: values.trn
          }).eq('id', authData.user.id);
      }

      toast({
        title: 'Account Created',
        description: `Welcome to FromStore2Door! Your global mailbox is being prepared.`
      });

      router.push('/account');

    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Signup Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-12 px-4 md:px-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Create Your Account</CardTitle>
          <CardDescription>
            Get your global mailbox & shipping address instantly via Supabase Auth.
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
                <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type={showPassword ? "text" : "password"} {...field} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="trn" render={({ field }) => (
                <FormItem><FormLabel>TRN</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )}/>

              <Button type="submit" className="w-full h-12 font-bold uppercase italic" size="lg" disabled={loading}>
                {loading ? <><Loader2 className="animate-spin h-4 w-4 mr-2" /> Initializing...</> : "Create Account"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
