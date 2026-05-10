import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, ShieldCheck, ArrowRight, Truck, Quote, Globe, Box, MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { AppLogo } from '@/components/app-logo';

const features = [
  {
    icon: <Globe className="h-8 w-8 text-primary" />,
    title: 'Global Delivery Reach',
    description: 'We deliver your packages from anywhere in the world directly to your doorstep in Jamaica with unmatched efficiency.',
  },
  {
    icon: <ShieldCheck className="h-8 w-8 text-primary" />,
    title: 'Safe & Secure Transit',
    description: 'Your packages are handled with professional care, ensuring they arrive in the same condition we received them, regardless of distance.',
  },
  {
    icon: <Box className="h-8 w-8 text-primary" />,
    title: 'Complete Brokerage',
    description: 'We handle all global logistical aspects, including complex customs brokerage and clearance for seamless entry into Jamaica.',
  },
];

const testimonials = [
    {
        name: "David Chen",
        role: "Small Business Owner",
        review: "FromStore2Door has been a game-changer. Their worldwide reach and transparent JMD pricing have saved my import business thousands."
    },
    {
        name: "Maria Garcia",
        role: "Global Shopper",
        review: "I shop from Europe and Asia regularly. This service makes getting those packages to Jamaica completely stress-free!"
    },
     {
        name: "James Smith",
        role: "Personal Importer",
        review: "The new tracking and landed cost calculator make this the most professional courier service I've ever used."
    }
]

export default function HomePage() {
  return (
    <div className="flex flex-col bg-background font-body">
      {/* Hero Section with Professional Cargo Logistics Imagery */}
      <section className="relative w-full py-24 md:py-40 lg:py-56 overflow-hidden">
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-0">
          <Image 
            src="https://picsum.photos/seed/worldwide-logistics-port/1920/1080"
            alt="Global Shipping Cargo Terminal"
            fill
            className="object-cover grayscale-[20%]"
            priority
            data-ai-hint="cargo ship"
          />
          <div className="absolute inset-0 bg-primary/20 mix-blend-multiply" />
        </div>
        <div className="container mx-auto px-4 md:px-6 relative z-20">
          <div className="max-w-4xl mx-auto text-center text-white space-y-8">
              <Badge variant="outline" className="bg-white/10 text-white border-white/20 px-4 py-1 backdrop-blur-sm uppercase tracking-widest text-xs font-bold">
                Worldwide Shipping to Jamaica
              </Badge>
              <h1 className="text-5xl font-black tracking-tighter sm:text-7xl lg:text-8xl italic uppercase">
                Ship From <span className="text-white drop-shadow-lg">Anywhere</span>
              </h1>
              <p className="text-xl text-gray-100 max-w-2xl mx-auto font-medium leading-relaxed drop-shadow-md">
                Connecting the world to your doorstep. We provide a premium, reliable, and affordable shipping experience for every global import need.
              </p>
              <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="h-16 px-10 text-lg font-black uppercase tracking-tight shadow-2xl" asChild>
                  <Link href="/signup">Open FREE Account <ArrowRight className="ml-2 h-6 w-6" /></Link>
                </Button>
                <Button size="lg" variant="secondary" className="h-16 px-10 text-lg font-black backdrop-blur-md bg-white/90" asChild>
                  <Link href="/tracking">Track Worldwide</Link>
                </Button>
              </div>
          </div>
        </div>
      </section>

      {/* Global Reach Stats */}
      <section className="py-12 bg-primary text-primary-foreground border-y border-white/10">
        <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center uppercase tracking-tighter">
                <div><p className="text-4xl font-black">100%</p><p className="text-[10px] opacity-60 font-bold">Safe Arrival</p></div>
                <div><p className="text-4xl font-black">24/7</p><p className="text-[10px] opacity-60 font-bold">Global Tracking</p></div>
                <div><p className="text-4xl font-black">0</p><p className="text-[10px] opacity-60 font-bold">Signup Fees</p></div>
                <div><p className="text-4xl font-black">JAM</p><p className="text-[10px] opacity-60 font-bold">Local Support</p></div>
            </div>
        </div>
      </section>

      {/* 3 Step Process */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-4xl font-black tracking-tighter uppercase italic">Worldwide Delivery Made Simple</h2>
            <div className="h-1.5 w-24 bg-primary mx-auto rounded-full" />
            <p className="text-muted-foreground max-w-lg mx-auto">Get your international packages to Jamaica in three professional steps.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 text-center max-w-6xl mx-auto">
              {[
                { s: 1, t: "Register Account", d: "Instantly receive your professional global shipping credentials." },
                { s: 2, t: "Shop Anywhere", d: "Shop at any online store worldwide and use our network address at checkout." },
                { s: 3, t: "Local Delivery", d: "We consolidate and deliver safely to your doorstep across Jamaica." }
              ].map(step => (
                <div key={step.s} className="space-y-6 group">
                    <div className="h-24 w-24 bg-background border-4 border-primary text-primary rounded-3xl flex items-center justify-center text-4xl font-black mx-auto shadow-xl group-hover:bg-primary group-hover:text-white transition-all duration-300 transform group-hover:rotate-6">
                        {step.s}
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-tight italic">{step.t}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed px-4">{step.d}</p>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 border-t">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-3 gap-12">
            {features.map((f) => (
              <Card key={f.title} className="text-center border-none shadow-none bg-transparent hover:translate-y-[-4px] transition-transform">
                <CardHeader className="items-center">
                  <div className="bg-primary/5 p-6 rounded-3xl mb-4 border border-primary/10">{f.icon}</div>
                  <CardTitle className="text-2xl font-black uppercase tracking-tight italic">{f.title}</CardTitle>
                </CardHeader>
                <CardContent><p className="text-muted-foreground leading-relaxed text-sm">{f.description}</p></CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

       {/* Testimonials */}
       <section className="py-24 bg-zinc-950 text-white">
        <div className="container mx-auto px-4 md:px-6 text-center space-y-16">
          <h2 className="text-4xl font-black tracking-tighter uppercase italic">Client Experiences</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {testimonials.map((t) => (
                <Card key={t.name} className="bg-white/5 border-white/10 text-white text-left h-full backdrop-blur-sm">
                    <CardContent className="pt-10">
                        <Quote className="h-10 w-10 text-primary opacity-50 mb-6" />
                        <p className="text-lg italic mb-8 font-medium">"{t.review}"</p>
                        <div className="flex items-center gap-4">
                             <div className="h-1 w-8 bg-primary rounded-full" />
                             <div>
                                <p className="font-black uppercase tracking-tighter italic">{t.name}</p>
                                <p className="text-[10px] opacity-60 uppercase font-bold tracking-widest">{t.role}</p>
                             </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="py-16 bg-background border-t">
         <div className="container mx-auto px-4 md:px-6 flex flex-col items-center text-center gap-8">
            <AppLogo className="scale-125 mb-4" />
            <div className="flex flex-wrap justify-center gap-8 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
                <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
                <Link href="/contact" className="hover:text-primary transition-colors">Contact</Link>
                <Link href="/tracking" className="hover:text-primary transition-colors">Global Tracking</Link>
            </div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-8">
                &copy; {new Date().getFullYear()} FromStore2Door Global Logistics. Portmore, Jamaica.
            </p>
         </div>
      </footer>
    </div>
  );
}
