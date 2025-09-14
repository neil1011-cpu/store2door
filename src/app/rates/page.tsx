
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Weight, ShoppingCart, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const USD_TO_JMD_RATE = 156;

export default function RatesPage() {
  const [ratePerPoundUSD, setRatePerPoundUSD] = useState(4.81);
  const [roundToNearestPound, setRoundToNearestPound] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [weight, setWeight] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);

  const ratePerPoundJMD = ratePerPoundUSD * USD_TO_JMD_RATE;

  useEffect(() => {
    // In a real application, these rates would be fetched from a backend API.
    // For this prototype, we'll continue to read from localStorage if available,
    // otherwise we use the default values.
    try {
      const savedRate = localStorage.getItem('ratePerPound');
      const savedRounding = localStorage.getItem('roundToNearestPound');

      if (savedRate) {
        setRatePerPoundUSD(JSON.parse(savedRate));
      }
      if (savedRounding) {
        setRoundToNearestPound(JSON.parse(savedRounding));
      }
    } catch (error) {
        console.error("Could not load rates from local storage", error);
    }
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
    <div className="container mx-auto py-12 px-4 md:px-6">
      <div className="max-w-3xl mx-auto text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight">Our Competitive Rates</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Simple, transparent pricing for shipping your packages from the US to Jamaica.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-primary" />
              <span>Pricing Details</span>
            </CardTitle>
            <CardDescription>
                Our straightforward pricing model.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-baseline justify-center text-center p-6 bg-muted rounded-lg">
                <span className="text-2xl font-bold mr-1">JMD</span>
                <span className="text-5xl font-bold">${ratePerPoundJMD.toFixed(2)}</span>
                <span className="text-xl text-muted-foreground">/lb</span>
            </div>
             <div className="text-sm text-muted-foreground space-y-2">
                <p>
                    <span className="font-semibold text-foreground">Minimum Charge:</span> A minimum charge equivalent to 1lb applies to all shipments.
                </p>
                <p>
                    <span className="font-semibold text-foreground">Rounding:</span> {roundToNearestPound ? 'The total weight is rounded up to the nearest whole pound.' : 'We use the exact weight for calculation.'}
                </p>
                <p>
                    <span className="font-semibold text-foreground">What's Included:</span> This rate covers the air freight from our Florida warehouse to Jamaica. It does not include local customs and duties.
                </p>
            </div>
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
        
        <Card className="sticky top-24">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Weight className="h-6 w-6 text-primary" />
                    <span>Shipping Cost Estimator</span>
                </CardTitle>
                <CardDescription>
                    Calculate your estimated shipping cost.
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
                        />
                    </div>
                    {estimatedCost !== null && (
                        <div className="pt-4 text-center">
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
            <Card className="bg-primary text-primary-foreground">
                <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h2 className="text-2xl font-bold">Ready to Start Shipping?</h2>
                        <p className="opacity-90 max-w-lg">Get your free, tax-free US address today and enjoy seamless shipping to Jamaica.</p>
                    </div>
                    <Button variant="secondary" size="lg" asChild>
                         <Link href="/signup">
                            Sign Up For Free
                            <ShoppingCart className="ml-2 h-5 w-5" />
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>

    </div>
  );
}
