'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calculator, Info, ArrowLeft, HelpCircle, Truck } from 'lucide-react';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const CUSTOMS_RATES = {
  GENERAL: { duty: 0.20 },
  LAPTOPS_TABLETS: { duty: 0 },
  COMPUTERS: { duty: 0 },
  CELL_PHONES: { duty: 0.20 },
  CLOTHING: { duty: 0.20 },
  SHOES: { duty: 0.20 },
  AUTO_PARTS: { duty: 0.30 },
  COSMETICS: { duty: 0.20 },
  BOOKS: { duty: 0 },
  ELECTRONICS_OTHER: { duty: 0.20 },
};

const USD_TO_JMD_RATE = 156; 
const DE_MINIMIS_THRESHOLD = 100;
const INSURANCE_RATE = 0.015;
const SCF_RATE = 0.003;

// Official Shipping Rates
const pricingTiers: Record<number, number> = {
    1: 750, 2: 1200, 3: 1650, 4: 2100, 5: 2550,
    6: 3000, 7: 3450, 8: 3900, 9: 4350, 10: 4850,
    23: 9900, 24: 10200, 25: 10500, 26: 10850, 
    27: 11200, 28: 11550, 29: 11900, 30: 12250
};

type Category = keyof typeof CUSTOMS_RATES;

export default function PublicCustomsCalculatorPage() {
  const [price, setPrice] = useState('');
  const [weight, setWeight] = useState('');
  const [category, setCategory] = useState<Category>('GENERAL');
  const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'JMD'>('JMD'); // Default to JMD

  const [calculation, setCalculation] = useState({
    freight: 0,
    importDuty: 0,
    scf: 0,
    caf: 0,
    customsTotal: 0,
    total: 0,
    isDutyFree: false,
    calculated: false,
  });

  const calculateShippingFromWeight = (weightLbs: number): number => {
    if (weightLbs <= 0) return 0;
    const roundedWeight = Math.ceil(weightLbs);
    let priceJMD = 0;
    
    if (roundedWeight in pricingTiers) {
        priceJMD = pricingTiers[roundedWeight];
    } else if (roundedWeight >= 11 && roundedWeight <= 22) {
        priceJMD = 4850 + (roundedWeight - 10) * 450;
    } else if (roundedWeight >= 31) {
        priceJMD = 12250 + (roundedWeight - 30) * 400;
    } else {
        priceJMD = 12250;
    }

    return priceJMD / USD_TO_JMD_RATE;
  };

  const getCAF = (valueUsd: number) => {
    if (valueUsd <= DE_MINIMIS_THRESHOLD) return 0;
    if (valueUsd <= 500) return 2500;
    if (valueUsd <= 1000) return 5000;
    if (valueUsd <= 2500) return 10000;
    if (valueUsd <= 5000) return 20000;
    return 40000;
  };

  const handleCalculate = () => {
    const itemPrice = parseFloat(price) || 0;
    const w = parseFloat(weight) || 0;
    const shippingCostUsd = calculateShippingFromWeight(w);
    
    // 1. De Minimis Check
    if (itemPrice <= DE_MINIMIS_THRESHOLD) {
        setCalculation({
            freight: shippingCostUsd,
            importDuty: 0,
            scf: 0,
            caf: 0,
            customsTotal: 0,
            total: shippingCostUsd,
            isDutyFree: true,
            calculated: true,
        });
        return;
    }

    // 2. CIF (Base)
    const insurance = itemPrice * INSURANCE_RATE;
    const cif = itemPrice + insurance + shippingCostUsd;
    
    // 3. ID (Import Duty)
    const rates = CUSTOMS_RATES[category];
    const importDuty = cif * rates.duty;
    
    // 4. SCF (Standard Compliance Fee)
    const scf = cif * SCF_RATE;
    
    // 5. CAF (Customs Admin Fee)
    const cafJmd = getCAF(itemPrice);
    const cafUsd = cafJmd / USD_TO_JMD_RATE;
    
    // 6. Subtotal Customs
    const customsTotal = importDuty + scf + cafUsd;

    // 7. Grand Total
    const total = shippingCostUsd + customsTotal;

    setCalculation({
      freight: shippingCostUsd,
      importDuty,
      scf,
      caf: cafUsd,
      customsTotal,
      total,
      isDutyFree: false,
      calculated: true,
    });
  };

  const formatCurrency = (value: number) => {
    const finalValue = displayCurrency === 'JMD' ? value * USD_TO_JMD_RATE : value;
    return finalValue.toLocaleString('en-US', { 
        style: 'currency', 
        currency: displayCurrency,
        minimumFractionDigits: displayCurrency === 'JMD' ? 0 : 2,
        maximumFractionDigits: displayCurrency === 'JMD' ? 0 : 2,
    });
  };

  return (
    <div className="min-h-screen bg-muted/30">
        <div className="container mx-auto py-12 px-4 md:px-6">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight">Landed Cost Estimator</h1>
                        <p className="text-lg text-muted-foreground mt-2">
                            Shipping Rates + Official JCA Customs Fees.
                        </p>
                    </div>
                    <Button variant="ghost" asChild>
                        <Link href="/rates">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Rates
                        </Link>
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle>Step 1: Package Info</CardTitle>
                            <CardDescription>Enter the item value and its weight.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="price">Item Value (USD)</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    placeholder="0.00"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    className="text-lg"
                                />
                                <p className="text-xs text-muted-foreground">Value used for customs. $100 or less is duty-free.</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="weight">Weight (lbs)</Label>
                                <Input
                                    id="weight"
                                    type="number"
                                    placeholder="0.00"
                                    value={weight}
                                    onChange={(e) => setWeight(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">Determines your air freight shipping cost.</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Item Category</Label>
                                <Select onValueChange={(value: Category) => setCategory(value)} defaultValue={category}>
                                    <SelectTrigger id="category">
                                        <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="GENERAL">General Goods (20%)</SelectItem>
                                        <SelectItem value="LAPTOPS_TABLETS">Laptops / Tablets (0%)</SelectItem>
                                        <SelectItem value="COMPUTERS">Computers / Parts (0%)</SelectItem>
                                        <SelectItem value="CELL_PHONES">Cell Phones (20%)</SelectItem>
                                        <SelectItem value="CLOTHING">Clothing (20%)</SelectItem>
                                        <SelectItem value="SHOES">Shoes (20%)</SelectItem>
                                        <SelectItem value="AUTO_PARTS">Auto Parts (30%)</SelectItem>
                                        <SelectItem value="COSMETICS">Cosmetics (20%)</SelectItem>
                                        <SelectItem value="BOOKS">Books (0%)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleCalculate} size="lg" className="w-full">
                                <Calculator className="mr-2 h-5 w-5" /> Calculate Now
                            </Button>
                        </CardFooter>
                    </Card>

                    <Card className="shadow-lg border-primary/20 overflow-hidden">
                        <CardHeader className="bg-primary/5">
                            <CardTitle>Step 2: Total Landed Cost</CardTitle>
                            <CardDescription>Shipping + Official JCA Breakdown.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {calculation.calculated ? (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between p-2 rounded-md bg-secondary/50">
                                        <span className="text-sm font-medium">Currency: {displayCurrency}</span>
                                        <Switch
                                            checked={displayCurrency === 'JMD'}
                                            onCheckedChange={(checked) => setDisplayCurrency(checked ? 'JMD' : 'USD')}
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center text-sm font-semibold">
                                            <span className="flex items-center gap-2">
                                                <Truck className="h-4 w-4 text-primary" />
                                                SwiftRoute Shipping Fee
                                            </span>
                                            <span className="text-lg">{formatCurrency(calculation.freight)}</span>
                                        </div>

                                        <Separator />

                                        {calculation.isDutyFree ? (
                                            <Alert className="bg-green-50 border-green-200">
                                                <Info className="h-4 w-4 text-green-600" />
                                                <AlertTitle className="text-green-800 text-xs">Duty Free Shipment</AlertTitle>
                                                <AlertDescription className="text-green-700 text-xs">
                                                    Item is $100 USD or less. $0.00 customs charges apply.
                                                </AlertDescription>
                                            </Alert>
                                        ) : (
                                            <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Customs Breakdown</p>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Import Duty</span>
                                                    <span>{formatCurrency(calculation.importDuty)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">SCF (Compliance)</span>
                                                    <span>{formatCurrency(calculation.scf)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">CAF (Admin Fee)</span>
                                                    <span>{formatCurrency(calculation.caf)}</span>
                                                </div>
                                                <Separator />
                                                <div className="flex justify-between text-sm font-medium">
                                                    <span>Customs Subtotal</span>
                                                    <span>{formatCurrency(calculation.customsTotal)}</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="p-4 rounded-xl bg-primary text-primary-foreground shadow-inner">
                                            <div className="flex justify-between items-center">
                                                <span className="text-lg font-bold">Estimated Total</span>
                                                <span className="text-3xl font-black">{formatCurrency(calculation.total)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <p className="text-[11px] text-muted-foreground italic leading-relaxed text-center">
                                        Note: This estimate matches our official rates and JCA logic. Actual customs charges may vary at the port.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground space-y-4 border-2 border-dashed rounded-lg">
                                    <Calculator className="h-12 w-12 opacity-20" />
                                    <p>Enter details to see your total cost.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    </div>
  );
}
