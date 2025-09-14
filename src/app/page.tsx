
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Package, Ship, ShieldCheck, Zap } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const features = [
  {
    icon: <Zap className="h-8 w-8 text-primary" />,
    title: 'Real-Time Tracking',
    description:
      'Monitor your shipments every step of the way with our live tracking system.',
  },
  {
    icon: <Ship className="h-8 w-8 text-primary" />,
    title: 'Hassle-Free Shipping',
    description:
      'We handle all the logistics, from your US address to your door in Jamaica.',
  },
  {
    icon: <ShieldCheck className="h-8 w-8 text-primary" />,
    title: 'Secure & Reliable',
    description:
      'Your packages are safe with us. We ensure every delivery is secure and on time.',
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <section className="relative w-full py-20 md:py-32 lg:py-40 bg-background">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-primary-foreground">
              Your Bridge Between Florida & Jamaica
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              SwiftRoute provides seamless, reliable, and affordable shipping services, connecting you to what matters most.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/signup">Get Your US Address</Link>
              </Button>
              <Button size="lg" variant="secondary">
                Track a Package
              </Button>
            </div>
          </div>
        </div>
        <div className="absolute inset-0 -z-10 h-full w-full bg-primary [mask-image:radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(0,0,0,0.8)_0%,rgba(0,0,0,0)_100%)]"></div>
      </section>

      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-4">
                 <h2 className="text-3xl font-bold tracking-tight text-foreground">
                    How It Works
                </h2>
                <p className="text-muted-foreground text-lg">
                    Shipping with SwiftRoute is as easy as 1-2-3.
                </p>
                <div className="space-y-6 pt-4">
                    <div className="flex items-start gap-4">
                        <div className="flex items-center justify-center rounded-full bg-primary text-primary-foreground h-10 w-10 shrink-0 font-bold text-lg">1</div>
                        <div>
                            <h3 className="font-semibold">Sign Up For Your Free US Address</h3>
                            <p className="text-muted-foreground">Create an account to instantly receive your personal, tax-free US mailing address.</p>
                        </div>
                    </div>
                     <div className="flex items-start gap-4">
                        <div className="flex items-center justify-center rounded-full bg-primary text-primary-foreground h-10 w-10 shrink-0 font-bold text-lg">2</div>
                        <div>
                            <h3 className="font-semibold">Shop Online & Ship to Us</h3>
                            <p className="text-muted-foreground">Shop at your favorite US online stores and use your new address as the shipping destination.</p>
                        </div>
                    </div>
                     <div className="flex items-start gap-4">
                        <div className="flex items-center justify-center rounded-full bg-primary text-primary-foreground h-10 w-10 shrink-0 font-bold text-lg">3</div>
                        <div>
                            <h3 className="font-semibold">We Deliver to Your Door</h3>
                            <p className="text-muted-foreground">We consolidate your packages, handle customs, and deliver them straight to your doorstep in Jamaica.</p>
                        </div>
                    </div>
                </div>
            </div>
             <div className="relative h-[300px] md:h-[400px] lg:h-[500px]">
                <Image 
                    src="https://picsum.photos/seed/shipping/800/600"
                    alt="Shipping process"
                    fill
                    className="object-cover rounded-lg"
                    data-ai-hint="warehouse shipping boxes"
                />
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 md:py-32 bg-secondary">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
             <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Why Choose SwiftRoute?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              We offer a premium shipping experience designed for your peace of mind.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardHeader className="items-center text-center">
                  {feature.icon}
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-muted-foreground">
                  {feature.description}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-12 bg-background">
         <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center text-center md:text-left">
            <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} SwiftRoute. All rights reserved.</p>
             <div className="flex gap-4 mt-4 md:mt-0">
                <Link href="#" className="text-sm text-muted-foreground hover:text-primary">Privacy Policy</Link>
                <Link href="#" className="text-sm text-muted-foreground hover:text-primary">Terms of Service</Link>
             </div>
         </div>
      </footer>
    </div>
  );
}
