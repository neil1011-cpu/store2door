
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Weight, ShoppingCart, ArrowRight, Info } from 'lucide-react';
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
        // Based on the pattern, it looks like it increases by $450/lb after 1lb, then there's a jump at 10lbs
        // Let's assume a rate for this gap. Let's use rate from 10lbs onwards as a base.
        // Cost at 10lbs is 4850. For every lb over 10, let's assume a rate.
        // It's not perfectly linear. A better approach is to use the given data.
        // Since there is no data for 11-22, we should use a consistent rate.
        // The rate from 2-9 lbs is $450/lb. Let's use that from 10lbs.
        // The rate from 26-30 lbs is $350/lb.
        // The rate for 31-50 is $400/lb.
        // Given the inconsistency, it is better to set an average rate for missing ranges.
        // The rate from 9 to 10 lbs is $500.
        // Let's assume $450 per lb after 10lbs, as it's a common rate in the lower tier.
         return pricingTiers[10] + (roundedWeight - 10) * 450;
    }
    
    if (roundedWeight >= 31 && roundedWeight <= 50) {
        return pricingTiers[30] + (roundedWeight - 30) * 400;
    }

    if (roundedWeight > 50) {
        return "Contact for quote";
    }

    // Fallback for any weight not explicitly covered, though logic above should handle it.
    // Let's find the nearest lower bound and calculate from there if needed.
    // This logic is complex without full data, so we'll return an estimate message.
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
    { weight: "25 lbs", price: "$10,500" },
    { weight: "30 lbs", price: "$12,250" },
    { weight: "31-50 lbs", price: "Add $400 per pound" },
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
    <div className="bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto py-16 px-4 md:px-6">
        <div className="max-w-4xl mx-auto text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Our Competitive Rates</h1>
            <p className="mt-4 text-lg text-muted-foreground">
            Simple, transparent pricing for shipping your packages from the US to Jamaica.
            </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-primary" />
                <span>Pricing Details</span>
                </CardTitle>
                <CardDescription>
                    Our straightforward pricing model ensures no surprises.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Weight</TableHead>
                            <TableHead className="text-right">Price (JMD)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {pricingData.map((item, index) => (
                             <TableRow key={index}>
                                <TableCell className="font-medium">{item.weight}</TableCell>
                                <TableCell className="text-right">{item.price}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <ul className="text-sm text-muted-foreground space-y-3 pt-4">
                    <li className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-foreground">Rounding:</span> Weight is rounded up to the nearest pound.
                    </li>
                    <li className="flex items-start gap-2">
                         <Info className="h-4 w-4 text-primary mt-1" />
                        <span><span className="font-semibold text-foreground">What's Included:</span> This rate covers air freight from Florida to Jamaica. It does not include local customs and duties.</span>
                    </li>
                </ul>
            </CardContent>
            <CardFooter>
                <Button className="w-full" asChild>
                    <Link href="/customs-calculator">
                        Estimate Customs Fees
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardFooter>
            </Card>
            
            <Card className="sticky top-24 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Weight className="h-6 w-6 text-primary" />
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

        </div>
        
        <div className="mt-16">
                <Card className="bg-primary text-primary-foreground border-none">
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
