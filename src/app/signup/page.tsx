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
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';

const formSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Enter a valid email.' }),
  password: z.string().min(8, { message: 'Min 8 characters.' }),
  phone: z.string().min(10, { message: 'Phone must be at least 10 digits.' }),
  trn: z.string().length(9, { message: 'TRN must be 9 digits.' }),
  consent: z.boolean().refine(val => val === true, { message: 'You must agree to the terms.' })
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
      consent: false,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);

    try {
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

      if (authData.user) {
          const { error: profileError } = await supabase.from('profiles').upsert({
              id: authData.user.id,
              full_name: values.fullName,
              email: values.email,
              phone: values.phone,
              trn: values.trn
          });

          if (profileError) {
              console.warn('[SIGNUP] Profile sync warning:', profileError.message);
          }

          try {
              await fetch('/api/admin/logicware-sync', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ profileId: authData.user.id })
              });
          } catch (e) {}
      }

      toast({
        title: 'Account Created',
        description: `Welcome to FromStore2Door! Your global mailbox is being prepared.`
      });

      router.push('/account');

    } catch (error: any) {
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
          <CardTitle className="text-3xl font-black italic uppercase tracking-tighter">Create Your Account</CardTitle>
          <CardDescription className="font-medium text-xs uppercase tracking-widest">
            Get your global mailbox & shipping address instantly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="fullName" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-bold uppercase opacity-60">Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} className="h-11 border-2" /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-bold uppercase opacity-60">Email Address</FormLabel><FormControl><Input type="email" placeholder="john@example.com" {...field} className="h-11 border-2" /></FormControl><FormMessage /></FormItem>
                )}/>
              </div>
              
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase opacity-60">Security Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type={showPassword ? "text" : "password"} placeholder="Minimum 8 characters" {...field} className="h-11 border-2 pr-12" />
                        <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                </FormItem>
              )}/>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-bold uppercase opacity-60">Phone (Jamaica)</FormLabel><FormControl><Input type="tel" placeholder="876-..." {...field} className="h-11 border-2" /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="trn" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-bold uppercase opacity-60">Tax Registration Number (TRN)</FormLabel><FormControl><Input maxLength={9} placeholder="9 digits" {...field} className="h-11 border-2 font-mono" /></FormControl><FormMessage /></FormItem>
                )}/>
              </div>

              <FormField
                control={form.control}
                name="consent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-xl border-2 border-dashed p-4 bg-muted/20">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-1"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-wide">
                        I agree to the <Link href="/terms" className="text-primary underline">Terms of Service</Link> and <Link href="/privacy" className="text-primary underline">Privacy Policy</Link>.
                      </FormLabel>
                      <p className="text-[8px] text-muted-foreground uppercase font-medium">Necessary for customs clearance and courier services.</p>
                    </div>
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full h-14 text-lg font-black uppercase italic shadow-xl" size="lg" disabled={loading}>
                {loading ? <><Loader2 className="animate-spin h-5 w-5 mr-2" /> Creating Registry...</> : "Register Secure Account"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
