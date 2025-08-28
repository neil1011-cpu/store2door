
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
import { ArrowLeft, Calculator, Dices } from 'lucide-react';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

// Note: These are simplified, estimated rates for demonstration purposes,
// reflecting common categories under Jamaican customs policy.
const CUSTOMS_RATES = {
  GENERAL: { duty: 0.20, gct: 0.15 },
  ELECTRONICS: { duty: 0.20, gct: 0.25 },
  CLOTHING: { duty: 0.20, gct: 0.25 },
  BOOKS: { duty: 0, gct: 0 },
  AUTO_PARTS: { duty: 0.20, gct: 0.25 },
  COSMETICS: { duty: 0.20, gct: 0.25 },
};
const CUSTOMS_ADMIN_FEE_RATE = 0.075; // Standard CAF is 7.5%
const ASSUMED_INSURANCE_RATE = 0.01; // Assume 1% of item cost for insurance
const USD_TO_JMD_RATE = 157.5; // Static exchange rate for conversion

type Category = keyof typeof CUSTOMS_RATES;

export default function CustomsCalculatorPage() {
  const [price, setPrice] = useState('');
  const [weight, setWeight] = useState('');
  const [shipping, setShipping] = useState('');
  const [category, setCategory] = useState<Category>('GENERAL');
  const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'JMD'>('USD');

  const [calculation, setCalculation] = useState({
    cif: 0,
    importDuty: 0,
    customsAdminFee: 0,
    gct: 0,
    total: 0,
    calculated: false,
  });

  const handleCalculate = () => {
    const itemPrice = parseFloat(price) || 0;
    const shippingCost = parseFloat(shipping) || 0;
    
    // Insurance is often calculated on the item price if not provided.
    const insuranceCost = itemPrice * ASSUMED_INSURANCE_RATE;
    
    // CIF = Cost + Insurance + Freight
    const cif = itemPrice + insuranceCost + shippingCost;
    
    const rates = CUSTOMS_RATES[category];
    const importDuty = cif * rates.duty;
    const customsAdminFee = cif * CUSTOMS_ADMIN_FEE_RATE;
    
    // GCT is levied on the CIF value plus all other duties and fees.
    const taxableValueForGCT = cif + importDuty + customsAdminFee;
    const gct = taxableValueForGCT * rates.gct;
    
    const total = importDuty + customsAdminFee + gct;

    setCalculation({
      cif,
      importDuty,
      customsAdminFee,
      gct,
      total,
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
            Estimate Jamaican customs fees for your shipments.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <Card>
          <CardHeader>
            <CardTitle>Shipment Details</CardTitle>
            <CardDescription>Enter the details of your item below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (USD)</Label>
              <Input
                id="price"
                type="number"
                placeholder="e.g., 150.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
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
              <Label htmlFor="category">Category</Label>
              <Select onValueChange={(value: Category) => setCategory(value)} defaultValue={category}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL">General Items</SelectItem>
                  <SelectItem value="ELECTRONICS">Electronics</SelectItem>
                  <SelectItem value="CLOTHING">Clothing & Accessories</SelectItem>
                  <SelectItem value="AUTO_PARTS">Auto Parts</SelectItem>
                  <SelectItem value="COSMETICS">Cosmetics</SelectItem>
                  <SelectItem value="BOOKS">Books (Duty Free)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleCalculate}>
              <Calculator className="mr-2 h-4 w-4" />
              Calculate
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex flex-col sticky top-6">
          <CardHeader>
            <CardTitle>Estimated Costs</CardTitle>
            <CardDescription>
              A breakdown of estimated customs charges.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {calculation.calculated ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="currency-toggle" className="text-base">
                      Display in {displayCurrency}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                        Toggle to switch between USD and JMD.
                    </p>
                  </div>
                  <Switch
                    id="currency-toggle"
                    checked={displayCurrency === 'JMD'}
                    onCheckedChange={(checked) => setDisplayCurrency(checked ? 'JMD' : 'USD')}
                  />
                </div>

                <div className="flex justify-between items-center border-b pb-2 text-sm">
                  <span className="text-muted-foreground">CIF Value (Cost, Insurance, Freight)</span>
                  <span className="font-medium">{formatCurrency(calculation.cif)}</span>
                </div>
                 <div className="space-y-2 pt-2">
                    <h4 className="font-medium">Duties & Fees Breakdown:</h4>
                    <div className="flex justify-between items-center pl-4 text-sm">
                        <span className="text-muted-foreground">Import Duty</span>
                        <span className="font-medium">{formatCurrency(calculation.importDuty)}</span>
                    </div>
                     <div className="flex justify-between items-center pl-4 text-sm">
                        <span className="text-muted-foreground">Customs Admin. Fee (CAF)</span>
                        <span className="font-medium">{formatCurrency(calculation.customsAdminFee)}</span>
                    </div>
                     <div className="flex justify-between items-center pl-4 text-sm">
                        <span className="text-muted-foreground">General Consumption Tax (GCT)</span>
                        <span className="font-medium">{formatCurrency(calculation.gct)}</span>
                    </div>
                </div>

                <Separator />
                
                <div className="flex justify-between items-center pt-2 text-lg">
                  <span className="font-bold">Total Estimated Duties</span>
                  <span className="font-bold text-primary">{formatCurrency(calculation.total)}</span>
                </div>
                 <p className="text-xs text-muted-foreground pt-4">
                    Disclaimer: This is an estimate only and does not include local freight or courier fees. Actual charges from the Jamaica Customs Agency may vary. Insurance is estimated at 1% of the item price. Exchange rate is an estimate.
                </p>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <p>Enter shipment details to see the cost estimate.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

