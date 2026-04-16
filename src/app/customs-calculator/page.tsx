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
import { Calculator, Info, ArrowLeft, HelpCircle } from 'lucide-react';
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

type Category = keyof typeof CUSTOMS_RATES;

export default function PublicCustomsCalculatorPage() {
  const [price, setPrice] = useState('');
  const [weight, setWeight] = useState('');
  const [category, setCategory] = useState<Category>('GENERAL');
  const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'JMD'>('USD');

  const [calculation, setCalculation] = useState({
    cif: 0,
    importDuty: 0,
    scf: 0,
    caf: 0,
    total: 0,
    isDutyFree: false,
    calculated: false,
  });

  // Calculate Shipping based on company rates (JMD to USD)
  const calculateShippingFromWeight = (weightLbs: number): number => {
    if (weightLbs <= 0) return 0;
    const roundedWeight = Math.ceil(weightLbs);
    let priceJMD = 0;
    
    const rates: Record<number, number> = {
        1: 750, 2: 1200, 3: 1650, 4: 2100, 5: 2550,
        6: 3000, 7: 3450, 8: 3900, 9: 4350, 10: 4850,
        23: 9900, 24: 10200, 25: 10500, 26: 10850, 
        27: 11200, 28: 11550, 29: 11900, 30: 12250
    };

    if (roundedWeight in rates) {
        priceJMD = rates[roundedWeight];
    } else if (roundedWeight >= 11 && roundedWeight <= 22) {
        priceJMD = 4850 + (roundedWeight - 10) * 450;
    } else if (roundedWeight >= 31) {
        priceJMD = 12250 + (roundedWeight - 30) * 400;
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
    const shippingCost = calculateShippingFromWeight(w);
    
    // 1. De Minimis Check
    if (itemPrice <= DE_MINIMIS_THRESHOLD) {
        setCalculation({
            cif: itemPrice + shippingCost,
            importDuty: 0,
            scf: 0,
            caf: 0,
            total: 0,
            isDutyFree: true,
            calculated: true,
        });
        return;
    }

    // 2. CIF (Base)
    const insurance = itemPrice * INSURANCE_RATE;
    const cif = itemPrice + insurance + shippingCost;
    
    // 3. ID (Import Duty)
    const rates = CUSTOMS_RATES[category];
    const importDuty = cif * rates.duty;
    
    // 4. SCF (Standard Compliance Fee)
    const scf = cif * SCF_RATE;
    
    // 5. CAF (Customs Admin Fee)
    const cafJmd = getCAF(itemPrice);
    const cafUsd = cafJmd / USD_TO_JMD_RATE;
    
    // 6. Total = ID + SCF + CAF
    const total = importDuty + scf + cafUsd;

    setCalculation({
      cif,
      importDuty,
      scf,
      caf: cafUsd,
      total,
      isDutyFree: false,
      calculated: true,
    });
  };

  const formatCurrency = (value: number) => {
    const finalValue = displayCurrency === 'JMD' ? value * USD_TO_JMD_RATE : value;
    return finalValue.toLocaleString('en-US', { style: 'currency', currency: displayCurrency });
  };

  return (
    <div className="min-h-screen bg-muted/30">
        <div className="container mx-auto py-12 px-4 md:px-6">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight">Customs Fee Estimator</h1>
                        <p className="text-lg text-muted-foreground mt-2">
                            Estimate your charges based on official JCA logic.
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
                            <CardTitle>Step 1: Item Info</CardTitle>
                            <CardDescription>Enter the purchase price and package weight.</CardDescription>
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
                                <p className="text-xs text-muted-foreground">Items $100 USD or less are duty-free for personal use.</p>
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
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">What are you shipping?</Label>
                                <Select onValueChange={(value: Category) => setCategory(value)} defaultValue={category}>
                                    <SelectTrigger id="category">
                                        <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="GENERAL">General Goods</SelectItem>
                                        <SelectItem value="LAPTOPS_TABLETS">Laptops / Tablets</SelectItem>
                                        <SelectItem value="COMPUTERS">Computers / Parts</SelectItem>
                                        <SelectItem value="CELL_PHONES">Cell Phones</SelectItem>
                                        <SelectItem value="CLOTHING">Clothing</SelectItem>
                                        <SelectItem value="SHOES">Shoes</SelectItem>
                                        <SelectItem value="AUTO_PARTS">Auto Parts</SelectItem>
                                        <SelectItem value="COSMETICS">Cosmetics</SelectItem>
                                        <SelectItem value="BOOKS">Books</SelectItem>
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

                    <Card className="shadow-lg border-primary/20">
                        <CardHeader>
                            <CardTitle>Step 2: Official Breakdown</CardTitle>
                            <CardDescription>Estimated charges from JCA.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {calculation.calculated ? (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between p-2 rounded-md bg-secondary/50">
                                        <span className="text-sm font-medium">Currency: {displayCurrency}</span>
                                        <Switch
                                            checked={displayCurrency === 'JMD'}
                                            onCheckedChange={(checked) => setDisplayCurrency(checked ? 'JMD' : 'USD')}
                                        />
                                    </div>

                                    {calculation.isDutyFree ? (
                                        <Alert className="bg-green-50 border-green-200">
                                            <Info className="h-4 w-4 text-green-600" />
                                            <AlertTitle className="text-green-800">Duty Free Shipment</AlertTitle>
                                            <AlertDescription className="text-green-700">
                                                Since your item is $100 USD or less, you don't pay customs duties!
                                            </AlertDescription>
                                        </Alert>
                                    ) : (
                                        <TooltipProvider>
                                            <div className="space-y-4">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground flex items-center gap-1">
                                                        CIF Value
                                                        <Tooltip>
                                                            <TooltipTrigger><HelpCircle className="h-3 w-3" /></TooltipTrigger>
                                                            <TooltipContent>Value used for calculations (Cost + Ins. + Estimated Freight)</TooltipContent>
                                                        </Tooltip>
                                                    </span>
                                                    <span className="font-semibold">{formatCurrency(calculation.cif)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Import Duty</span>
                                                    <span className="font-semibold">{formatCurrency(calculation.importDuty)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">SCF (Compliance)</span>
                                                    <span className="font-semibold">{formatCurrency(calculation.scf)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">CAF (Admin Fee)</span>
                                                    <span className="font-semibold">{formatCurrency(calculation.caf)}</span>
                                                </div>
                                                <Separator />
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xl font-bold">Total Estimate</span>
                                                    <span className="text-3xl font-extrabold text-primary">{formatCurrency(calculation.total)}</span>
                                                </div>
                                            </div>
                                        </TooltipProvider>
                                    )}
                                    <p className="text-[11px] text-muted-foreground italic leading-relaxed">
                                        Note: This estimate uses official logic. Actual charges may vary based on exchange rates and officer valuation.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground space-y-4 border-2 border-dashed rounded-lg">
                                    <Calculator className="h-12 w-12 opacity-20" />
                                    <p>Enter your package details to see the estimate.</p>
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
