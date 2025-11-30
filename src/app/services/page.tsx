
'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ship, Package, Plane, Building, CreditCard, Box } from "lucide-react";
import Image from "next/image";
import placeholderImages from "@/lib/placeholder-images.json";

const services = [
  {
    icon: <Plane className="h-8 w-8 text-primary" />,
    title: "Air Freight",
    description: "Fast and reliable air cargo services from our Florida warehouse directly to Jamaica. Ideal for time-sensitive shipments.",
  },
  {
    icon: <Ship className="h-8 w-8 text-primary" />,
    title: "Sea Freight",
    description: "Cost-effective sea freight for larger, heavier, and less urgent shipments. Perfect for barrels and large items.",
  },
  {
    icon: <Package className="h-8 w-8 text-primary" />,
    title: "Package Consolidation",
    description: "Shop from multiple online stores, and we'll consolidate your items into a single shipment to save you money.",
  },
  {
    icon: <Building className="h-8 w-8 text-primary" />,
    title: "Customs Clearance",
    description: "We handle all customs brokerage and clearance procedures to ensure your packages are processed without hassle.",
  },
  {
    icon: <Box className="h-8 w-8 text-primary" />,
    title: "Personal Shopping",
    description: "Don't have a US credit card? Our personal shopping team can purchase items on your behalf.",
  },
  {
    icon: <CreditCard className="h-8 w-8 text-primary" />,
    title: "Online Bill Payment",
    description: "Conveniently pay your shipping and customs fees online through our secure portal.",
  },
];

export default function ServicesPage() {
    const servicesImage = placeholderImages.howItWorks;
  return (
    <div className="bg-background">
      <div className="container mx-auto py-16 px-4 md:px-6">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Our Services</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            A complete suite of services to make your shipping experience as smooth and seamless as possible.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <Card key={index} className="flex flex-col transform transition-all duration-300 hover:scale-105 hover:shadow-xl bg-card">
              <CardHeader className="items-center text-center">
                 <div className="bg-primary/10 p-4 rounded-full mb-4">
                    {service.icon}
                  </div>
                <CardTitle>{service.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow text-center">
                <p className="text-muted-foreground">{service.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="mt-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center bg-muted/30 dark:bg-card p-8 rounded-lg">
            <div className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tight">Your Trusted Shipping Partner</h2>
                <p className="text-lg text-muted-foreground">
                    At FromStore2Door, we are committed to providing a reliable and transparent service. We understand the importance of your packages, whether they are personal items from loved ones or goods for your business. Our team is dedicated to ensuring a safe and timely delivery, every time.
                </p>
                 <p className="text-lg text-muted-foreground">
                    From our state-of-the-art warehouse in Florida to our final delivery at your door in Jamaica, we leverage technology and a customer-centric approach to give you peace of mind.
                </p>
            </div>
            <div className="relative h-96 w-full overflow-hidden rounded-lg shadow-xl">
                 <Image 
                    src={servicesImage.src}
                    alt="Warehouse with packages"
                    fill
                    className="object-cover"
                    data-ai-hint={servicesImage.hint}
                />
            </div>
        </div>

      </div>
    </div>
  );
}
