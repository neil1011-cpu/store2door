'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Zap, Calculator, Truck, DollarSign, Weight, Info, FileText, Download, MapPin, Copy, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { UserProfile, Shipment } from '@/lib/types';
import { useSupabase } from '@/components/supabase-provider';
import Link from 'next/link';
import { calculateShippingCost, shouldShowPrice } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

const getStatusVariant = (status: string | undefined) => {
  const safeStatus = (status || 'Pending').toLowerCase();
  if (safeStatus.includes('transit') || safeStatus.includes('shipped') || safeStatus.includes('delivery') || safeStatus.includes('pick up')) return 'default';
  if (safeStatus.includes('delivered')) return 'outline';
  if (safeStatus.includes('pending') || safeStatus.includes('pre-alert') || safeStatus.includes('hold')) return 'destructive';
  if (safeStatus.includes('returned')) return 'secondary';
  return 'secondary';
};

/**
 * Reusable card for displaying the US Warehouse address.
 */
export function WarehouseAddressCard({ details }: { details: UserProfile }) {
  const { toast } = useToast();
  
  const copyAddress = () => {
    const address = `${details.full_name}\n3507 NW 19th ST\n${details.mailbox_number}\nLauderdale Lake, FL 33311-4224`;
    navigator.clipboard.writeText(address);
    toast({ title: "Address Copied", description: "Ready to paste at checkout." });
  };

  return (
    <Card className="border-2 shadow-xl bg-card text-card-foreground overflow-hidden rounded-2xl group">
      <CardHeader className="bg-primary/5 pb-4 border-b flex flex-row items-center justify-between">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-primary">
          <MapPin className="h-4 w-4" /> Your US Shipping Address
        </CardTitle>
        <Button variant="outline" size="sm" onClick={copyAddress} className="h-7 text-[8px] font-black uppercase border-2">
          <Copy className="h-3 w-3 mr-1" /> Copy All
        </Button>
      </CardHeader>
      <CardContent className="pt-6 space-y-4 font-mono">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-[9px] uppercase font-bold text-muted-foreground">Full Name</p>
              <p className="text-sm font-bold uppercase">{details.full_name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] uppercase font-bold text-muted-foreground">Address Line 1</p>
              <p className="text-sm font-bold uppercase">3507 NW 19th ST</p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] uppercase font-bold text-muted-foreground">Address Line 2 (Mailbox)</p>
              <p className="text-sm font-black uppercase text-primary bg-primary/10 px-2 py-0.5 rounded inline-block">{details.mailbox_number}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-[9px] uppercase font-bold text-muted-foreground">City</p>
              <p className="text-sm font-bold uppercase">Lauderdale Lake</p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] uppercase font-bold text-muted-foreground">State</p>
              <p className="text-sm font-bold uppercase">FL</p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] uppercase font-bold text-muted-foreground">Zip Code</p>
              <p className="text-sm font-bold uppercase">33311-4224</p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-muted/30 p-3 border-t">
        <p className="text-[8px] font-bold uppercase text-muted-foreground italic text-center w-full">
          IMPORTANT: Always include your mailbox number in Address Line 2.
        </p>
      </CardFooter>
    </Card>
  );
}

export function DashboardTab({ details }: { details: UserProfile }) {
  const { supabase } = useSupabase();
  const [recentShipment, setRecentShipment] = useState<Shipment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from('shipments')
      .select('*')
      .eq('profile_id', details.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    setRecentShipment(data);
    setIsLoading(false);
  }, [details.id, supabase]);

  useEffect(() => {
    fetchData();

    // Real-time synchronization
    const channel = supabase
        .channel(`dashboard-recent-updates-${details.id}`)
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'shipments', 
            filter: `profile_id=eq.${details.id}` 
        }, () => fetchData())
        .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [details.id, supabase, fetchData]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <WarehouseAddressCard details={details} />
      
      <Card className="border-2 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-black italic uppercase tracking-tighter">Activity Overview</CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Most recent transit updates.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
          ) : recentShipment ? (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-xl flex justify-between items-center border">
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase opacity-60">Tracking Number</p>
                  <div className="flex items-center gap-3">
                      <p className="font-mono font-bold text-lg text-primary">{recentShipment.tracking_number}</p>
                      {recentShipment.invoice_url && (
                          <Button variant="ghost" size="sm" asChild className="h-7 text-primary font-bold uppercase text-[9px] border-2 border-primary/10">
                              <Link href={`/api/storage/view?key=${encodeURIComponent(recentShipment.invoice_url)}`} target="_blank">
                                  <FileText className="h-3.5 w-3.5 mr-1" /> Doc
                              </Link>
                          </Button>
                      )}
                  </div>
                </div>
                <Badge variant={getStatusVariant(recentShipment.status)} className="font-black italic uppercase text-[9px] border-2 px-4 h-8">{recentShipment.status}</Badge>
              </div>
              <Button variant="outline" className="w-full font-bold uppercase italic border-2 h-12" asChild><Link href="/account/packages">View All Packages</Link></Button>
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground italic text-sm border-2 border-dashed rounded-xl">No active shipments in your registry.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function PackagesTab({ profileId }: { profileId: string }) {
  const { supabase } = useSupabase();
  const [packages, setPackages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPackages = useCallback(async () => {
    const { data: shipments } = await supabase.from('shipments').select('*').eq('profile_id', profileId);
    const { data: preAlerts } = await supabase.from('pre_alerts').select('*').eq('profile_id', profileId).eq('status', 'Pending');
    
    // Deduplicate: If an item is in both tables, prioritize the shipment
    const shipmentTrackingNumbers = new Set((shipments || []).map(s => s.tracking_number));
    const filteredPreAlerts = (preAlerts || []).filter(p => !shipmentTrackingNumbers.has(p.tracking_number));

    const combined = [
      ...(shipments || []).map(s => ({ ...s, type: 'shipment' })),
      ...filteredPreAlerts.map(p => ({ ...p, type: 'pre-alert' }))
    ].sort((a, b) => {
      const dateA = a.shipping_date || a.submission_date || a.created_at;
      const dateB = b.shipping_date || b.submission_date || b.created_at;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    setPackages(combined);
    setIsLoading(false);
  }, [profileId, supabase]);

  useEffect(() => {
    fetchPackages();

    // Real-time synchronization
    const channel = supabase
      .channel(`user-packages-sync-${profileId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'shipments', 
        filter: `profile_id=eq.${profileId}` 
      }, () => fetchPackages())
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'pre_alerts', 
        filter: `profile_id=eq.${profileId}` 
      }, () => fetchPackages())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profileId, supabase, fetchPackages]);

  return (
    <Card className="border-2 shadow-sm overflow-hidden rounded-2xl">
      <CardHeader className="bg-muted/10 border-b">
        <CardTitle className="text-xl font-black italic uppercase tracking-tighter">Package Registry</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="text-[10px] font-black uppercase pl-6">Package</TableHead>
              <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase">Invoice</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase pr-6">Cost (JMD)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-20"><Loader2 className="animate-spin mx-auto text-primary" /></TableCell></TableRow>
            ) : packages.map((pkg) => (
              <TableRow key={pkg.id} className="h-20 hover:bg-primary/5 transition-colors">
                <TableCell className="pl-6">
                  <div className="flex flex-col">
                    <p className="font-mono font-black text-primary text-sm tracking-tighter">{pkg.tracking_number}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] uppercase font-bold opacity-60 truncate max-w-[150px]">{pkg.contents || 'No Description'}</p>
                      {pkg.weight_lbs > 0 && <span className="text-[9px] font-bold text-muted-foreground bg-muted px-1.5 rounded">{pkg.weight_lbs} LBS</span>}
                    </div>
                  </div>
                </TableCell>
                <TableCell><Badge variant={getStatusVariant(pkg.status)} className="text-[8px] font-black uppercase italic tracking-widest border-2">{pkg.status}</Badge></TableCell>
                <TableCell className="text-right">
                    {pkg.invoice_url ? (
                        <Button variant="ghost" size="sm" asChild className="h-8 text-primary font-bold uppercase text-[9px] border border-primary/10">
                            <Link href={`/api/storage/view?key=${encodeURIComponent(pkg.invoice_url)}`} target="_blank">
                                <FileText className="h-3.5 w-3.5 mr-1" /> View
                            </Link>
                        </Button>
                    ) : (
                        <span className="text-[9px] opacity-20 italic">No File</span>
                    )}
                </TableCell>
                <TableCell className="text-right pr-6 font-black italic tracking-tighter text-lg">
                  {shouldShowPrice(pkg.status) ? (
                    pkg.total_cost_jmd ? `JMD $${pkg.total_cost_jmd.toLocaleString()}` : 'TBD'
                  ) : (
                    <span className="text-[8px] opacity-40 uppercase tracking-widest font-black">Updating...</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {packages.length === 0 && !isLoading && (
                <TableRow><TableCell colSpan={4} className="text-center py-20 opacity-30 italic">No package history found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function PreAlertTab({ profileId, mailbox, onSuccess }: { profileId: string, mailbox?: string, onSuccess?: () => void }) {
    const { supabase, user } = useSupabase();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formKey, setFormKey] = useState(0);
    const [formData, setFormData] = useState({ trackingNumber: '', contents: '', weight: '', file: null as File | null });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const tracking = formData.trackingNumber.trim().toUpperCase();
        const contents = formData.contents.trim();
        
        if (!tracking || !contents) {
            toast({ title: "Validation Error", description: "Tracking ID and Contents are mandatory.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);

        try {
            let finalKey = null;
            if (formData.file) {
                const { data: { session } } = await supabase.auth.getSession();
                const body = new FormData();
                body.append('file', formData.file);
                
                const res = await fetch('/api/storage/upload', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${session?.access_token}` },
                    body
                });
                
                const uploadData = await res.json();
                if (!res.ok) throw new Error(uploadData.message || "Failed to transmit documentation asset.");
                finalKey = uploadData.key;
            }

            const weightVal = parseFloat(formData.weight);
            const { data: alert, error } = await supabase.from('pre_alerts').insert({
                profile_id: profileId,
                tracking_number: tracking,
                contents: contents,
                weight_lbs: isNaN(weightVal) ? 0 : weightVal,
                invoice_url: finalKey,
                status: 'Pending'
            }).select().single();

            if (error) throw error;

            fetch('/api/admin/logicware-push-shipment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shipmentId: alert.id, type: 'pre-alert' })
            }).catch(lwErr => console.warn('[LOGICWARE_PUSH_FAIL]', lwErr));

            toast({ title: "Intake Authorized", description: "Florida warehouse notified successfully." });
            setFormData({ trackingNumber: '', contents: '', weight: '', file: null });
            setFormKey(prev => prev + 1);
            onSuccess?.();
        } catch (err: any) {
            toast({ title: "Authorization Denied", description: err.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form key={formKey} onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase opacity-60">Tracking Number</Label>
                    <Input value={formData.trackingNumber} onChange={e => setFormData({...formData, trackingNumber: e.target.value})} placeholder="e.g. 1Z..." className="font-mono uppercase h-12 border-2" required />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase opacity-60">Contents</Label>
                    <Input value={formData.contents} onChange={e => setFormData({...formData, contents: e.target.value})} placeholder="Shoes, etc." className="h-12 border-2" required />
                </div>
            </div>
            <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase opacity-60">Weight (LBS)</Label>
                <Input type="number" step="0.01" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} placeholder="0.00" className="h-12 border-2" />
            </div>
            <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase opacity-60">Invoice File (Max 500MB)</Label>
                <Input type="file" onChange={e => setFormData({...formData, file: e.target.files?.[0] || null})} accept="image/*,application/pdf" className="h-12 border-2 py-2" />
            </div>
            <Button type="submit" className="w-full h-16 font-black uppercase italic shadow-xl text-lg" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin mr-2 h-6 w-6" /> : <Zap className="mr-2 h-6 w-6" />} 
                {isSubmitting ? "Transmitting..." : "Authorize Intake"}
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
        try {
            const { error } = await supabase.from('profiles').update({ phone, trn }).eq('id', details.id);
            if (error) throw error;
            toast({ title: "Profile Secured" });
        } catch (err: any) {
            toast({ title: "Update Failed", description: err.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <WarehouseAddressCard details={details} />

            <Card className="border-2 shadow-md rounded-2xl">
                <CardHeader><CardTitle className="text-xl font-black uppercase tracking-tighter italic">Personal Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase opacity-60">Phone Number</Label>
                        <Input value={phone} onChange={e => setPhone(e.target.value)} className="border-2 h-12" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase opacity-60">Tax Registration Number (TRN)</Label>
                        <Input value={trn} onChange={e => setTrn(e.target.value)} maxLength={9} className="border-2 font-mono h-12" />
                    </div>
                    <Button onClick={handleUpdate} disabled={isSaving} className="w-full h-12 font-black uppercase italic shadow-lg">
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
                <h2 className="text-4xl font-black italic uppercase tracking-tighter text-foreground">Worldwide Support</h2>
                <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-[0.2em]">Dedicated logistics lifeline.</p>
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
  LAPTOP_TABLET: { duty: 0 },
  SHIRT: { duty: 0.20 },
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
        <Card className="border-2 shadow-md rounded-2xl">
            <CardHeader>
                <CardTitle className="text-xl font-black uppercase tracking-tighter italic">Package Details</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Official JCA Logic + FromStore2Door Rates</CardDescription>
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
            </CardContent>
            <CardFooter>
                <Button onClick={handleCalculate} className="w-full h-12 font-black uppercase italic shadow-xl">
                    Calculate Landed Cost
                </Button>
            </CardFooter>
        </Card>

        <Card className="border-2 shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-primary text-primary-foreground">
                <CardTitle className="text-sm font-black uppercase tracking-[0.2em] italic">Landed Estimate</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                {calculation.calculated ? (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border">
                            <span className="text-[10px] font-black uppercase">Display Currency: {displayCurrency}</span>
                            <Switch checked={displayCurrency === 'JMD'} onCheckedChange={c => setDisplayCurrency(c ? 'JMD' : 'USD')} />
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center px-2">
                                <span className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2"><Truck className="h-3 w-3" /> Shipping Fee</span>
                                <span className="font-black italic text-lg">{formatCurrency(calculation.freight)}</span>
                            </div>
                            <Separator />
                            {calculation.isDutyFree ? (
                                <Alert className="bg-green-50 border-green-200">
                                    <Info className="h-4 w-4 text-green-600" />
                                    <AlertTitle className="text-[10px] font-black uppercase text-green-800">Duty Free</AlertTitle>
                                    <AlertDescription className="text-[9px] uppercase font-bold text-green-700">Value is $100 USD or less.</AlertDescription>
                                </Alert>
                            ) : (
                                <div className="space-y-2 bg-muted/30 p-4 rounded-xl border border-dashed">
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
                            <div className="bg-primary/5 p-6 rounded-2xl border-4 border-dashed border-primary/20 text-center">
                                <p className="text-[10px] font-black uppercase opacity-60 mb-1">Estimated Total</p>
                                <p className="text-5xl font-black italic tracking-tighter text-primary">{formatCurrency(calculation.total)}</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-muted-foreground opacity-20 border-2 border-dashed rounded-xl">
                        <Calculator className="h-12 w-12 mb-2" />
                        <p className="font-black uppercase text-xs italic tracking-widest">Enter details to calculate</p>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
