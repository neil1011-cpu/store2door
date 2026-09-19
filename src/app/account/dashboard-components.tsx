'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Zap, Calculator, Truck, DollarSign, Weight, Info, FileText, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { UserProfile, Shipment } from '@/lib/types';
import { useSupabase } from '@/components/supabase-provider';
import Link from 'next/link';
import { calculateShippingCost } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

const getStatusVariant = (status: string | undefined) => {
  const safeStatus = (status || 'Pending').toLowerCase();
  if (safeStatus.includes('transit') || safeStatus.includes('shipped')) return 'default';
  if (safeStatus.includes('delivered')) return 'outline';
  if (safeStatus.includes('pending') || safeStatus.includes('pre-alert')) return 'destructive';
  return 'secondary';
};

export function DashboardTab({ details }: { details: UserProfile }) {
  const { supabase } = useSupabase();
  const [recentShipment, setRecentShipment] = useState<Shipment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecent = async () => {
      const { data } = await supabase
        .from('shipments')
        .select('*')
        .eq('profile_id', details.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      setRecentShipment(data);
      setIsLoading(false);
    };
    fetchRecent();
  }, [details.id, supabase]);

  return (
    <Card className="border-none shadow-none sm:border sm:shadow-sm">
      <CardHeader>
        <CardTitle>Activity Overview</CardTitle>
        <CardDescription>Most recent transit updates.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
        ) : recentShipment ? (
          <div className="space-y-4">
            <div className="bg-muted/20 p-4 rounded-lg flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold uppercase opacity-60">Tracking Number</p>
                <p className="font-mono font-bold text-lg text-primary">{recentShipment.tracking_number || (recentShipment as any).trackingNumber}</p>
              </div>
              <Badge variant={getStatusVariant(recentShipment.status)}>{recentShipment.status}</Badge>
            </div>
            <Button variant="outline" className="w-full font-bold uppercase italic" asChild><Link href="/account/packages">View All Packages</Link></Button>
          </div>
        ) : (
          <div className="text-center py-10 opacity-40 italic text-sm">No active shipments in your registry.</div>
        )}
      </CardContent>
    </Card>
  );
}

export function PackagesTab({ profileId }: { profileId: string }) {
  const { supabase } = useSupabase();
  const [packages, setPackages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPackages = async () => {
      const { data: shipments } = await supabase.from('shipments').select('*').eq('profile_id', profileId);
      const { data: preAlerts } = await supabase.from('pre_alerts').select('*').eq('profile_id', profileId).eq('status', 'Pending');
      
      const combined = [
        ...(shipments || []).map(s => ({ ...s, type: 'shipment' })),
        ...(preAlerts || []).map(p => ({ ...p, type: 'pre-alert' }))
      ].sort((a, b) => {
        const dateA = a.shipping_date || a.submission_date || a.created_at;
        const dateB = b.shipping_date || b.submission_date || b.created_at;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });

      setPackages(combined);
      setIsLoading(false);
    };
    fetchPackages();
  }, [profileId, supabase]);

  return (
    <Card className="border-none shadow-none sm:border sm:shadow-sm">
      <CardHeader>
        <CardTitle>My Packages</CardTitle>
      </CardHeader>
      <CardContent className="px-0 sm:px-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px] font-black uppercase">Package</TableHead>
              <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase">Cost (JMD)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={3} className="text-center py-10"><Loader2 className="animate-spin mx-auto text-primary" /></TableCell></TableRow>
            ) : packages.map((pkg) => (
              <TableRow key={pkg.id}>
                <TableCell>
                  <p className="font-mono font-bold text-primary">{pkg.tracking_number || pkg.trackingNumber}</p>
                  <p className="text-[10px] uppercase opacity-60 truncate max-w-[150px]">{pkg.contents}</p>
                </TableCell>
                <TableCell><Badge variant={getStatusVariant(pkg.status)} className="text-[8px] font-black uppercase italic">{pkg.status}</Badge></TableCell>
                <TableCell className="text-right font-black italic tracking-tighter">
                  {pkg.total_cost_jmd ? `JMD $${pkg.total_cost_jmd.toLocaleString()}` : 'TBD'}
                </TableCell>
              </TableRow>
            ))}
            {packages.length === 0 && !isLoading && (
                <TableRow><TableCell colSpan={3} className="text-center py-20 opacity-30 italic">No package history found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function PreAlertTab({ profileId, onSuccess }: { profileId: string, onSuccess?: () => void }) {
    const { supabase, user } = useSupabase();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({ trackingNumber: '', contents: '', weight: '', file: null as File | null });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.trackingNumber || !formData.contents) return;
        setIsSubmitting(true);

        try {
            let finalKey = '';
            if (formData.file && user) {
                const session = (await supabase.auth.getSession()).data.session;
                const body = new FormData();
                body.append('file', formData.file);
                const res = await fetch('/api/storage/upload', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${session?.access_token}` },
                    body
                });
                const uploadData = await res.json();
                if (!res.ok) throw new Error(uploadData.message);
                finalKey = uploadData.key;
            }

            const { error } = await supabase.from('pre_alerts').insert({
                profile_id: profileId,
                tracking_number: formData.trackingNumber.toUpperCase(),
                contents: formData.contents,
                weight_lbs: parseFloat(formData.weight) || 0,
                invoice_url: finalKey, // We store the KEY in this column for proxy resolution
                status: 'Pending'
            });

            if (error) throw error;
            toast({ title: "Pre-Alert Submitted" });
            setFormData({ trackingNumber: '', contents: '', weight: '', file: null });
            onSuccess?.();
        } catch (err: any) {
            toast({ title: "Submission Failed", description: err.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase opacity-60">Tracking Number</Label>
                    <Input value={formData.trackingNumber} onChange={e => setFormData({...formData, trackingNumber: e.target.value})} placeholder="e.g. 1Z..." className="font-mono uppercase" required />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase opacity-60">Contents</Label>
                    <Input value={formData.contents} onChange={e => setFormData({...formData, contents: e.target.value})} placeholder="Shoes, etc." required />
                </div>
            </div>
            <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase opacity-60">Weight (LBS)</Label>
                <Input type="number" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} placeholder="0.00" />
            </div>
            <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase opacity-60">Invoice File</Label>
                <Input type="file" onChange={e => setFormData({...formData, file: e.target.files?.[0] || null})} />
            </div>
            <Button type="submit" className="w-full h-14 font-black uppercase italic shadow-lg" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Zap className="mr-2" />} Authorize Intake
            </Button>
        </form>
    );
}

export function AccountTab({ details }: { details: UserProfile }) {
    const { supabase } = useSupabase();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [phone, setPhone] = useState(details.phone || '');
    const [trn, setTrn] = useState(details.trn || '');

    const handleUpdate = async () => {
        setIsSaving(true);
        const { error } = await supabase.from('profiles').update({ phone, trn }).eq('id', details.id);
        if (error) toast({ title: "Update Failed", description: error.message, variant: "destructive" });
        else toast({ title: "Profile Secured" });
        setIsSaving(false);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="shadow-lg border-none overflow-hidden rounded-2xl">
                <CardHeader className="bg-primary text-primary-foreground">
                    <CardTitle className="text-xl font-black italic uppercase">Shipping Identity</CardTitle>
                </CardHeader>
                <CardContent className="p-6 font-mono space-y-4">
                    <div>
                        <p className="text-[10px] font-bold uppercase opacity-60">Full Name</p>
                        <p className="text-lg font-bold">{details.full_name}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase opacity-60">Mailbox Number</p>
                        <Badge className="text-lg px-4 font-black italic border-2">{details.mailbox_number}</Badge>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-md rounded-2xl">
                <CardHeader><CardTitle className="text-xs font-black uppercase tracking-widest italic">Personal Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase opacity-60">Phone Number</Label>
                        <Input value={phone} onChange={e => setPhone(e.target.value)} className="border-2" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase opacity-60">Tax Registration Number (TRN)</Label>
                        <Input value={trn} onChange={e => setTrn(e.target.value)} maxLength={9} className="border-2 font-mono" />
                    </div>
                    <Button onClick={handleUpdate} disabled={isSaving} className="w-full font-black uppercase italic shadow-lg">
                        {isSaving ? <Loader2 className="animate-spin" /> : "Save Changes"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

export function SupportTab() {
    return (
        <div className="max-w-2xl mx-auto py-10 space-y-8">
            <div className="text-center space-y-4">
                <h2 className="text-4xl font-black italic uppercase tracking-tighter">Worldwide Support</h2>
                <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Dedicated logistics lifeline.</p>
            </div>
            <div className="grid gap-4">
                <Button variant="outline" className="h-20 text-lg font-black uppercase italic border-2 shadow-sm" asChild>
                    <Link href="https://wa.me/18765069727" target="_blank">WhatsApp Hub</Link>
                </Button>
                <Button variant="outline" className="h-20 text-lg font-black uppercase italic border-2 shadow-sm" asChild>
                    <Link href="mailto:info@fromstore2door.com">Email Helpdesk</Link>
                </Button>
            </div>
        </div>
    );
}

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

export function CustomsCalculatorTab() {
  const [price, setPrice] = useState('');
  const [weight, setWeight] = useState('');
  const [category, setCategory] = useState<Category>('GENERAL');
  const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'JMD'>('JMD');

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
    const shippingCostJmd = calculateShippingCost(w);
    const shippingCostUsd = shippingCostJmd / USD_TO_JMD_RATE;
    
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-none shadow-md rounded-2xl">
            <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-widest italic">Package Details</CardTitle>
                <CardDescription>Official JCA Logic + FromStore2Door Rates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase opacity-60">Item Value (USD)</Label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="pl-10 h-12 border-2" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase opacity-60">Weight (LBS)</Label>
                    <div className="relative">
                        <Weight className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="pl-10 h-12 border-2" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase opacity-60">Category</Label>
                    <div className="relative">
                        <Select onValueChange={(v: Category) => setCategory(v)} defaultValue={category}>
                            <SelectTrigger className="h-12 border-2"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="GENERAL">General Items (20%)</SelectItem>
                                <SelectItem value="LAPTOPS_TABLETS">Laptops & Tablets (0%)</SelectItem>
                                <SelectItem value="SHOES">Shoes (20%)</SelectItem>
                                <SelectItem value="ELECTRONICS_OTHER">Electronics (20%)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleCalculate} className="w-full h-12 font-black uppercase italic shadow-xl">
                    Calculate Landed Cost
                </Button>
            </CardFooter>
        </Card>

        <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-primary text-primary-foreground">
                <CardTitle className="text-sm font-black uppercase tracking-[0.2em] italic">Landed Estimate</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                {calculation.calculated ? (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                            <span className="text-[10px] font-black uppercase">Currency: {displayCurrency}</span>
                            <Switch checked={displayCurrency === 'JMD'} onCheckedChange={c => setDisplayCurrency(c ? 'JMD' : 'USD')} />
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2"><Truck className="h-3 w-3" /> Shipping Fee</span>
                                <span className="font-black italic">{formatCurrency(calculation.freight)}</span>
                            </div>
                            <Separator />
                            {calculation.isDutyFree ? (
                                <Alert className="bg-green-50 border-green-200">
                                    <Info className="h-4 w-4 text-green-600" />
                                    <AlertTitle className="text-[10px] font-black uppercase text-green-800">Duty Free</AlertTitle>
                                    <AlertDescription className="text-[9px] uppercase font-bold text-green-700">Value is $100 USD or less.</AlertDescription>
                                </Alert>
                            ) : (
                                <div className="space-y-2 bg-muted/30 p-4 rounded-xl">
                                    <p className="text-[8px] font-black uppercase opacity-40 mb-2">Customs Breakdown</p>
                                    <div className="flex justify-between text-xs font-medium uppercase opacity-80">
                                        <span>Duty + Compliance</span>
                                        <span>{formatCurrency(calculation.importDuty + calculation.scf)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-medium uppercase opacity-80">
                                        <span>Admin Fee (CAF)</span>
                                        <span>{formatCurrency(calculation.caf)}</span>
                                    </div>
                                </div>
                            )}
                            <div className="bg-primary/5 p-6 rounded-2xl border-2 border-dashed border-primary/20 text-center">
                                <p className="text-[10px] font-black uppercase opacity-60 mb-1">Estimated Total</p>
                                <p className="text-5xl font-black italic tracking-tighter text-primary">{formatCurrency(calculation.total)}</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-muted-foreground opacity-20">
                        <Calculator className="h-12 w-12 mb-2" />
                        <p className="font-black uppercase text-xs italic">Enter details to calculate</p>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
