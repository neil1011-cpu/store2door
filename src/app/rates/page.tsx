
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Weight, ShoppingCart, ArrowRight, Info, Calculator } from 'lucide-react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const pricingTiers = {
    1: 750,
    2: 1200,
    3: 1650,
    4: 2100,
    5: 2550,
    6: 3000,
    7: 3450,
    8: 3900,
    9: 4350,
    10: 4850,
    23: 9900,
    24: 10200,
    25: 10500,
    26: 10850,
    27: 11200,
    28: 11550,
    29: 11900,
    30: 12250,
};

const calculateCost = (weight: number): number | string => {
    if (weight <= 0) return 0;

    const roundedWeight = Math.ceil(weight);

    if (roundedWeight in pricingTiers) {
        return (pricingTiers as any)[roundedWeight];
    }
    
    if (roundedWeight >= 11 && roundedWeight <= 22) {
        return pricingTiers[10] + (roundedWeight - 10) * 450;
    }
    
    if (roundedWeight >= 31 && roundedWeight <= 50) {
        return pricingTiers[30] + (roundedWeight - 30) * 400;
    }

    if (roundedWeight > 50) {
        return "Contact for quote";
    }

    return "Contact for quote";
};

const pricingData = [
    { weight: "1 lb", price: "$750" },
    { weight: "2 lbs", price: "$1,200" },
    { weight: "3 lbs", price: "$1,650" },
    { weight: "4 lbs", price: "$2,100" },
    { weight: "5 lbs", price: "$2,550" },
    { weight: "6 lbs", price: "$3,000" },
    { weight: "7 lbs", price: "$3,450" },
    { weight: "8 lbs", price: "$3,900" },
    { weight: "9 lbs", price: "$4,350" },
    { weight: "10 lbs", price: "$4,850" },
    { weight: "11-22 lbs", price: "$4,850 + $450/lb over 10" },
    { weight: "25 lbs", price: "$10,500" },
    { weight: "30 lbs", price: "$12,250" },
    { weight: "31-50 lbs", price: "$12,250 + $400/lb over 30" },
    { weight: "51+ lbs", price: "Contact for quote" },
];


export default function RatesPage() {
  const [weight, setWeight] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<number | string | null>(null);


  useEffect(() => {
    if (!weight) {
        setEstimatedCost(null);
        return;
    }
    const weightNum = parseFloat(weight);
    if (weightNum > 0) {
        const cost = calculateCost(weightNum);
        setEstimatedCost(cost);
    } else {
        setEstimatedCost(0);
    }
  }, [weight]);

  return (
    <div className="bg-background">
        <div className="container mx-auto py-16 px-4 md:px-6">
        <div className="max-w-4xl mx-auto text-center mb-16">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Our Competitive Rates</h1>
            <p className="mt-4 text-lg text-muted-foreground">
            Simple, transparent pricing for shipping your packages from the US to Jamaica.
            </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
            <div className="shadow-lg lg:col-span-3 border rounded-lg overflow-hidden">
                <div className="p-6">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                        <DollarSign className="h-7 w-7 text-primary" />
                        <span>Shipping Rate Table (JMD)</span>
                    </h2>
                    <p className="text-muted-foreground mt-2">
                        Our straightforward pricing model ensures no surprises. All rates cover air freight from Florida to Jamaica.
                    </p>
                </div>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="font-semibold text-base">Weight</TableHead>
                            <TableHead className="text-right font-semibold text-base">Price</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {pricingData.map((item, index) => (
                             <TableRow key={index} className="hover:bg-muted/50">
                                <TableCell className="font-medium text-muted-foreground">{item.weight}</TableCell>
                                <TableCell className="text-right font-semibold">{item.price}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <div className="p-6 bg-muted/50">
                    <div className="flex items-start gap-3">
                         <Info className="h-5 w-5 text-primary mt-1 shrink-0" />
                        <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">What's Included:</span> This rate covers air freight from Florida to Jamaica. It does not include local customs and duties, which are calculated separately.</p>
                    </div>
                </div>
            </div>
            
            <div className="lg:col-span-2 space-y-8">
                <Card className="sticky top-24 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calculator className="h-6 w-6 text-primary" />
                            <span>Shipping Cost Estimator</span>
                        </CardTitle>
                        <CardDescription>
                            Calculate your estimated shipping cost instantly.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="weight-input">Package Weight (lbs)</Label>
                                <Input 
                                    id="weight-input"
                                    type="number"
                                    placeholder="e.g., 5.5"
                                    value={weight}
                                    onChange={(e) => setWeight(e.target.value)}
                                    className="text-base"
                                />
                            </div>
                            {estimatedCost !== null && (
                                <div className="pt-4 text-center border-t">
                                    <p className="text-muted-foreground">Estimated Shipping Cost:</p>
                                    <div className="text-4xl font-bold text-primary">
                                        {typeof estimatedCost === 'number' ? `JMD $${estimatedCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : estimatedCost}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">(Excludes customs, duties, and other local fees)</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                 <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle>Need to calculate customs?</CardTitle>
                        <CardDescription>Use our handy tool to estimate potential customs fees for your items.</CardDescription>
                    </CardHeader>
                    <CardFooter>
                         <Button className="w-full" asChild variant="secondary">
                            <Link href="/customs-calculator">
                                Customs Calculator
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardFooter>
                 </Card>
            </div>

        </div>
        
        <div className="mt-16">
                <Card className="bg-primary text-primary-foreground border-none shadow-2xl">
                    <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="text-center md:text-left">
                            <h2 className="text-2xl font-bold">Ready to Start Shipping?</h2>
                            <p className="opacity-90 max-w-lg mt-2">Get your free, tax-free US address today and enjoy seamless shipping to Jamaica.</p>
                        </div>
                        <Button variant="secondary" size="lg" className="shrink-0" asChild>
                            <Link href="/signup">
                                Sign Up For Free
                                <ShoppingCart className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

        </div>
    </div>
  );
}
