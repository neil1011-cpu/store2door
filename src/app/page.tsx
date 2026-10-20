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
    CreditCard,
    Facebook,
    Instagram,
    Twitter
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { AppLogo } from '@/components/app-logo';
import placeholderImages from '@/lib/placeholder-images.json';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
    <div className="flex flex-col bg-background font-body overflow-x-hidden text-white">
      {/* Immersive Hero Section */}
      <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden pt-20">
        <div className="absolute inset-0 z-0">
          <Image 
            src={placeholderImages.homeHero.src}
            alt="Logistics Background"
            fill
            className="object-cover opacity-30"
            priority
            data-ai-hint="dark logistics"
          />
          <div className="absolute inset-0 hero-overlay" />
        </div>
        
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="max-w-5xl mx-auto text-center space-y-10 animate-in fade-in slide-in-from-bottom-10 duration-1000">
              <p className="text-pink-500 font-black uppercase tracking-[0.4em] text-[10px] sm:text-xs italic">
                FromStore2Door Courier
              </p>
              
              <h1 className="text-5xl font-black tracking-tight sm:text-7xl lg:text-8xl italic uppercase leading-[0.9]">
                Ship with Confidence, <br/>
                <span className="text-accent">5x a week!</span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed">
                The easiest way to import personal items from the US. <br className="hidden sm:block" />
                Sign up today for a free US-based shipping address.
              </p>

              <div className="flex justify-center">
                <Button size="lg" className="h-16 px-12 text-lg font-black uppercase italic tracking-tight rocket-gradient border-none rounded-full shadow-2xl shadow-pink-500/20" asChild>
                  <Link href="/signup">Sign Up for FREE! <ArrowRight className="ml-2 h-6 w-6" /></Link>
                </Button>
              </div>

              {/* Live Tracking Card Mockup Style */}
              <div className="max-w-3xl mx-auto mt-20 p-1 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-sm shadow-2xl">
                 <div className="bg-[#0a0a0c] rounded-[1.8rem] overflow-hidden">
                    <div className="p-4 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Live Tracking</span>
                        </div>
                        <Badge variant="outline" className="text-[8px] font-black uppercase border-white/10">T-2</Badge>
                    </div>
                    <form onSubmit={handleTrack} className="p-8 space-y-6">
                        <div className="relative group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground group-focus-within:text-accent transition-colors" />
                            <Input 
                                placeholder="RS-4821-0917-JM" 
                                className="h-20 pl-16 bg-white/5 border-2 border-white/10 focus:border-accent text-2xl font-black uppercase rounded-2xl tracking-tighter"
                                value={trackingId}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                            />
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest opacity-40 italic">
                            <span>US Warehouse</span>
                            <span className="text-accent opacity-100">Intake Processed</span>
                            <span>Portmore, JA</span>
                        </div>
                    </form>
                 </div>
              </div>
          </div>
        </div>
      </section>

      {/* Trust & Network Stats */}
      <section className="py-20 bg-[#060608] border-y border-white/5">
        <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center uppercase tracking-tighter italic">
                <div className="space-y-1">
                    <p className="text-5xl font-black text-white">0<span className="text-accent">$</span></p>
                    <p className="text-[10px] text-muted-foreground font-black tracking-widest">Sign Up Fees</p>
                </div>
                <div className="space-y-1">
                    <p className="text-5xl font-black text-white">48<span className="text-pink-500">H</span></p>
                    <p className="text-[10px] text-muted-foreground font-black tracking-widest">Fast Delivery</p>
                </div>
                <div className="space-y-1">
                    <p className="text-5xl font-black text-white">24<span className="text-accent">/7</span></p>
                    <p className="text-[10px] text-muted-foreground font-black tracking-widest">Global Support</p>
                </div>
                <div className="space-y-1">
                    <p className="text-5xl font-black text-white">JAM</p>
                    <p className="text-[10px] text-muted-foreground font-black tracking-widest">Locally Owned</p>
                </div>
            </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-32">
        <div className="container mx-auto px-4 md:px-6 text-center mb-20 space-y-4">
            <h2 className="text-5xl font-black tracking-tight uppercase italic">Worldwide Solutions</h2>
            <p className="text-muted-foreground max-w-lg mx-auto font-bold uppercase text-[10px] tracking-[0.3em]">Professional logistics tailored for Jamaica.</p>
        </div>
        
        <div className="container mx-auto px-4 md:px-6 grid grid-cols-1 md:grid-cols-3 gap-10 max-w-6xl">
            {[
              { 
                icon: <Plane className="h-10 w-10" />, 
                title: "Air Freight", 
                desc: "Weekly shipments from Florida with speed and precision.",
                border: "border-blue-500/20"
              },
              { 
                icon: <Ship className="h-10 w-10" />, 
                title: "Sea Freight", 
                desc: "Heavy loads? Barrels? Our sea freight solution is best.",
                border: "border-pink-500/20"
              },
              { 
                icon: <CreditCard className="h-10 w-10" />, 
                title: "Concierge", 
                desc: "Don't have a credit card? We shop for you instantly.",
                border: "border-accent/20"
              }
            ].map((item, i) => (
              <div key={i} className={`group p-10 rounded-[3rem] bg-[#0c0c10] border-2 ${item.border} hover:border-accent transition-all duration-500`}>
                <div className="h-20 w-20 rounded-[1.5rem] bg-white/5 flex items-center justify-center text-white mb-8 group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight italic mb-4">{item.title}</h3>
                <p className="text-muted-foreground font-medium leading-relaxed">{item.desc}</p>
              </div>
            ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-24 bg-[#040406] border-t border-white/5">
         <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-20">
              <div className="space-y-8">
                 <AppLogo className="scale-110 grayscale brightness-200" />
                 <p className="text-sm text-muted-foreground font-medium leading-relaxed">Your professional bridge between worldwide commerce and Jamaica's doorstep.</p>
                 <div className="flex gap-4">
                    <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-white/10"><Twitter className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-white/10"><Facebook className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-white/10"><Instagram className="h-4 w-4" /></Button>
                 </div>
              </div>
              
              <div className="space-y-6">
                <h4 className="font-black uppercase italic tracking-widest text-xs text-white/40">Navigation</h4>
                <nav className="flex flex-col gap-3 text-sm font-bold uppercase tracking-tighter">
                  <Link href="/services" className="hover:text-accent transition-colors">Services</Link>
                  <Link href="/rates" className="hover:text-accent transition-colors">Pricing</Link>
                  <Link href="/contact" className="hover:text-accent transition-colors">Contact</Link>
                </nav>
              </div>

              <div className="space-y-6">
                <h4 className="font-black uppercase italic tracking-widest text-xs text-white/40">Legal</h4>
                <nav className="flex flex-col gap-3 text-sm font-bold uppercase tracking-tighter">
                  <Link href="/tracking" className="hover:text-accent transition-colors">Track Package</Link>
                  <Link href="/privacy" className="hover:text-accent transition-colors">Privacy Policy</Link>
                  <Link href="/terms" className="hover:text-accent transition-colors">Terms of Service</Link>
                </nav>
              </div>

              <div className="space-y-6">
                <h4 className="font-black uppercase italic tracking-widest text-xs text-white/40">Contact</h4>
                <div className="text-sm font-bold uppercase tracking-tighter leading-loose">
                  Portmore, St. Catherine<br/>
                  Jamaica, W.I.<br/>
                  <span className="text-accent">(876) 506-9727</span>
                </div>
              </div>
            </div>
            
            <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.4em] opacity-40">
                  &copy; {year} FromStore2Door Global Logistics.
              </p>
              <div className="flex items-center gap-8 opacity-20">
                <Truck className="h-5 w-5" />
                <Ship className="h-5 w-5" />
                <Plane className="h-5 w-5" />
              </div>
            </div>
         </div>
      </footer>
    </div>
  );
}