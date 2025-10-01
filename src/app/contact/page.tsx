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
import Image from 'next/image';
import placeholderImages from '@/lib/placeholder-images.json';

const formSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  subject: z.string().min(3, { message: 'Subject must be at least 3 characters.' }),
  message: z.string().min(10, { message: 'Message must be at least 10 characters.' }),
});

export default function ContactPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const mapImage = placeholderImages.contactMap;

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
    <div className="bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto py-16 px-4 md:px-6">
        <div className="max-w-3xl mx-auto text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Get in Touch</h1>
            <p className="mt-4 text-lg text-muted-foreground">
            We're here to help. Whether you have a question about our services, rates, or anything else, our team is ready to answer all your questions.
            </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            <Card className="lg:col-span-3 shadow-lg">
                <CardHeader>
                    <CardTitle>Send us a Message</CardTitle>
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
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle>Our Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-muted-foreground">
                         <div className="flex items-start gap-4">
                            <MapPin className="h-5 w-5 text-primary mt-1 shrink-0" />
                            <div>
                                <h3 className="font-semibold text-foreground">Our Location</h3>
                                <p>Portmore, St. Catherine</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <Phone className="h-5 w-5 text-primary mt-1 shrink-0" />
                            <div>
                                <h3 className="font-semibold text-foreground">Phone Numbers</h3>
                                <p>Flow: (876) 771-3071</p>
                                <p>Digicel: (876) 506-9727</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <Mail className="h-5 w-5 text-primary mt-1 shrink-0" />
                             <div>
                                <h3 className="font-semibold text-foreground">Email Us</h3>
                                <p>fromstore2door@gmail.com</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <Clock className="h-5 w-5 text-primary mt-1 shrink-0" />
                             <div>
                                <h3 className="font-semibold text-foreground">Opening Hours</h3>
                                <p>Monday - Friday: 9AM - 5PM</p>
                                <p>Saturday: 9AM - 4PM</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <div className="relative h-60 w-full overflow-hidden rounded-lg shadow-lg">
                    <Image 
                        src={mapImage.src}
                        alt={mapImage.alt}
                        fill
                        className="object-cover"
                        data-ai-hint={mapImage.hint}
                    />
                </div>
            </div>
        </div>
        </div>
    </div>
  );
}
