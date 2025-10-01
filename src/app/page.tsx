
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Package, Ship, ShieldCheck, Zap, ArrowRight, Star, Truck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import placeholderImages from '@/lib/placeholder-images.json';

const features = [
  {
    icon: <Truck className="h-8 w-8 text-primary" />,
    title: 'Fast & Efficient',
    description: 'We pride ourselves on providing the quickest delivery times from our warehouse to your front door.',
  },
  {
    icon: <ShieldCheck className="h-8 w-8 text-primary" />,
    title: 'Safe & Secure',
    description: 'Your packages are handled with the utmost care, ensuring they arrive in the same condition we received them.',
  },
  {
    icon: <Package className="h-8 w-8 text-primary" />,
    title: 'Hassle-Free',
    description: 'We handle all aspects of the shipping process, including customs clearance, for a worry-free experience.',
  },
];

export default function HomePage() {
  const homeHeroImage = placeholderImages.homeHero;
  const howItWorksImage = placeholderImages.howItWorks;

  return (
    <div className="flex flex-col">
       <section className="relative w-full pt-20 pb-10 md:pt-32 md:pb-20 lg:pt-40 lg:pb-28 bg-blue-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 text-center lg:text-left">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-gray-900 dark:text-white">
                Your Personal Bridge from Florida to Jamaica
              </h1>
              <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
                FromStore2Door provides a seamless, reliable, and affordable shipping experience, connecting you to what matters most.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Link href="/signup">Get Your FREE US Address</Link>
                </Button>
                <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/10">
                  <Link href="/tracking">Track a Package</Link>
                </Button>
              </div>
            </div>
            <div className="relative h-64 md:h-80 lg:h-96">
                <Image 
                    src={homeHeroImage.src}
                    alt={homeHeroImage.alt}
                    fill
                    className="object-cover rounded-lg shadow-xl"
                    data-ai-hint={homeHeroImage.hint}
                />
            </div>
          </div>
        </div>
      </section>


      <section className="py-20 md:py-28 bg-white dark:bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="space-y-8 max-w-4xl mx-auto">
                 <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">How It Works</h2>
                    <p className="mt-3 text-muted-foreground text-lg">Shipping with FromStore2Door is as easy as 1-2-3.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="flex flex-col items-center text-center gap-4 p-4">
                        <div className="flex items-center justify-center rounded-full bg-primary text-primary-foreground h-16 w-16 shrink-0 font-bold text-3xl">1</div>
                        <div>
                            <h3 className="font-semibold text-lg">Sign Up For Your Free US Address</h3>
                            <p className="text-muted-foreground mt-2">Create an account to instantly receive your personal, tax-free US mailing address.</p>
                        </div>
                    </div>
                     <div className="flex flex-col items-center text-center gap-4 p-4">
                        <div className="flex items-center justify-center rounded-full bg-primary text-primary-foreground h-16 w-16 shrink-0 font-bold text-3xl">2</div>
                        <div>
                            <h3 className="font-semibold text-lg">Shop Online & Ship to Us</h3>
                            <p className="text-muted-foreground mt-2">Shop at your favorite US online stores and use your new FromStore2Door address as the shipping destination.</p>
                        </div>
                    </div>
                     <div className="flex flex-col items-center text-center gap-4 p-4">
                        <div className="flex items-center justify-center rounded-full bg-primary text-primary-foreground h-16 w-16 shrink-0 font-bold text-3xl">3</div>
                        <div>
                            <h3 className="font-semibold text-lg">We Deliver to Your Door</h3>
                            <p className="text-muted-foreground mt-2">We consolidate your packages, handle customs, and deliver them straight to your doorstep in Jamaica.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </section>

      <section id="features" className="py-20 md:py-28 bg-blue-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
             <h2 className="text-3xl font-bold tracking-tight text-foreground">Why Choose FromStore2Door?</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              We offer a premium shipping experience designed for your peace of mind.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <Card key={feature.title} className="text-center transform transition-transform duration-300 hover:scale-105 hover:shadow-xl">
                <CardHeader className="items-center">
                  <div className="bg-primary/10 p-4 rounded-full">
                    {feature.icon}
                  </div>
                  <CardTitle className="mt-4">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  {feature.description}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-8 bg-gray-800 text-gray-300">
         <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center text-center md:text-left">
            <p className="text-sm">&copy; {new Date().getFullYear()} FromStore2Door. All rights reserved.</p>
             <div className="flex gap-4 mt-4 md:mt-0">
                <Link href="#" className="text-sm hover:text-primary">Privacy Policy</Link>
                <Link href="#" className="text-sm hover:text-primary">Terms of Service</Link>
             </div>
         </div>
      </footer>
    </div>
  );
}
