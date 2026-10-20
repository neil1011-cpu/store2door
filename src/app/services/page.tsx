'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ship, Package, Plane, Building, CreditCard, Box, Zap, ShoppingBag, Truck, ShieldCheck, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import placeholderImages from "@/lib/placeholder-images.json";

const services = [
  {
    icon: <Plane className="h-8 w-8 text-blue-400" />,
    title: "Air Freight",
    description: "Our primary service. We offer 5 flights per week from Florida to Jamaica, ensuring your packages arrive within 24-48 hours of warehouse processing.",
  },
  {
    icon: <Ship className="h-8 w-8 text-pink-400" />,
    title: "Sea Freight",
    description: "For larger, heavier items such as furniture, appliances, or barrels. Our sea freight is the most cost-effective way to ship in bulk.",
  },
  {
    icon: <ShoppingBag className="h-8 w-8 text-accent" />,
    title: "Personal Shopping",
    description: "No international card? Simply send us the links to what you want to buy, and our team will handle the purchase for you at no extra service fee.",
  },
  {
    icon: <Package className="h-8 w-8 text-green-400" />,
    title: "Consolidation",
    description: "Reduce your shipping costs by consolidating multiple orders into a single shipment. We hold your items until you're ready to ship.",
  },
  {
    icon: <Building className="h-8 w-8 text-purple-400" />,
    title: "Customs Brokerage",
    description: "We handle the entire documentation and clearance process with the Jamaica Customs Agency, so you don't have to worry about the paperwork.",
  },
  {
    icon: <Truck className="h-8 w-8 text-orange-400" />,
    title: "Island-wide Delivery",
    description: "While our hub is in Portmore, we offer delivery services to Kingston, Spanish Town, and surrounding parishes for maximum convenience.",
  },
];

export default function ServicesPage() {
    const servicesImage = placeholderImages.howItWorks;
    
    return (
        <div className="bg-background text-white min-h-screen">
            <div className="container mx-auto py-32 px-4 md:px-6">
                <div className="max-w-4xl mx-auto text-center mb-24 space-y-6">
                    <h1 className="text-6xl font-black italic uppercase tracking-tighter sm:text-8xl">Logistics <span className="text-accent">Solutions.</span></h1>
                    <p className="text-lg text-muted-foreground font-bold uppercase text-[10px] tracking-[0.4em]">
                        The professional bridge between the US and Jamaica.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {services.map((service, index) => (
                        <Card key={index} className="flex flex-col bg-[#0c0c10] border-2 border-white/5 rounded-[3rem] overflow-hidden group hover:border-accent transition-all duration-500 shadow-2xl">
                            <CardHeader className="items-center text-center pt-12">
                                <div className="bg-white/5 p-6 rounded-2xl mb-6 group-hover:scale-110 transition-transform">
                                    {service.icon}
                                </div>
                                <CardTitle className="text-2xl font-black uppercase italic tracking-tight">{service.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-grow text-center px-10 pb-12">
                                <p className="text-muted-foreground font-medium leading-relaxed">{service.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                
                {/* Value Proposition Section */}
                <div className="mt-32 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center bg-white/5 p-12 md:p-20 rounded-[4rem] border-2 border-white/5 shadow-inner">
                    <div className="space-y-8">
                        <h2 className="text-5xl font-black tracking-tight uppercase italic leading-[0.9]">Why Choose <br/><span className="text-pink-500">FromStore2Door?</span></h2>
                        <div className="space-y-6">
                            {[
                                { title: "Speed", text: "5 flights weekly mean you never have to wait long for your goods." },
                                { title: "Security", text: "Our US and JA warehouses are monitored 24/7 with strict security protocols." },
                                { title: "Savings", text: "No membership or hidden fees. You only pay for what you ship." }
                            ].map((v, i) => (
                                <div key={i} className="flex items-start gap-4">
                                    <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center shrink-0 mt-1">
                                        <Zap className="h-3.5 w-3.5 text-black" />
                                    </div>
                                    <div>
                                        <h4 className="font-black uppercase italic tracking-tighter text-lg">{v.title}</h4>
                                        <p className="text-muted-foreground font-medium leading-relaxed">{v.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="pt-6">
                            <Button size="lg" className="rocket-gradient font-black uppercase italic h-14 px-10 rounded-full" asChild>
                                <Link href="/signup">Join Our Network <ArrowRight className="ml-2 h-5 w-5" /></Link>
                            </Button>
                        </div>
                    </div>
                    <div className="relative h-[600px] w-full overflow-hidden rounded-[3rem] shadow-2xl border-8 border-white/5">
                        <Image 
                            src={servicesImage.src}
                            alt="Logistics Operations"
                            fill
                            className="object-cover grayscale hover:grayscale-0 transition-all duration-700"
                            data-ai-hint={servicesImage.hint}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                        <div className="absolute bottom-10 left-10 right-10">
                            <div className="p-6 bg-accent rounded-3xl text-black">
                                <p className="font-black uppercase italic text-xs tracking-widest mb-1 opacity-60 text-black/60">Official Branch</p>
                                <p className="font-black uppercase italic text-2xl tracking-tighter">Portmore, St. Catherine</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Logistics Hub Info */}
                <div className="mt-32 text-center space-y-12">
                    <div className="max-w-2xl mx-auto space-y-4">
                        <h3 className="text-3xl font-black uppercase italic tracking-tighter">Warehouse Operations</h3>
                        <p className="text-muted-foreground font-medium leading-relaxed">
                            Our Florida intake facility is optimized for speed. Every package is logged, photographed, and prepared for export immediately upon arrival.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="p-8 rounded-3xl bg-[#0c0c10] border-2 border-dashed border-white/10">
                            <ShieldCheck className="h-10 w-10 text-accent mx-auto mb-6" />
                            <h4 className="font-black uppercase italic tracking-tighter text-xl mb-2">Secure Storage</h4>
                            <p className="text-xs font-medium text-muted-foreground leading-relaxed">30 days of free storage for consolidation items.</p>
                        </div>
                        <div className="p-8 rounded-3xl bg-[#0c0c10] border-2 border-dashed border-white/10">
                            <Zap className="h-10 w-10 text-pink-500 mx-auto mb-6" />
                            <h4 className="font-black uppercase italic tracking-tighter text-xl mb-2">Auto-Alert</h4>
                            <p className="text-xs font-medium text-muted-foreground leading-relaxed">Instant email and portal notifications for all parcel movements.</p>
                        </div>
                        <div className="p-8 rounded-3xl bg-[#0c0c10] border-2 border-dashed border-white/10">
                            <MapPin className="h-10 w-10 text-blue-500 mx-auto mb-6" />
                            <h4 className="font-black uppercase italic tracking-tighter text-xl mb-2">Intake Sync</h4>
                            <p className="text-xs font-medium text-muted-foreground leading-relaxed">Real-time synchronization with our Jamaican operations hub.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

import { User } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { Mail } from "lucide-react";
import { Phone } from "lucide-react";
