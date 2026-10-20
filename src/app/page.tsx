'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
    ArrowRight, 
    Search, 
    Package, 
    Truck, 
    Plane, 
    Ship, 
    ShieldCheck, 
    Zap, 
    Headset,
    CreditCard
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { AppLogo } from '@/components/app-logo';
import placeholderImages from '@/lib/placeholder-images.json';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * @fileOverview Redesigned Home Page.
 * Inspired by Rocketship JA with high-contrast visuals and integrated tracking.
 */
export default function HomePage() {
  const [trackingId, setTrackingNumber] = useState('');
  const router = useRouter();

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingId.trim()) {
        router.push(`/tracking?id=${trackingId.trim().toUpperCase()}`);
    }
  };

  const year = new Date().getFullYear();

  return (
    <div className="flex flex-col bg-background font-body overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative w-full min-h-[90vh] flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 z-0">
          <Image 
            src={placeholderImages.homeHero.src}
            alt="International Logistics"
            fill
            className="object-cover"
            priority
            data-ai-hint={placeholderImages.homeHero.hint}
          />
          <div className="absolute inset-0 bg-black/60 hero-gradient" />
        </div>
        
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-1000">
              <Badge variant="secondary" className="bg-accent text-accent-foreground px-6 py-2 rounded-full uppercase tracking-widest text-[10px] font-black italic shadow-lg shadow-accent/20">
                #1 Courier Service in Jamaica
              </Badge>
              
              <h1 className="text-5xl font-black tracking-tighter sm:text-7xl lg:text-8xl italic uppercase text-white leading-[0.9]">
                From Store <span className="text-accent">2 Your Door</span>
              </h1>
              
              <p className="text-lg md:text-2xl text-gray-200 max-w-2xl mx-auto font-bold leading-relaxed drop-shadow-md">
                Fast, reliable shipping from Florida to Jamaica. <br/>
                Shop the world, we handle the rest.
              </p>

              <div className="max-w-2xl mx-auto">
                <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-3 bg-white/10 backdrop-blur-xl p-3 rounded-[1.5rem] border border-white/20 shadow-2xl">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input 
                            placeholder="ENTER TRACKING NUMBER (e.g. JM123)" 
                            className="h-14 pl-12 bg-white/90 text-primary border-none rounded-xl text-lg font-black uppercase placeholder:text-gray-400 placeholder:font-bold"
                            value={trackingId}
                            onChange={(e) => setTrackingNumber(e.target.value)}
                        />
                    </div>
                    <Button type="submit" size="lg" className="h-14 px-10 text-lg font-black uppercase italic tracking-tight bg-accent text-accent-foreground hover:bg-accent/90 transition-all">
                      Track Now
                    </Button>
                </form>
              </div>

              <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="h-16 px-12 text-xl font-black uppercase italic tracking-tight shadow-2xl bg-white text-primary hover:bg-gray-100" asChild>
                  <Link href="/signup">Get Started FREE <ArrowRight className="ml-2 h-6 w-6" /></Link>
                </Button>
                <Button size="lg" variant="outline" className="h-16 px-12 text-xl font-black italic border-4 border-white text-white hover:bg-white/10" asChild>
                  <Link href="/rates">View Rates</Link>
                </Button>
              </div>
          </div>
        </div>
      </section>

      {/* Trust Stats */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center uppercase tracking-tighter italic">
                <div className="space-y-1"><p className="text-5xl font-black text-accent">0$</p><p className="text-[10px] opacity-60 font-black tracking-widest">Sign Up Fees</p></div>
                <div className="space-y-1"><p className="text-5xl font-black text-accent">48H</p><p className="text-[10px] opacity-60 font-black tracking-widest">Fast Delivery</p></div>
                <div className="space-y-1"><p className="text-5xl font-black text-accent">24/7</p><p className="text-[10px] opacity-60 font-black tracking-widest">Global Support</p></div>
                <div className="space-y-1"><p className="text-5xl font-black text-accent">JAM</p><p className="text-[10px] opacity-60 font-black tracking-widest">Locally Owned</p></div>
            </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-5xl font-black tracking-tighter uppercase italic text-primary">Worldwide Solutions</h2>
            <p className="text-muted-foreground max-w-lg mx-auto font-bold uppercase text-[10px] tracking-widest">Professional logistics tailored for Jamaica.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              { 
                icon: <Plane className="h-10 w-10" />, 
                title: "Air Freight", 
                desc: "Weekly shipments from Florida with speed and precision.",
                color: "bg-blue-600"
              },
              { 
                icon: <Ship className="h-10 w-10" />, 
                title: "Sea Freight", 
                desc: "Heavy loads? Barrels? Our sea freight solution is best.",
                color: "bg-cyan-600"
              },
              { 
                icon: <CreditCard className="h-10 w-10" />, 
                title: "Concierge", 
                desc: "Don't have a credit card? We shop for you instantly.",
                color: "bg-indigo-600"
              }
            ].map((item, i) => (
              <div key={i} className="group p-8 rounded-[2rem] bg-muted/30 border-b-8 border-primary hover:border-accent transition-all duration-300 transform hover:-translate-y-2">
                <div className={cn("h-20 w-20 rounded-[1.5rem] flex items-center justify-center text-white mb-6 shadow-xl", item.color)}>
                  {item.icon}
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight italic mb-4">{item.title}</h3>
                <p className="text-muted-foreground font-medium leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 bg-primary text-white overflow-hidden">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-12">
               <div className="space-y-4">
                  <h2 className="text-5xl font-black tracking-tighter uppercase italic">Shipping is <span className="text-accent">Easy</span></h2>
                  <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Get started in 60 seconds.</p>
               </div>
               
               <div className="space-y-10">
                  {[
                    { s: 1, t: "Create Account", d: "Instantly get your tax-free Florida address." },
                    { s: 2, t: "Shop Online", d: "Use your new address at any global checkout." },
                    { s: 3, t: "Pick Up", d: "Collect your items in Portmore or request delivery." }
                  ].map(step => (
                    <div key={step.s} className="flex gap-6 items-start group">
                      <div className="h-14 w-14 shrink-0 rounded-2xl bg-accent text-accent-foreground flex items-center justify-center text-2xl font-black italic shadow-lg transform group-hover:rotate-6 transition-transform">
                        {step.s}
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xl font-black uppercase italic">{step.t}</h4>
                        <p className="text-gray-400 font-medium">{step.d}</p>
                      </div>
                    </div>
                  ))}
               </div>

               <Button size="lg" className="h-16 px-12 bg-accent text-accent-foreground font-black uppercase italic shadow-2xl rounded-2xl hover:bg-accent/90" asChild>
                  <Link href="/signup">Open Free Account Now</Link>
               </Button>
            </div>

            <div className="relative h-[600px] rounded-[3rem] overflow-hidden border-8 border-white/5 shadow-2xl">
              <Image 
                src={placeholderImages.howItWorks.src}
                alt="Delivery Success"
                fill
                className="object-cover"
                data-ai-hint={placeholderImages.howItWorks.hint}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary via-transparent to-transparent" />
              <div className="absolute bottom-10 left-10 right-10 p-8 bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/20">
                <p className="text-2xl font-black italic uppercase text-accent mb-2">Real-Time Tracking</p>
                <p className="text-sm font-bold text-gray-200">Watch your package move across the globe in real-time with our dashboard.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 bg-background border-t">
         <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
              <div className="md:col-span-1 space-y-6">
                 <AppLogo className="scale-110" />
                 <p className="text-sm text-muted-foreground font-medium leading-relaxed">Your professional bridge between worldwide commerce and Jamaica's doorstep.</p>
                 <div className="flex gap-4">
                    <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-2"><Zap className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-2"><ShieldCheck className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-2"><Headset className="h-4 w-4" /></Button>
                 </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-black uppercase italic tracking-tighter">Company</h4>
                <nav className="flex flex-col gap-2 text-sm font-bold uppercase text-muted-foreground">
                  <Link href="/services" className="hover:text-primary transition-colors">Services</Link>
                  <Link href="/rates" className="hover:text-primary transition-colors">Pricing</Link>
                  <Link href="/contact" className="hover:text-primary transition-colors">Contact</Link>
                </nav>
              </div>

              <div className="space-y-4">
                <h4 className="font-black uppercase italic tracking-tighter">Support</h4>
                <nav className="flex flex-col gap-2 text-sm font-bold uppercase text-muted-foreground">
                  <Link href="/tracking" className="hover:text-primary transition-colors">Track Package</Link>
                  <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
                  <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
                </nav>
              </div>

              <div className="space-y-4">
                <h4 className="font-black uppercase italic tracking-tighter text-primary">Headquarters</h4>
                <div className="text-sm font-bold uppercase text-muted-foreground leading-relaxed">
                  Portmore, St. Catherine<br/>
                  Jamaica, W.I.<br/>
                  (876) 506-9727
                </div>
              </div>
            </div>
            
            <div className="pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-6">
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-40 text-center md:text-left">
                  &copy; {year} FromStore2Door Global Logistics. Portmore, Jamaica.
              </p>
              <div className="flex items-center gap-6 grayscale opacity-30">
                <Truck className="h-6 w-6" />
                <Ship className="h-6 w-6" />
                <Plane className="h-6 w-6" />
              </div>
            </div>
         </div>
      </footer>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}