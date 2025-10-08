
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { UserProfile, users } from '@/lib/mock-data';

const formSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
  phone: z.string().min(10, { message: 'Phone number must be at least 10 digits.' }),
  trn: z.string().min(9, { message: 'TRN must be 9 digits.' }).max(9, { message: 'TRN must be 9 digits.' }),
  idUpload: z.any().optional(), // Making ID upload optional for now
});

export default function SignUpPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (users.find(u => u.email === values.email)) {
        toast({
            title: 'Sign Up Failed',
            description: 'An account with this email already exists.',
            variant: 'destructive',
        });
        setLoading(false);
        return;
    }

    const nextMailboxNumber = `FSTD${100 + users.length + 1}`;

    const newUser: UserProfile = {
      id: `user-${Date.now()}`,
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
      trn: values.trn,
      mailboxNumber: nextMailboxNumber,
      address: {
        address1: '4350 NE 5th Terrace Bay #3',
        address2: `${nextMailboxNumber} -FSTD`,
        city: 'Oakland Park',
        state: 'Florida',
        zip: '33334',
      },
      createdAt: new Date().toISOString(),
    };
    
    users.push(newUser);

    try {
        localStorage.setItem('accountDetails', JSON.stringify(newUser));
        toast({
            title: 'Sign Up Successful!',
            description: 'Your account has been created. Redirecting...',
        });
        router.push('/account');
    } catch (error) {
        toast({
            title: 'Sign Up Failed',
            description: 'Could not save your session. Please enable cookies and try again.',
            variant: 'destructive',
        });
        setLoading(false);
    }
  };
  
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: any) => {
    if (e.target.files) {
        field.onChange(e.target.files);
    }
  }


  return (
    <div className="container mx-auto py-12 px-4 md:px-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Create Your Account</CardTitle>
          <CardDescription>
            Sign up to get your free, tax-free US shipping address and start shopping.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} />
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
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="(876) 555-1234" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="trn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>TRN (Taxpayer Registration Number)</FormLabel>
                    <FormControl>
                      <Input placeholder="123456789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="idUpload"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Upload ID</FormLabel>
                        <FormControl>
                           <Input 
                                type="file" 
                                accept="image/jpeg,image/png,application/pdf"
                                onChange={(e) => onFileChange(e, field)}
                            />
                        </FormControl>
                        <FormDescription>Please upload a clear copy of your government-issued ID (e.g., Driver's License, Passport).</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
                />
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Account...</> : 'Create Account & Get Address'}
              </Button>
            </form>
          </Form>
           <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/signin" className="font-semibold text-primary hover:underline">
                Sign In
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
