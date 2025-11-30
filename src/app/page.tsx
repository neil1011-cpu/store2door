
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Package, ShieldCheck, ArrowRight, Star, Truck, Quote } from 'lucide-react';
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

const testimonials = [
    {
        name: "David Chen",
        role: "Small Business Owner",
        avatar: "https://randomuser.me/api/portraits/men/32.jpg",
        review: "FromStore2Door has been a game-changer for my business. Their reliable service and transparent pricing have saved me time and money. I can't recommend them enough!"
    },
    {
        name: "Maria Garcia",
        role: "Frequent Shopper",
        avatar: "https://randomuser.me/api/portraits/women/44.jpg",
        review: "I love shopping from US stores, and this service makes it so easy. My packages always arrive on time, and their customer support is fantastic. A truly seamless experience."
    },
     {
        name: "James Smith",
        role: "Family Man",
        avatar: "https://randomuser.me/api/portraits/men/67.jpg",
        review: "Sending gifts and necessities to my family in Jamaica used to be a headache. Now, it's simple and affordable. Thank you for connecting us!"
    }
]

export default function HomePage() {
  const homeHeroImage = {
      src: "https://picsum.photos/seed/containers/1800/1200",
      alt: "Modern logistics background with shipping containers and digital overlays",
      hint: "logistics technology"
  };

  return (
    <div className="flex flex-col bg-background">
      <section className="relative w-full py-24 md:py-40 lg:py-56">
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent z-10" />
        <div className="absolute inset-0">
          <Image 
            src={homeHeroImage.src}
            alt={homeHeroImage.alt}
            fill
            className="object-cover"
            priority
            data-ai-hint={homeHeroImage.hint}
          />
          <div className="absolute inset-0 bg-black/60" />
        </div>
        <div className="container mx-auto px-4 md:px-6 relative z-20">
          <div className="grid grid-cols-1 gap-12 items-center">
            <div className="space-y-6 text-center text-white">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
                Your Personal Bridge from Florida to Jamaica
              </h1>
              <p className="mt-4 text-lg text-gray-200 max-w-3xl mx-auto">
                FromStore2Door provides a seamless, reliable, and affordable shipping experience, connecting you to what matters most.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild>
                  <Link href="/signup">Get Your FREE US Address <ArrowRight className="ml-2 h-5 w-5" /></Link>
                </Button>
                <Button size="lg" variant="secondary" asChild>
                  <Link href="/tracking">Track a Package</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-muted/30 dark:bg-card">
        <div className="container mx-auto px-4 md:px-6">
          <div className="space-y-12 max-w-5xl mx-auto">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">How It Works</h2>
              <p className="mt-3 text-muted-foreground text-lg">Shipping with FromStore2Door is as easy as 1-2-3.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                <div className="flex flex-col items-center p-6 space-y-4">
                    <div className="flex items-center justify-center rounded-full bg-primary/10 text-primary h-20 w-20 shrink-0 font-bold text-4xl mb-4 border-2 border-primary/20">1</div>
                    <h3 className="font-semibold text-xl">Sign Up For Free</h3>
                    <p className="text-muted-foreground">Create an account to instantly receive your personal, tax-free US mailing address.</p>
                </div>
                <div className="flex flex-col items-center p-6 space-y-4">
                     <div className="flex items-center justify-center rounded-full bg-primary/10 text-primary h-20 w-20 shrink-0 font-bold text-4xl mb-4 border-2 border-primary/20">2</div>
                    <h3 className="font-semibold text-xl">Shop & Ship to Us</h3>
                    <p className="text-muted-foreground">Shop at your favorite US online stores and use your new address as the shipping destination.</p>
                </div>
                <div className="flex flex-col items-center p-6 space-y-4">
                    <div className="flex items-center justify-center rounded-full bg-primary/10 text-primary h-20 w-20 shrink-0 font-bold text-4xl mb-4 border-2 border-primary/20">3</div>
                    <h3 className="font-semibold text-xl">We Deliver to You</h3>
                    <p className="text-muted-foreground">We consolidate your packages, handle customs, and deliver them to your doorstep in Jamaica.</p>
                </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 md:py-28 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
             <h2 className="text-3xl font-bold tracking-tight text-foreground">Why Choose FromStore2Door?</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              We offer a premium shipping experience designed for your peace of mind.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <Card key={feature.title} className="text-center transform transition-transform duration-300 hover:scale-105 hover:shadow-xl dark:bg-muted/30">
                <CardHeader className="items-center">
                  <div className="bg-primary/10 p-4 rounded-full">
                    {feature.icon}
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="mb-2">{feature.title}</CardTitle>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

       <section className="py-20 md:py-28 bg-muted/30 dark:bg-card">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">What Our Customers Say</h2>
            <p className="mt-4 text-lg text-muted-foreground">
                Don't just take our word for it. Here's what people are saying about our service.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
                <Card key={testimonial.name} className="flex flex-col justify-between bg-background shadow-md">
                    <CardContent className="pt-8 relative">
                        <Quote className="absolute top-6 right-6 h-12 w-12 text-muted-foreground/10" />
                        <p className="mt-4 text-muted-foreground z-10 relative">"{testimonial.review}"</p>
                    </CardContent>
                    <CardHeader className="flex-row items-center gap-4 pt-4 mt-auto">
                        <Avatar>
                            <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                            <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                             <CardTitle className="text-base">{testimonial.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                        </div>
                    </CardHeader>
                </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-8 bg-gray-900 text-gray-400">
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
