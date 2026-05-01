import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ShieldCheck, ArrowRight, Truck, Quote, Globe } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const features = [
  {
    icon: <Globe className="h-8 w-8 text-primary" />,
    title: 'Anywhere to Anywhere',
    description: 'We ship from any store worldwide directly to your doorstep in Jamaica with unmatched efficiency.',
  },
  {
    icon: <ShieldCheck className="h-8 w-8 text-primary" />,
    title: 'Safe & Secure',
    description: 'Your packages are handled with the utmost care, ensuring they arrive in the same condition we received them.',
  },
  {
    icon: <Package className="h-8 w-8 text-primary" />,
    title: 'Complete Brokerage',
    description: 'We handle all aspects of the shipping process, including professional customs brokerage and clearance.',
  },
];

const testimonials = [
    {
        name: "David Chen",
        role: "Small Business Owner",
        review: "FromStore2Door has been a game-changer for my business. Their global reach and transparent pricing have saved me time and money."
    },
    {
        name: "Maria Garcia",
        role: "Frequent Shopper",
        review: "I love shopping from stores all over the world, and this service makes it so easy. My packages always arrive on time!"
    },
     {
        name: "James Smith",
        role: "Family Man",
        review: "Sending essentials to my family used to be a headache. Now, it's simple and affordable. Thank you for connecting us!"
    }
]

export default function HomePage() {
  const homeHeroImage = {
      src: "https://picsum.photos/seed/delivery-van-pro/1200/800",
      alt: "Professional delivery van delivering packages",
      hint: "delivery van"
  };

  return (
    <div className="flex flex-col bg-background font-body">
      <section className="relative w-full py-24 md:py-40 lg:py-56 overflow-hidden">
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0">
          <Image 
            src={homeHeroImage.src}
            alt={homeHeroImage.alt}
            fill
            className="object-cover"
            priority
            data-ai-hint={homeHeroImage.hint}
          />
          <div className="absolute inset-0 bg-black/50" />
        </div>
        <div className="container mx-auto px-4 md:px-6 relative z-20">
          <div className="max-w-4xl mx-auto text-center text-white space-y-6">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
                Your Global Bridge to Jamaica
              </h1>
              <p className="text-lg text-gray-200 max-w-2xl mx-auto">
                Shipping from anywhere in the world directly to your doorstep. We provide a premium, reliable, and affordable experience.
              </p>
              <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="h-14 px-8 text-lg" asChild>
                  <Link href="/signup">Get Your FREE Account <ArrowRight className="ml-2 h-5 w-5" /></Link>
                </Button>
                <Button size="lg" variant="secondary" className="h-14 px-8 text-lg" asChild>
                  <Link href="/tracking">Track Package</Link>
                </Button>
              </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30 border-y">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight">Simple Worldwide Delivery</h2>
            <p className="text-muted-foreground mt-2">Connecting you to global stores in 3 easy steps.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center max-w-5xl mx-auto">
              {[
                { s: 1, t: "Sign Up", d: "Create an account to receive your personal global shipping credentials." },
                { s: 2, t: "Shop Worldwide", d: "Shop at any online store in the world and use our network at checkout." },
                { s: 3, t: "Doorstep Delivery", d: "We consolidate and deliver safely to your door in Jamaica." }
              ].map(step => (
                <div key={step.s} className="space-y-4">
                    <div className="h-16 w-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-3xl font-black mx-auto shadow-lg">{step.s}</div>
                    <h3 className="text-xl font-bold">{step.t}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{step.d}</p>
                </div>
              ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f) => (
              <Card key={f.title} className="text-center border-none shadow-none bg-transparent">
                <CardHeader className="items-center">
                  <div className="bg-primary/10 p-4 rounded-2xl mb-4">{f.icon}</div>
                  <CardTitle className="text-2xl font-headline">{f.title}</CardTitle>
                </CardHeader>
                <CardContent><p className="text-muted-foreground leading-relaxed">{f.description}</p></CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

       <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 md:px-6 text-center space-y-12">
          <h2 className="text-3xl font-bold tracking-tight">What Our Customers Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t) => (
                <Card key={t.name} className="bg-white/10 border-none text-white text-left h-full">
                    <CardContent className="pt-8">
                        <Quote className="h-8 w-8 opacity-20 mb-4" />
                        <p className="italic mb-6">"{t.review}"</p>
                        <div>
                             <p className="font-bold">{t.name}</p>
                            <p className="text-xs opacity-60 uppercase tracking-widest">{t.role}</p>
                        </div>
                    </CardContent>
                </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-12 bg-zinc-950 text-zinc-400 border-t border-white/5">
         <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="space-y-2 text-center md:text-left">
                <p className="text-white font-bold text-lg">FromStore2Door</p>
                <p className="text-sm">Connecting the world to Jamaica since 2024.</p>
            </div>
             <div className="flex gap-8 text-sm">
                <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                <Link href="/contact" className="hover:text-white transition-colors">Contact Support</Link>
             </div>
         </div>
      </footer>
    </div>
  );
}