
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function RatesPage() {
  const { toast } = useToast();
  const [ratePerPound, setRatePerPound] = useState(4.8077);
  const [roundToNearestPound, setRoundToNearestPound] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedRate = localStorage.getItem('ratePerPound');
      const savedRounding = localStorage.getItem('roundToNearestPound');

      if (savedRate) {
        setRatePerPound(JSON.parse(savedRate));
      }
      if (savedRounding) {
        setRoundToNearestPound(JSON.parse(savedRounding));
      }
    } catch (error) {
        toast({
            title: 'Error loading settings',
            description: 'Could not load your saved settings. Reverting to defaults.',
            variant: 'destructive'
        })
    }
    setIsLoaded(true);
  }, [toast]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('ratePerPound', JSON.stringify(ratePerPound));
      toast({
        title: 'Rate Updated',
        description: `Rate per pound is now $${ratePerPound.toFixed(2)}.`,
      });
    } catch (error) {
        toast({
            title: 'Error saving rate',
            variant: 'destructive'
        })
    }
  }, [ratePerPound, isLoaded, toast]);
  
  useEffect(() => {
    if (!isLoaded) return;
    try {
        localStorage.setItem('roundToNearestPound', JSON.stringify(roundToNearestPound));
        toast({
            title: 'Rounding Setting Updated',
            description: `Rounding is now ${roundToNearestPound ? 'enabled' : 'disabled'}.`
        });
    } catch (error) {
         toast({
            title: 'Error saving rounding preference',
            variant: 'destructive'
        })
    }
  }, [roundToNearestPound, isLoaded, toast]);


  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Courier Rate Management</h1>
          <p className="text-muted-foreground">Adjust pricing per pound and rounding options.</p>
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
          <CardTitle>Rates and Rounding</CardTitle>
          <CardDescription>Set your courier rates and rounding preferences. Changes are saved automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="rate-per-pound">Rate per Pound ($ USD)</Label>
                 <div className="flex items-center gap-2 max-w-sm">
                    <Input
                        id="rate-per-pound"
                        type="number"
                        value={ratePerPound}
                        onChange={(e) => setRatePerPound(Number(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        disabled={!isLoaded}
                    />
                 </div>
            </div>
             <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="round-off" className="text-base">
                  Round to Nearest Pound
                </Label>
                <p className="text-sm text-muted-foreground">
                    If enabled, the total weight will be rounded up to the nearest whole pound.
                </p>
              </div>
              <Switch
                id="round-off"
                checked={roundToNearestPound}
                onCheckedChange={setRoundToNearestPound}
                disabled={!isLoaded}
              />
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
