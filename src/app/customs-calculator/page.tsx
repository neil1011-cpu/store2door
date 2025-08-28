
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
import { ArrowLeft, Calculator } from 'lucide-react';
import Link from 'next/link';

// Note: These are simplified, estimated rates for demonstration purposes.
const IMPORT_DUTY_RATE = 0.20; // 20%
const CUSTOMS_ADMIN_FEE_RATE = 0.05; // 5%
const GCT_RATE = 0.15; // 15%

export default function CustomsCalculatorPage() {
  const [itemCost, setItemCost] = useState('');
  const [shippingCost, setShippingCost] = useState('');
  const [insuranceCost, setInsuranceCost] = useState('');

  const [calculation, setCalculation] = useState({
    cif: 0,
    importDuty: 0,
    customsAdminFee: 0,
    gct: 0,
    total: 0,
    calculated: false,
  });

  const handleCalculate = () => {
    const cost = parseFloat(itemCost) || 0;
    const shipping = parseFloat(shippingCost) || 0;
    const insurance = parseFloat(insuranceCost) || 0;

    const cif = cost + shipping + insurance;
    const importDuty = cif * IMPORT_DUTY_RATE;
    const customsAdminFee = cif * CUSTOMS_ADMIN_FEE_RATE;
    
    const taxableValueForGCT = cif + importDuty + customsAdminFee;
    const gct = taxableValueForGCT * GCT_RATE;
    
    const total = cif + importDuty + customsAdminFee + gct;

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
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Enter Shipment Details</CardTitle>
            <CardDescription>All values should be in USD.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="item-cost">Cost of Item(s)</Label>
              <Input
                id="item-cost"
                type="number"
                placeholder="e.g., 150.00"
                value={itemCost}
                onChange={(e) => setItemCost(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipping-cost">Shipping Cost</Label>
              <Input
                id="shipping-cost"
                type="number"
                placeholder="e.g., 25.00"
                value={shippingCost}
                onChange={(e) => setShippingCost(e.target.value)}
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="insurance-cost">Insurance Cost</Label>
              <Input
                id="insurance-cost"
                type="number"
                placeholder="e.g., 5.00"
                value={insuranceCost}
                onChange={(e) => setInsuranceCost(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleCalculate}>
              <Calculator className="mr-2 h-4 w-4" />
              Calculate
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Estimated Costs</CardTitle>
            <CardDescription>
              A breakdown of estimated customs charges.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {calculation.calculated ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-muted-foreground">CIF (Cost, Insurance, Freight)</span>
                  <span className="font-medium">{formatCurrency(calculation.cif)}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-muted-foreground">Import Duty (20%)</span>
                  <span className="font-medium">{formatCurrency(calculation.importDuty)}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-muted-foreground">Customs Admin Fee (5%)</span>
                  <span className="font-medium">{formatCurrency(calculation.customsAdminFee)}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-muted-foreground">GCT (15%)</span>
                  <span className="font-medium">{formatCurrency(calculation.gct)}</span>
                </div>
                <div className="flex justify-between items-center pt-4 text-lg">
                  <span className="font-bold">Estimated Total</span>
                  <span className="font-bold text-primary">{formatCurrency(calculation.total)}</span>
                </div>
                 <p className="text-xs text-muted-foreground pt-4">
                    Disclaimer: This is an estimate only. Actual charges may vary. The calculation does not include local courier fees.
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
