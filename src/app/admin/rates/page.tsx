
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Trash2, PlusCircle, Edit, Check } from 'lucide-react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type PricingTier = {
    weight: number;
    price: number;
};

const initialPricingTiers: PricingTier[] = [
    { weight: 1, price: 750 },
    { weight: 2, price: 1200 },
    { weight: 3, price: 1650 },
    { weight: 4, price: 2100 },
    { weight: 5, price: 2550 },
    { weight: 6, price: 3000 },
    { weight: 7, price: 3450 },
    { weight: 8, price: 3900 },
    { weight: 9, price: 4350 },
    { weight: 10, price: 4850 },
    { weight: 23, price: 9900 },
    { weight: 24, price: 10200 },
    { weight: 25, price: 10500 },
    { weight: 26, price: 10850 },
    { weight: 27, price: 11200 },
    { weight: 28, price: 11550 },
    { weight: 29, price: 11900 },
    { weight: 30, price: 12250 },
];

export default function RatesPage() {
  const { toast } = useToast();
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>(initialPricingTiers);
  const [isLoaded, setIsLoaded] = useState(false);
  const [editingWeight, setEditingWeight] = useState<number | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  
  useEffect(() => {
    try {
      const savedTiers = localStorage.getItem('pricingTiers');
      if (savedTiers) {
        setPricingTiers(JSON.parse(savedTiers));
      }
    } catch (error) {
        toast({
            title: 'Error loading settings',
            description: 'Could not load your saved rates. Reverting to defaults.',
            variant: 'destructive'
        })
    }
    setIsLoaded(true);
  }, [toast]);
  
  const saveTiers = useCallback((tiers: PricingTier[]) => {
      if (!isLoaded) return;
      try {
          localStorage.setItem('pricingTiers', JSON.stringify(tiers));
      } catch (error) {
           toast({
            title: 'Error saving rates',
            variant: 'destructive'
        })
      }
  }, [isLoaded, toast]);

  const handleEdit = (tier: PricingTier) => {
    setEditingWeight(tier.weight);
    setCurrentPrice(tier.price);
  };

  const handleSave = (weight: number) => {
    const updatedTiers = pricingTiers.map(t => 
        t.weight === weight ? { ...t, price: currentPrice } : t
    );
    setPricingTiers(updatedTiers);
    saveTiers(updatedTiers);
    setEditingWeight(null);
    toast({
        title: "Rate Updated",
        description: `Price for ${weight} lb(s) has been updated.`
    });
  };

  const handleCancel = () => {
    setEditingWeight(null);
  }
  
  const handleDelete = (weight: number) => {
    const updatedTiers = pricingTiers.filter(t => t.weight !== weight);
    setPricingTiers(updatedTiers);
    saveTiers(updatedTiers);
     toast({
        title: "Rate Deleted",
        description: `The pricing tier for ${weight} lb(s) has been removed.`
    });
  };


  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Courier Rate Management</h1>
          <p className="text-muted-foreground">Adjust pricing for different weight tiers.</p>
        </div>
        <Button variant="outline" asChild>
            <Link href="/admin">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
            </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pricing Tiers (JMD)</CardTitle>
          <CardDescription>Set the shipping cost for each weight bracket. All weights are in pounds (lbs).</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[200px]">Weight (lbs)</TableHead>
                            <TableHead>Price (JMD)</TableHead>
                            <TableHead className="text-right w-[200px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {pricingTiers.sort((a, b) => a.weight - b.weight).map((tier) => (
                            <TableRow key={tier.weight}>
                                <TableCell className="font-medium">{tier.weight} lb</TableCell>
                                <TableCell>
                                    {editingWeight === tier.weight ? (
                                        <Input 
                                            type="number" 
                                            value={currentPrice} 
                                            onChange={(e) => setCurrentPrice(Number(e.target.value))}
                                            className="max-w-[150px]"
                                        />
                                    ) : (
                                        `$${tier.price.toLocaleString()}`
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                     {editingWeight === tier.weight ? (
                                        <div className="flex gap-2 justify-end">
                                            <Button size="sm" onClick={() => handleSave(tier.weight)}>
                                                <Check className="h-4 w-4" />
                                            </Button>
                                             <Button size="sm" variant="ghost" onClick={handleCancel}>
                                                Cancel
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2 justify-end">
                                            <Button size="sm" variant="outline" onClick={() => handleEdit(tier)}>
                                                <Edit className="mr-2 h-4 w-4" /> Edit
                                            </Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleDelete(tier.weight)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
           </div>
        </CardContent>
         <CardFooter className="border-t pt-6">
            <Button disabled>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Tier (coming soon)
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
