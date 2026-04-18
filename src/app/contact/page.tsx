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
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.328-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.05-.148-.471-1.138-.646-1.557-.171-.406-.347-.35-.471-.35h-.402c-.138 0-.363.05-.552.27-.19.218-.724.708-.724 1.728s.742 2.006.845 2.141c.103.134 1.458 2.228 3.532 3.125.493.214.877.341 1.176.437.496.157.947.135 1.303.075.397-.066 1.21-.495 1.38-.97.169-.475.169-.88.118-.97-.05-.091-.183-.146-.48-.295zm-5.462 8.163c-1.92 0-3.805-.494-5.474-1.433l-3.929 1.028 1.047-3.83c-1.028-1.786-1.571-3.821-1.571-5.908 0-6.438 5.238-11.671 11.678-11.671 3.122 0 6.056 1.214 8.261 3.42 2.205 2.207 3.418 5.143 3.418 8.256 0 6.439-5.238 11.679-11.67 11.679z" />
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
        <div className="max-w-3xl mx-auto text-center mb-16">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Get in Touch</h1>
            <p className="mt-4 text-lg text-muted-foreground">
            We're here to help. Whether you have a question about our services, rates, or anything else, our team is ready to answer all your questions.
            </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            <div className="lg:col-span-3">
                <Card className="shadow-lg bg-card border-none">
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
            </div>

            <div className="lg:col-span-2 space-y-8">
                 <div className="p-8 rounded-lg bg-card shadow-lg border">
                    <h3 className="font-bold text-2xl mb-6">Contact Information</h3>
                    <div className="space-y-6 text-muted-foreground">
                         <div className="flex items-start gap-4">
                            <MapPin className="h-6 w-6 text-primary mt-1 shrink-0" />
                            <div>
                                <h4 className="font-semibold text-foreground">Our Location</h4>
                                <p>Portmore, St. Catherine</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <Phone className="h-6 w-6 text-primary mt-1 shrink-0" />
                            <div>
                                <h4 className="font-semibold text-foreground">Phone Numbers</h4>
                                <p>Digicel / WhatsApp: (876) 506-9727</p>
                                <p>Flow: (876) 771-3071</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <Mail className="h-6 w-6 text-primary mt-1 shrink-0" />
                             <div>
                                <h4 className="font-semibold text-foreground">Email Us</h4>
                                <p>fromstore2door@gmail.com</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <Clock className="h-6 w-6 text-primary mt-1 shrink-0" />
                             <div>
                                <h4 className="font-semibold text-foreground">Opening Hours</h4>
                                <p>Monday - Friday: 9AM - 5PM</p>
                                <p>Saturday: 9AM - 4PM</p>
                            </div>
                        </div>
                         <div className="pt-4">
                             <Button asChild className="w-full h-14 text-lg font-bold" size="lg" style={{ backgroundColor: '#25D366', color: 'white' }}>
                                <Link href="https://wa.me/18765069727" target="_blank">
                                    <WhatsAppIcon className="w-6 h-6 mr-3" />
                                    Chat with us on WhatsApp
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </div>
    </div>
  );
}
