import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { AppLogo } from '@/components/app-logo';
import placeholderImages from '@/lib/placeholder-images.json';

/**
 * @fileOverview Home Page (Server Component).
 * Optimized for stability with static year to eliminate hydration mismatches.
 */
export default function HomePage() {
  const year = 2025; 

  return (
    <div className="flex flex-col bg-background font-body" role="main">
      {/* Hero Section */}
      <section className="relative w-full py-24 md:py-40 lg:py-56 overflow-hidden" aria-label="Hero">
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-0">
          <Image 
            src={placeholderImages.homeHero.src}
            alt="International cargo airplane taxiing on runway at sunset"
            fill
            className="object-cover grayscale-[10%]"
            priority
            data-ai-hint={placeholderImages.homeHero.hint}
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
                <Button size="lg" className="h-16 px-10 text-lg font-black uppercase italic tracking-tight shadow-2xl" asChild>
                  <Link href="/signup">Open FREE Account <ArrowRight className="ml-2 h-6 w-6" aria-hidden="true" /></Link>
                </Button>
                <Button size="lg" variant="secondary" className="h-16 px-10 text-lg font-black italic backdrop-blur-md bg-white/90" asChild>
                  <Link href="/tracking">Track Worldwide</Link>
                </Button>
              </div>
          </div>
        </div>
      </section>

      {/* Global Reach Stats */}
      <section className="py-12 bg-primary text-primary-foreground border-y border-white/10" aria-label="Statistics">
        <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center uppercase tracking-tighter italic">
                <div><p className="text-4xl font-black">100%</p><p className="text-[10px] opacity-60 font-bold tracking-widest">Safe Arrival</p></div>
                <div><p className="text-4xl font-black">24/7</p><p className="text-[10px] opacity-60 font-bold tracking-widest">Global Tracking</p></div>
                <div><p className="text-4xl font-black">0</p><p className="text-[10px] opacity-60 font-bold tracking-widest">Signup Fees</p></div>
                <div><p className="text-4xl font-black">JAM</p><p className="text-[10px] opacity-60 font-bold tracking-widest">Local Support</p></div>
            </div>
        </div>
      </section>

      {/* 3 Step Process */}
      <section className="py-24 bg-muted/30" aria-label="Process Overview">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-4xl font-black tracking-tighter uppercase italic">Worldwide Delivery Made Simple</h2>
            <div className="h-1.5 w-24 bg-primary mx-auto rounded-full" />
            <p className="text-muted-foreground max-w-lg mx-auto font-medium uppercase text-[10px] tracking-widest">Get your international packages to Jamaica in three professional steps.</p>
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
                    <p className="text-muted-foreground text-sm leading-relaxed px-4 font-medium">{step.d}</p>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="py-16 bg-background border-t" role="contentinfo">
         <div className="container mx-auto px-4 md:px-6 flex flex-col items-center text-center gap-8">
            <AppLogo className="scale-125 mb-4" />
            <nav className="flex flex-wrap justify-center gap-8 text-sm font-bold uppercase tracking-widest text-muted-foreground" aria-label="Footer Navigation">
                <Link href="/privacy" className="hover:text-primary transition-colors focus:ring-2 focus:ring-primary focus:outline-none rounded">Privacy Policy</Link>
                <Link href="/terms" className="hover:text-primary transition-colors focus:ring-2 focus:ring-primary focus:outline-none rounded">Terms of Service</Link>
                <Link href="/contact" className="hover:text-primary transition-colors focus:ring-2 focus:ring-primary focus:outline-none rounded">Contact Support</Link>
                <Link href="/tracking" className="hover:text-primary transition-colors focus:ring-2 focus:ring-primary focus:outline-none rounded">Global Tracking</Link>
            </nav>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-8 opacity-60">
                &copy; {year} FromStore2Door Global Logistics. Portmore, Jamaica.
            </p>
         </div>
      </footer>
    </div>
  );
}
