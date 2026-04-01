'use client';

import { useState } from 'react';
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
import { ArrowLeft, Calculator, Info } from 'lucide-react';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Official-aligned Jamaica Customs Rates (Approximate for commonly shipped items)
const CUSTOMS_RATES = {
  GENERAL: { duty: 0.20, gct: 0.15 },
  LAPTOPS_TABLETS: { duty: 0, gct: 0.15 },
  COMPUTERS: { duty: 0, gct: 0.15 },
  CELL_PHONES: { duty: 0.20, gct: 0.15 },
  CLOTHING: { duty: 0.20, gct: 0.15 },
  SHOES: { duty: 0.20, gct: 0.15 },
  AUTO_PARTS: { duty: 0.30, gct: 0.15 },
  COSMETICS: { duty: 0.20, gct: 0.15 },
  BOOKS: { duty: 0, gct: 0 },
  ELECTRONICS_OTHER: { duty: 0.20, gct: 0.15 },
};

const USD_TO_JMD_RATE = 156; 
const DE_MINIMIS_THRESHOLD = 100; // New JCA limit for duty-free personal imports
const INSURANCE_RATE = 0.015; // JCA standard is 1.5% if not provided
const SCF_RATE = 0.003; // Standard Compliance Fee 0.3%

type Category = keyof typeof CUSTOMS_RATES;

export default function AdminCustomsCalculatorPage() {
  const [price, setPrice] = useState('');
  const [shipping, setShipping] = useState('');
  const [category, setCategory] = useState<Category>('GENERAL');
  const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'JMD'>('USD');

  const [calculation, setCalculation] = useState({
    cif: 0,
    importDuty: 0,
    scf: 0,
    caf: 0,
    gct: 0,
    total: 0,
    isDutyFree: false,
    calculated: false,
  });

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
    const shippingCost = parseFloat(shipping) || 0;
    
    // 1. Threshold Check
    if (itemPrice <= DE_MINIMIS_THRESHOLD) {
        setCalculation({
            cif: itemPrice + shippingCost,
            importDuty: 0,
            scf: 0,
            caf: 0,
            gct: 0,
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

    // 4. SCF
    const scf = cif * SCF_RATE;

    // 5. CAF (Customs Admin Fee) - calculated in JMD then converted if needed
    const cafJmd = getCAF(itemPrice);
    const cafUsd = cafJmd / USD_TO_JMD_RATE;

    // 6. GCT = (CIF + ID + SCF + CAF) * GCT_Rate
    const taxableValueForGCT = cif + importDuty + scf + cafUsd;
    const gct = taxableValueForGCT * rates.gct;
    
    const total = importDuty + scf + cafUsd + gct;

    setCalculation({
      cif,
      importDuty,
      scf,
      caf: cafUsd,
      gct,
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
            Aligned with Jamaica Customs Agency (JCA) regulations.
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
            <CardDescription>Enter the item value and shipping cost in USD.</CardDescription>
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
                Items under $100 USD (value only) are usually duty-free.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipping">Shipping Cost (USD)</Label>
              <Input
                id="shipping"
                type="number"
                placeholder="e.g., 25.00"
                value={shipping}
                onChange={(e) => setShipping(e.target.value)}
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
              Breakdown of estimated JCA charges.
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
                            This item is under the $100 USD threshold. No customs duties apply.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">CIF Value (Cost + Ins. + Freight)</span>
                            <span className="font-medium">{formatCurrency(calculation.cif)}</span>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Import Duty (ID)</span>
                                <span className="font-medium">{formatCurrency(calculation.importDuty)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Standard Compliance Fee (SCF)</span>
                                <span className="font-medium">{formatCurrency(calculation.scf)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Customs Admin Fee (CAF)</span>
                                <span className="font-medium">{formatCurrency(calculation.caf)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">GCT (15%)</span>
                                <span className="font-medium">{formatCurrency(calculation.gct)}</span>
                            </div>
                        </div>
                        <Separator className="h-0.5" />
                        <div className="flex justify-between items-center pt-2">
                            <span className="text-lg font-bold">Total Estimated Duties</span>
                            <span className="text-2xl font-bold text-primary">{formatCurrency(calculation.total)}</span>
                        </div>
                    </div>
                )}
                
                 <p className="text-[10px] text-muted-foreground pt-4 leading-relaxed">
                    Disclaimer: This is an automated estimate for informational purposes only. Actual charges are determined by the Jamaica Customs Agency at the time of clearance and may vary based on item valuation, specific tariff codes, and exchange rate fluctuations. 1 USD = 156 JMD used for this calculation.
                </p>
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center text-muted-foreground text-center italic">
                <p>Enter details and click calculate to see the breakdown.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
