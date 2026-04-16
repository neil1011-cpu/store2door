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
import { ArrowLeft, Calculator, Info, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Official-aligned Jamaica Customs Rates
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

export default function AdminCustomsCalculatorPage() {
  const [price, setPrice] = useState('');
  const [weight, setWeight] = useState('');
  const [category, setCategory] = useState<Category>('GENERAL');
  const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'JMD'>('USD');

  const [calculation, setCalculation] = useState({
    cost: 0,
    insurance: 0,
    freight: 0,
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
    
    // 1. Threshold Check (De Minimis)
    if (itemPrice <= DE_MINIMIS_THRESHOLD) {
        setCalculation({
            cost: itemPrice,
            insurance: 0,
            freight: shippingCost,
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

    // 2. CIF = Cost + Insurance + Freight
    const insurance = itemPrice * INSURANCE_RATE;
    const cif = itemPrice + insurance + shippingCost;
    
    // 3. Import Duty (ID)
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
      cost: itemPrice,
      insurance,
      freight: shippingCost,
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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customs Calculator</h1>
          <p className="text-muted-foreground">
            Official Jamaica Customs Agency (JCA) Calculation Logic.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <Card>
          <CardHeader>
            <CardTitle>Item Details</CardTitle>
            <CardDescription>Enter the item value and weight to estimate charges.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="price">Item Value (USD)</Label>
              <Input
                id="price"
                type="number"
                placeholder="e.g., 150.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Items under $100 USD value (excluding freight) are duty-free.
              </p>
            </div>
            <div className="space-y-2">
                <Label htmlFor="weight">Weight (lbs)</Label>
                <Input
                    id="weight"
                    type="number"
                    placeholder="e.g., 5"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Item Category</Label>
              <Select onValueChange={(value: Category) => setCategory(value)} defaultValue={category}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL">General Items (20% Duty)</SelectItem>
                  <SelectItem value="LAPTOPS_TABLETS">Laptops & Tablets (0% Duty)</SelectItem>
                  <SelectItem value="COMPUTERS">Computers (0% Duty)</SelectItem>
                  <SelectItem value="CELL_PHONES">Cell Phones (20% Duty)</SelectItem>
                  <SelectItem value="CLOTHING">Clothing (20% Duty)</SelectItem>
                  <SelectItem value="SHOES">Shoes (20% Duty)</SelectItem>
                  <SelectItem value="AUTO_PARTS">Auto Parts (30% Duty)</SelectItem>
                  <SelectItem value="COSMETICS">Cosmetics (20% Duty)</SelectItem>
                  <SelectItem value="BOOKS">Books (Duty Free)</SelectItem>
                  <SelectItem value="ELECTRONICS_OTHER">Other Electronics (20% Duty)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleCalculate} className="w-full">
              <Calculator className="mr-2 h-4 w-4" />
              Calculate Estimate
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex flex-col sticky top-6">
          <CardHeader>
            <CardTitle>Calculation Result</CardTitle>
            <CardDescription>
              Step-by-step breakdown of JCA charges.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {calculation.calculated ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/50">
                  <div className="space-y-0.5">
                    <Label htmlFor="currency-toggle" className="text-sm font-semibold">
                      Display Currency: {displayCurrency}
                    </Label>
                  </div>
                  <Switch
                    id="currency-toggle"
                    checked={displayCurrency === 'JMD'}
                    onCheckedChange={(checked) => setDisplayCurrency(checked ? 'JMD' : 'USD')}
                  />
                </div>

                {calculation.isDutyFree ? (
                    <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-900">
                        <Info className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <AlertTitle>Duty Free!</AlertTitle>
                        <AlertDescription>
                            This item is at or under the $100 USD de minimis threshold. No duties apply.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <div className="space-y-3">
                        <TooltipProvider>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                        CIF Value (Base)
                                        <Tooltip>
                                            <TooltipTrigger><HelpCircle className="h-3 w-3" /></TooltipTrigger>
                                            <TooltipContent>Cost + Insurance (1.5%) + Estimated Freight</TooltipContent>
                                        </Tooltip>
                                    </span>
                                    <span className="font-medium">{formatCurrency(calculation.cif)}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Import Duty (ID)</span>
                                    <span className="font-medium">{formatCurrency(calculation.importDuty)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Standard Compliance (SCF)</span>
                                    <span className="font-medium">{formatCurrency(calculation.scf)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Customs Admin Fee (CAF)</span>
                                    <span className="font-medium">{formatCurrency(calculation.caf)}</span>
                                </div>
                            </div>
                        </TooltipProvider>
                        <Separator className="h-0.5" />
                        <div className="flex justify-between items-center pt-2">
                            <span className="text-lg font-bold">Total Estimate</span>
                            <span className="text-2xl font-bold text-primary">{formatCurrency(calculation.total)}</span>
                        </div>
                    </div>
                )}
                
                 <p className="text-[10px] text-muted-foreground pt-4 leading-relaxed">
                    Disclaimer: This is an automated estimate. Actual charges are determined by Jamaica Customs at clearance and may vary. (Exchange Rate: 1 USD = 156 JMD).
                </p>
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center text-muted-foreground text-center italic">
                <p>Enter details and click calculate to see the official breakdown.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
