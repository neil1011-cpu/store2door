
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
import { ArrowLeft, Calculator, Info, Truck, DollarSign, Weight } from 'lucide-react';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Official Jamaica Customs Rates
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

// Official Shipping Rates (JMD)
const pricingTiers: Record<number, number> = {
    1: 750, 2: 1200, 3: 1650, 4: 2100, 5: 2550,
    6: 3000, 7: 3450, 8: 3900, 9: 4350, 10: 4850,
    23: 9900, 24: 10200, 25: 10500, 26: 10850, 
    27: 11200, 28: 11550, 29: 11900, 30: 12250
};

type Category = keyof typeof CUSTOMS_RATES;

export default function AdminCustomsCalculatorPage() {
  const [price, setPrice] = useState('');
  const [weight, setWeight] = useState('');
  const [category, setCategory] = useState<Category>('GENERAL');
  const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'JMD'>('JMD');

  const [calculation, setCalculation] = useState({
    cost: 0,
    insurance: 0,
    freight: 0,
    cif: 0,
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
        priceJMD = 12250; // Fallback
    }

    return priceJMD / USD_TO_JMD_RATE; // Return in USD for internal CIF calculation
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
    
    if (itemPrice <= DE_MINIMIS_THRESHOLD) {
        setCalculation({
            cost: itemPrice,
            insurance: 0,
            freight: shippingCostUsd,
            cif: itemPrice + shippingCostUsd,
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

    const insurance = itemPrice * INSURANCE_RATE;
    const cif = itemPrice + insurance + shippingCostUsd;
    const rates = CUSTOMS_RATES[category];
    const importDuty = cif * rates.duty;
    const scf = cif * SCF_RATE;
    const cafJmd = getCAF(itemPrice);
    const cafUsd = cafJmd / USD_TO_JMD_RATE;
    const customsTotal = importDuty + scf + cafUsd;
    const total = shippingCostUsd + customsTotal;

    setCalculation({
      cost: itemPrice,
      insurance,
      freight: shippingCostUsd,
      cif,
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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customs Calculator</h1>
          <p className="text-muted-foreground">
            Official Jamaica Customs Agency (JCA) Logic + FromStore2Door Shipping Rates.
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
            <CardTitle>Step 1: Item Details</CardTitle>
            <CardDescription>Enter the item value and weight to estimate the total landed cost.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="price">Item Value (USD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    id="price"
                    type="number"
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Items under $100 USD value (excluding freight) are duty-free.
              </p>
            </div>
            <div className="space-y-2">
                <Label htmlFor="weight">Weight (lbs)</Label>
                <div className="relative">
                    <Weight className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="weight"
                        type="number"
                        placeholder="0.00"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <p className="text-xs text-muted-foreground">Used to automatically calculate shipping rates.</p>
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
            <Button onClick={handleCalculate} className="w-full" size="lg">
              <Calculator className="mr-2 h-4 w-4" />
              Calculate Total Estimate
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex flex-col sticky top-6 border-primary/20 shadow-md">
          <CardHeader className="bg-muted/30">
            <CardTitle>Step 2: Landed Cost Breakdown</CardTitle>
            <CardDescription>
              A complete summary of shipping fees and customs charges.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pt-6">
            {calculation.calculated ? (
              <div className="space-y-6">
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

                <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            Shipping Cost (Freight)
                        </span>
                        <span className="font-bold">{formatCurrency(calculation.freight)}</span>
                    </div>
                    
                    <Separator />

                    {calculation.isDutyFree ? (
                        <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-900">
                            <Info className="h-4 w-4 text-green-600 dark:text-green-400" />
                            <AlertTitle>Customs Duty Free!</AlertTitle>
                            <AlertDescription className="text-xs">
                                Value is $100 USD or less. No customs duties apply.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="space-y-3 bg-secondary/20 p-4 rounded-lg">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customs Charges</p>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Import Duty (ID)</span>
                                <span className="font-medium">{formatCurrency(calculation.importDuty)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Standard Compliance (SCF)</span>
                                <span className="font-medium">{formatCurrency(calculation.scf)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Admin Fee (CAF)</span>
                                <span className="font-medium">{formatCurrency(calculation.caf)}</span>
                            </div>
                            <Separator className="bg-muted-foreground/20" />
                            <div className="flex justify-between items-center text-sm font-semibold">
                                <span>Customs Subtotal</span>
                                <span>{formatCurrency(calculation.customsTotal)}</span>
                            </div>
                        </div>
                    )}
                    
                    <div className="rounded-xl border-2 border-primary/20 p-6 bg-primary/5 text-center">
                        <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-2 block">Grand Total Estimate</span>
                        <span className="text-5xl font-black text-primary tracking-tighter">
                            {formatCurrency(calculation.total)}
                        </span>
                        <p className="text-[10px] text-muted-foreground mt-4">
                            Exchange Rate Used: 1 USD = {USD_TO_JMD_RATE} JMD.
                        </p>
                    </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-64 items-center justify-center text-muted-foreground text-center space-y-4">
                <Calculator className="h-12 w-12 opacity-20" />
                <p className="italic max-w-[200px]">Enter package price and weight to see the full breakdown.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
