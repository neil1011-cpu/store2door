
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Weight, ShoppingCart, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function RatesPage() {
  const ratePerPoundJMD = 750;
  const [roundToNearestPound, setRoundToNearestPound] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [weight, setWeight] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);


  useEffect(() => {
    // In a real app, this might be a global setting fetched from a backend
    setIsLoaded(true);
  }, []);
  
  useEffect(() => {
    if (!weight) {
        setEstimatedCost(null);
        return;
    }
    const weightNum = parseFloat(weight);
    if (weightNum > 0) {
        const effectiveWeight = roundToNearestPound ? Math.ceil(weightNum) : weightNum;
        const cost = effectiveWeight * ratePerPoundJMD;
        setEstimatedCost(cost);
    } else {
        setEstimatedCost(0);
    }
  }, [weight, ratePerPoundJMD, roundToNearestPound]);

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto py-16 px-4 md:px-6">
        <div className="max-w-4xl mx-auto text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Our Competitive Rates</h1>
            <p className="mt-4 text-lg text-muted-foreground">
            Simple, transparent pricing for shipping your packages from the US to Jamaica.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
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
            <CardContent className="space-y-6">
                <div className="flex items-baseline justify-center text-center p-6 bg-muted rounded-lg">
                    <span className="text-2xl font-bold mr-1">JMD</span>
                    <span className="text-6xl font-bold">${ratePerPoundJMD.toFixed(2)}</span>
                    <span className="text-xl text-muted-foreground self-end">/lb</span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-3">
                    <li className="flex items-center gap-2">
                        <ArrowRight className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-foreground">Minimum Charge:</span> A minimum charge equivalent to 1lb applies.
                    </li>
                    <li className="flex items-center gap-2">
                         <ArrowRight className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-foreground">Rounding:</span> {isLoaded && (roundToNearestPound ? 'Weight is rounded up to the nearest pound.' : 'We use the exact weight.')}
                    </li>
                    <li className="flex items-start gap-2">
                         <ArrowRight className="h-4 w-4 text-primary mt-1" />
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
                                <p className="text-4xl font-bold text-primary">JMD ${estimatedCost.toFixed(2)}</p>
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
