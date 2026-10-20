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
    Twitter,
    CheckCircle2,
    ShoppingBag,
    MapPin
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
              <div className="flex flex-col items-center gap-4">
                  <Badge variant="outline" className="bg-pink-500/10 text-pink-500 border-pink-500/20 px-6 py-1 font-black uppercase tracking-[0.3em] italic text-[10px]">
                    #1 Rated US to JA Courier
                  </Badge>
                  <h1 className="text-6xl font-black tracking-tight sm:text-7xl lg:text-9xl italic uppercase leading-[0.85]">
                    STORE TO <br/>
                    <span className="text-accent">DOOR.</span>
                  </h1>
              </div>
              
              <p className="text-lg md:text-2xl text-muted-foreground max-w-3xl mx-auto font-medium leading-relaxed">
                Experience seamless logistics with 5 weekly flights. Get your <span className="text-white font-bold italic">FREE</span> US shipping address today and bring the world to your doorstep.
              </p>

              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button size="lg" className="h-16 px-12 text-lg font-black uppercase italic tracking-tight rocket-gradient border-none rounded-full shadow-2xl shadow-pink-500/20" asChild>
                  <Link href="/signup">Get Started Free <ArrowRight className="ml-2 h-6 w-6" /></Link>
                </Button>
                <Button size="lg" variant="outline" className="h-16 px-12 text-lg font-black uppercase italic border-2 rounded-full border-white/10 hover:bg-white/5" asChild>
                    <Link href="/services">Our Services</Link>
                </Button>
              </div>

              {/* Live Tracking Integration */}
              <div className="max-w-3xl mx-auto mt-20 p-1 bg-white/5 rounded-[2.5rem] border border-white/10 backdrop-blur-sm shadow-2xl">
                 <div className="bg-[#0a0a0c] rounded-[2.3rem] overflow-hidden">
                    <div className="p-4 border-b border-white/5 flex items-center justify-between px-8">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Global Tracking Node</span>
                        </div>
                        <span className="text-[8px] font-black uppercase opacity-40">PostgreSQL Cloud Ready</span>
                    </div>
                    <form onSubmit={handleTrack} className="p-10 space-y-6">
                        <div className="relative group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground group-focus-within:text-accent transition-colors" />
                            <Input 
                                placeholder="ENTER TRACKING ID..." 
                                className="h-24 pl-16 bg-white/5 border-4 border-white/5 focus:border-accent text-3xl font-black uppercase rounded-[1.5rem] tracking-tighter placeholder:opacity-20"
                                value={trackingId}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                            />
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest opacity-40 italic px-2">
                            <span className="flex items-center gap-2"><MapPin className="h-3 w-3" /> Florida Warehouse</span>
                            <span className="text-accent opacity-100 flex items-center gap-2"><Zap className="h-3 w-3" /> Real-time Updates</span>
                            <span className="flex items-center gap-2"><Package className="h-3 w-3" /> Jamaica Pickup</span>
                        </div>
                    </form>
                 </div>
              </div>
          </div>
        </div>
      </section>

      {/* Trust Banner */}
      <section className="py-24 bg-[#060608] border-y border-white/5">
        <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-16 text-center uppercase tracking-tighter italic">
                <div className="space-y-1">
                    <p className="text-6xl font-black text-white">$0</p>
                    <p className="text-[10px] text-muted-foreground font-black tracking-[0.2em] opacity-60">Registration Fee</p>
                </div>
                <div className="space-y-1">
                    <p className="text-6xl font-black text-pink-500">48<span className="text-white">H</span></p>
                    <p className="text-[10px] text-muted-foreground font-black tracking-[0.2em] opacity-60">Avg. Delivery</p>
                </div>
                <div className="space-y-1">
                    <p className="text-6xl font-black text-white">5<span className="text-accent">X</span></p>
                    <p className="text-[10px] text-muted-foreground font-black tracking-[0.2em] opacity-60">Flights Weekly</p>
                </div>
                <div className="space-y-1">
                    <p className="text-6xl font-black text-white">JA</p>
                    <p className="text-[10px] text-muted-foreground font-black tracking-[0.2em] opacity-60">Owned & Operated</p>
                </div>
            </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-32 relative overflow-hidden">
          <div className="container mx-auto px-4 md:px-6">
              <div className="text-center mb-24 space-y-4">
                  <h2 className="text-5xl font-black tracking-tight uppercase italic sm:text-6xl">How It Works</h2>
                  <p className="text-muted-foreground max-w-lg mx-auto font-bold uppercase text-[10px] tracking-[0.4em]">Simple steps to global commerce.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-12 relative">
                  <div className="absolute top-1/2 left-0 w-full h-1 bg-white/5 -translate-y-1/2 hidden md:block" />
                  
                  {[
                      { 
                        step: "01", 
                        icon: <User className="h-8 w-8" />, 
                        title: "Sign Up", 
                        desc: "Register for free and get your unique US mailbox number instantly." 
                      },
                      { 
                        step: "02", 
                        icon: <ShoppingBag className="h-8 w-8" />, 
                        title: "Shop Online", 
                        desc: "Purchase items from Amazon, eBay, or any US retailer using your new address." 
                      },
                      { 
                        step: "03", 
                        icon: <Plane className="h-8 w-8" />, 
                        title: "We Ship", 
                        desc: "Your packages arrive at our Florida warehouse and are flown to Jamaica." 
                      },
                      { 
                        step: "04", 
                        icon: <CheckCircle2 className="h-8 w-8" />, 
                        title: "Collect", 
                        desc: "Pick up your items from our Portmore hub or choose home delivery." 
                      }
                  ].map((item, i) => (
                      <div key={i} className="relative z-10 flex flex-col items-center text-center space-y-6">
                          <div className="h-24 w-24 rounded-[2rem] bg-[#0c0c10] border-4 border-white/5 flex items-center justify-center text-accent relative group hover:border-accent transition-all duration-500 shadow-xl">
                              <span className="absolute -top-4 -right-4 bg-pink-600 text-white text-[10px] font-black w-10 h-10 rounded-full flex items-center justify-center border-4 border-background">{item.step}</span>
                              {item.icon}
                          </div>
                          <h3 className="text-2xl font-black uppercase italic tracking-tight">{item.title}</h3>
                          <p className="text-muted-foreground text-sm font-medium leading-relaxed max-w-[200px]">{item.desc}</p>
                      </div>
                  ))}
              </div>
          </div>
      </section>

      {/* Services Breakdown */}
      <section className="py-32 bg-[#08080a]">
        <div className="container mx-auto px-4 md:px-6 grid grid-cols-1 md:grid-cols-3 gap-10 max-w-6xl">
            {[
              { 
                icon: <Plane className="h-10 w-10" />, 
                title: "Air Freight", 
                desc: "High-priority cargo flown daily from Florida to Jamaica. Perfect for small packages and urgent imports.",
                border: "border-blue-500/20"
              },
              { 
                icon: <Ship className="h-10 w-10" />, 
                title: "Sea Freight", 
                desc: "The economic choice for barrels, appliances, and oversized cargo. Scheduled sailings for maximum savings.",
                border: "border-pink-500/20"
              },
              { 
                icon: <CreditCard className="h-10 w-10" />, 
                title: "Personal Shopping", 
                desc: "No credit card? No problem. Our concierge service shops for you at no additional service fee.",
                border: "border-accent/20"
              }
            ].map((item, i) => (
              <div key={i} className={`group p-12 rounded-[3.5rem] bg-[#0c0c10] border-2 ${item.border} hover:border-accent transition-all duration-500 shadow-2xl`}>
                <div className="h-20 w-20 rounded-[1.5rem] bg-white/5 flex items-center justify-center text-white mb-10 group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight italic mb-4">{item.title}</h3>
                <p className="text-muted-foreground font-medium leading-relaxed">{item.desc}</p>
                <Button variant="link" className="text-accent font-black uppercase italic text-xs tracking-widest mt-8 p-0" asChild>
                    <Link href="/services">Learn More <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
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
                 <p className="text-sm text-muted-foreground font-medium leading-relaxed">Providing high-performance courier solutions for Jamaica since inception. Reliable, fast, and secure.</p>
                 <div className="flex gap-4">
                    <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-white/10 hover:border-accent hover:text-accent transition-colors"><Twitter className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-white/10 hover:border-accent hover:text-accent transition-colors"><Facebook className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-white/10 hover:border-accent hover:text-accent transition-colors"><Instagram className="h-4 w-4" /></Button>
                 </div>
              </div>
              
              <div className="space-y-6">
                <h4 className="font-black uppercase italic tracking-widest text-xs text-white/40">Navigation</h4>
                <nav className="flex flex-col gap-4 text-sm font-bold uppercase tracking-tight">
                  <Link href="/services" className="hover:text-accent transition-colors">Logistics Services</Link>
                  <Link href="/rates" className="hover:text-accent transition-colors">Pricing Structure</Link>
                  <Link href="/customs-calculator" className="hover:text-accent transition-colors">Customs Estimator</Link>
                  <Link href="/contact" className="hover:text-accent transition-colors">Contact Hub</Link>
                </nav>
              </div>

              <div className="space-y-6">
                <h4 className="font-black uppercase italic tracking-widest text-xs text-white/40">Security & Legal</h4>
                <nav className="flex flex-col gap-4 text-sm font-bold uppercase tracking-tight">
                  <Link href="/tracking" className="hover:text-accent transition-colors">Track Parcel</Link>
                  <Link href="/privacy" className="hover:text-accent transition-colors">Privacy Policy</Link>
                  <Link href="/terms" className="hover:text-accent transition-colors">Terms of Service</Link>
                  <Link href="/admin-login" className="hover:text-accent transition-colors opacity-40">Staff Portal</Link>
                </nav>
              </div>

              <div className="space-y-6">
                <h4 className="font-black uppercase italic tracking-widest text-xs text-white/40">Direct Contact</h4>
                <div className="text-sm font-bold uppercase tracking-tight leading-loose space-y-2">
                  <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-accent" /> Portmore, St. Catherine, JA</p>
                  <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-accent" /> (876) 506-9727</p>
                  <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-accent" /> info@fromstore2door.com</p>
                </div>
              </div>
            </div>
            
            <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.4em] opacity-40">
                  &copy; {year} FromStore2Door Global Logistics. Built for speed.
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

import { User } from 'lucide-react';
import { Mail } from 'lucide-react';
import { Phone } from 'lucide-react';
