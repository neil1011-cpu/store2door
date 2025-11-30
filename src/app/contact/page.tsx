
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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Loader2, Mail, Phone, MapPin, Send, Clock } from 'lucide-react';
import Link from 'next/link';

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M16.75 13.96c.25.13.43.2.5.28.07.08.15.18.2.3.04.13.06.2.06.25 0 .2-.1.4-.24.54-.14.15-.32.28-.53.4-.2.13-.44.2-.7.28-.27.08-.5.1-.7.1-.73 0-1.4-.15-2-.45-.6-.3-1.15-.7-1.63-1.2-.48-.5-.9-1.07-1.2-1.66-.3-.6-.48-1.2-.48-1.87 0-.55.13-1.04.4-1.45.28-.4.63-.74 1.04-1l.1.12c.1.13.18.25.27.38.08.13.15.25.2.36.1.2.15.38.18.5.03.14.02.28 0 .4-.02.13-.08.25-.2.4-.1.13-.23.28-.37.42-.1.1-.2.2-.3.3-.13.13-.2.22-.24.27-.04.05-.08.1-.08.13 0 .04.02.08.05.13.04.05.1.1.17.18.07.08.17.18.28.28.1.1.2.2.32.3.1.1.2.18.3.27.1.1.18.17.25.24.13.13.25.22.33.27.1.05.17.08.23.08.06,0,.14-.02.23-.08.1-.05.18-.1.25-.17.07-.07.13-.14.18-.2.05-.06.1-.12.1-.17 0-.05-.02-.1-.05-.16-.03-.06-.08-.13-.14-.2-.06-.08-.14-.15-.22-.22-.08-.07-.17-.13-.26-.2-.1-.06-.18-.1-.25-.1-.07 0-.13.02-.18.05-.05.03-.1.08-.13.13-.03.05-.05.1-.06.14 0 .04.02.1.06.15.04.05.1.1.18.17.08.07.18.13.28.18.1.05.2.1.3.13.1.03.2.05.3.06.1 0 .2-.02.3-.06.1-.04.2-.1.3-.18.1-.08.2-.17.28-.27.08-.1.15-.2.2-.3.04-.1.08-.2.1-.3zm-2.1-13.3C12.9.25 10.7 0 8.5 0 3.8 0 0 3.8 0 8.5c0 1.6.46 3.14 1.28 4.45L0 18l5.24-1.38c1.28.75 2.77 1.2 4.36 1.2h.01c4.7 0 8.5-3.8 8.5-8.5 0-2.2-.84-4.3-2.35-5.8z" />
    </svg>
);


const formSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  subject: z.string().min(3, { message: 'Subject must be at least 3 characters.' }),
  message: z.string().min(10, { message: 'Message must be at least 10 characters.' }),
});

export default function ContactPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      email: '',
      subject: '',
      message: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setLoading(false);
    toast({
      title: 'Message Sent!',
      description: 'Thank you for contacting us. We will get back to you shortly.',
    });
    form.reset();
  };

  return (
    <div className="bg-background">
        <div className="container mx-auto py-16 px-4 md:px-6">
        <div className="max-w-3xl mx-auto text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Get in Touch</h1>
            <p className="mt-4 text-lg text-muted-foreground">
            We're here to help. Whether you have a question about our services, rates, or anything else, our team is ready to answer all your questions.
            </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            <Card className="lg:col-span-3 shadow-lg bg-card">
                <CardHeader>
                    <CardTitle className="text-2xl">Send us a Message</CardTitle>
                    <CardDescription>Fill out the form and we'll respond as soon as possible.</CardDescription>
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
                            name="subject"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Subject</FormLabel>
                                <FormControl>
                                <Input placeholder="e.g., Question about my shipment" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="message"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Message</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Please type your message here..." className="min-h-[150px]" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <Button type="submit" size="lg" className="w-full" disabled={loading}>
                            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</> : <><Send className="mr-2 h-4 w-4" /> Send Message</>}
                        </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <div className="lg:col-span-2 space-y-8">
                <Card className="shadow-lg bg-card">
                    <CardHeader>
                        <CardTitle className="text-2xl">Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 text-muted-foreground">
                        <div className="pt-2">
                             <Button asChild className="w-full" size="lg" style={{ backgroundColor: '#25D366', color: 'white' }}>
                                <Link href="https://wa.me/18767713071" target="_blank">
                                    <WhatsAppIcon className="w-5 h-5 mr-2" />
                                    Chat on WhatsApp
                                </Link>
                            </Button>
                        </div>
                         <div className="flex items-start gap-4">
                            <MapPin className="h-6 w-6 text-primary mt-1 shrink-0" />
                            <div>
                                <h3 className="font-semibold text-foreground">Our Location</h3>
                                <p>Portmore, St. Catherine</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <Phone className="h-6 w-6 text-primary mt-1 shrink-0" />
                            <div>
                                <h3 className="font-semibold text-foreground">Phone Numbers</h3>
                                <p>Flow: (876) 771-3071</p>
                                <p>Digicel: (876) 506-9727</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <Mail className="h-6 w-6 text-primary mt-1 shrink-0" />
                             <div>
                                <h3 className="font-semibold text-foreground">Email Us</h3>
                                <p>fromstore2door@gmail.com</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <Clock className="h-6 w-6 text-primary mt-1 shrink-0" />
                             <div>
                                <h3 className="font-semibold text-foreground">Opening Hours</h3>
                                <p>Monday - Friday: 9AM - 5PM</p>
                                <p>Saturday: 9AM - 4PM</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
        </div>
    </div>
  );
}
