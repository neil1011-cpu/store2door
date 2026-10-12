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
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      {...props}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
    >
      <path d="M12.012 2c-5.508 0-9.988 4.48-9.988 9.988 0 1.76.46 3.46 1.332 4.964L2 22l6.216-1.628c1.456.792 3.096 1.208 4.796 1.208 5.508 0 9.988-4.48 9.988-9.988S17.52 2 12.012 2zm0 18.284c-1.584 0-3.132-.424-4.488-1.228l-.324-.188-3.336.872.888-3.244-.208-.332c-.88-1.4-1.344-3.028-1.344-4.7 0-4.464 3.632-8.096 8.096-8.096s8.096 3.632 8.096 8.096c0 4.464-3.632 8.096-8.096 8.096zm4.568-6.192c-.248-.124-1.472-.728-1.7-.8-.228-.08-.396-.124-.56.124-.164.248-.64.8-.784.968-.144.168-.288.192-.536.068-.248-.124-1.048-.388-1.996-1.232-.736-.656-1.232-1.468-1.376-1.716-.144-.248-.016-.384.108-.508.112-.112.248-.284.372-.424.124-.144.164-.248.248-.412.084-.168.044-.316-.02-.44-.064-.124-.56-1.348-.768-1.848-.204-.492-.428-.424-.584-.432h-.5c-.172 0-.452.064-.688.312-.236.248-1 .824-1 2.012s.864 2.324.984 2.492c.12.168 1.7 2.596 4.116 3.64.576.248 1.024.396 1.376.508.58.184 1.108.156 1.524.092.464-.072 1.472-.604 1.68-1.188.208-.584.208-1.084.144-1.188-.064-.108-.228-.172-.476-.296z" />
    </svg>
);

const formSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  subject: z.string().min(3, { message: 'Subject must be at least 3 characters.' }),
  message: z.string().min(10, { message: 'Message must be at least 10 characters.' }),
  consent: z.boolean().refine(val => val === true, { message: 'Required.' })
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
      consent: false,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
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
            <h1 className="text-4xl font-black italic uppercase tracking-tighter sm:text-6xl">Get in Touch</h1>
            <p className="mt-4 text-lg text-muted-foreground font-medium uppercase text-[10px] tracking-[0.2em]">
            Dedicated logistics lifeline for your worldwide shipping needs.
            </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            <div className="lg:col-span-3">
                <Card className="shadow-2xl border-none rounded-2xl overflow-hidden">
                    <CardHeader className="bg-primary text-primary-foreground">
                        <CardTitle className="text-xl font-black uppercase italic tracking-tight">Send Correspondence</CardTitle>
                        <CardDescription className="text-primary-foreground/60 text-[10px] font-bold uppercase">Our team typically responds within 2 business hours.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="fullName"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase opacity-60">Full Name</FormLabel>
                                        <FormControl><Input placeholder="John Doe" {...field} className="h-11 border-2" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase opacity-60">Email Address</FormLabel>
                                        <FormControl><Input type="email" placeholder="john@example.com" {...field} className="h-11 border-2" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="subject"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase opacity-60">Subject Header</FormLabel>
                                    <FormControl><Input placeholder="e.g., Question about JM-12345" {...field} className="h-11 border-2" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="message"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase opacity-60">Message Content</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="How can our logistics team assist you today?" className="min-h-[150px] border-2" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            
                            <FormField
                                control={form.control}
                                name="consent"
                                render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border-2 border-dashed p-4 bg-muted/20">
                                    <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        className="mt-1"
                                    />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                    <FormLabel className="text-[10px] font-bold uppercase tracking-wide">
                                        I consent to FromStore2Door contacting me regarding this inquiry.
                                    </FormLabel>
                                    </div>
                                </FormItem>
                                )}
                            />

                            <Button type="submit" size="lg" className="w-full h-14 font-black uppercase italic shadow-lg" disabled={loading}>
                                {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Dispatching...</> : <><Send className="mr-2 h-5 w-5" /> Authorize Dispatch</>}
                            </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>

            <div className="lg:col-span-2 space-y-8">
                 <div className="p-8 rounded-2xl bg-card shadow-xl border-2">
                    <h3 className="font-black text-2xl uppercase italic tracking-tighter mb-6 border-b pb-4">Headquarters</h3>
                    <div className="space-y-6 text-muted-foreground">
                         <div className="flex items-start gap-4">
                            <div className="bg-primary/10 p-2.5 rounded-xl"><MapPin className="h-5 w-5 text-primary shrink-0" /></div>
                            <div>
                                <h4 className="font-black text-[10px] uppercase tracking-widest text-foreground">Operational Location</h4>
                                <p className="text-sm font-bold uppercase italic mt-0.5">Portmore, St. Catherine, Jamaica</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="bg-primary/10 p-2.5 rounded-xl"><Phone className="h-5 w-5 text-primary shrink-0" /></div>
                            <div>
                                <h4 className="font-black text-[10px] uppercase tracking-widest text-foreground">Direct Lifeline</h4>
                                <p className="text-sm font-bold mt-0.5">(876) 506-9727 (Digicel)</p>
                                <p className="text-sm font-bold">(876) 771-3071 (Flow)</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="bg-primary/10 p-2.5 rounded-xl"><Mail className="h-5 w-5 text-primary shrink-0" /></div>
                             <div>
                                <h4 className="font-black text-[10px] uppercase tracking-widest text-foreground">Email Correspondence</h4>
                                <p className="text-sm font-bold mt-0.5">info@fromstore2door.com</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="bg-primary/10 p-2.5 rounded-xl"><Clock className="h-5 w-5 text-primary shrink-0" /></div>
                             <div>
                                <h4 className="font-black text-[10px] uppercase tracking-widest text-foreground">Availability Window</h4>
                                <p className="text-sm font-bold mt-0.5">Mon - Fri: 9AM - 5PM</p>
                                <p className="text-sm font-bold">Saturday: 9AM - 4PM</p>
                            </div>
                        </div>
                         <div className="pt-4">
                             <Button asChild className="w-full h-16 text-lg font-black uppercase italic shadow-2xl" size="lg" style={{ backgroundColor: '#25D366', color: 'white' }}>
                                <Link href="https://wa.me/18765069727" target="_blank">
                                    <WhatsAppIcon className="w-7 h-7 mr-3" />
                                    WhatsApp Command
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
