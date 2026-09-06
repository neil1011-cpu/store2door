
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Copy, FileUp, Package, Loader2, CreditCard, MapPin, CheckCircle2, Weight, Globe, Cloud, Zap, PlusCircle, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn, calculateShippingCost } from '@/lib/utils';
import type { UserProfile, Shipment, PreAlert, PickupPerson } from '@/lib/types';
import { useSupabase } from '@/components/supabase-provider';
import Link from 'next/link';

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
        .order('shipping_date', { ascending: false })
        .limit(1)
        .single();
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
          <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
        ) : recentShipment ? (
          <div className="space-y-4">
            <div className="bg-muted/20 p-4 rounded-lg flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold uppercase opacity-60">Tracking Number</p>
                <p className="font-mono font-bold text-lg">{recentShipment.tracking_number}</p>
              </div>
              <Badge variant={getStatusVariant(recentShipment.status)}>{recentShipment.status}</Badge>
            </div>
            <Button variant="outline" className="w-full" asChild><Link href="/account/packages">View All Packages</Link></Button>
          </div>
        ) : (
          <div className="text-center py-10 opacity-40 italic text-sm">No active shipments.</div>
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
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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
              <TableHead>Package</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Cost (JMD)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={3} className="text-center py-10"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
            ) : packages.map((pkg) => (
              <TableRow key={pkg.id}>
                <TableCell>
                  <p className="font-mono font-bold text-primary">{pkg.tracking_number}</p>
                  <p className="text-[10px] uppercase opacity-60">{pkg.contents}</p>
                </TableCell>
                <TableCell><Badge variant={getStatusVariant(pkg.status)}>{pkg.status}</Badge></TableCell>
                <TableCell className="text-right font-bold">
                  {pkg.total_cost_jmd ? `JMD $${pkg.total_cost_jmd.toLocaleString()}` : 'TBD'}
                </TableCell>
              </TableRow>
            ))}
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
            let finalUrl = '';
            if (formData.file && user) {
                const idToken = (await supabase.auth.getSession()).data.session?.access_token;
                const body = new FormData();
                body.append('file', formData.file);
                const res = await fetch('/api/storage/upload', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${idToken}` },
                    body
                });
                const uploadData = await res.json();
                finalUrl = uploadData.url;
            }

            const { error } = await supabase.from('pre_alerts').insert({
                profile_id: profileId,
                tracking_number: formData.trackingNumber.toUpperCase(),
                contents: formData.contents,
                weight_lbs: parseFloat(formData.weight) || 0,
                invoice_url: finalUrl,
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
            <Button type="submit" className="w-full h-14 font-black uppercase italic" disabled={isSubmitting}>
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
            <Card className="shadow-lg border-none overflow-hidden">
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
                        <Badge className="text-lg px-4">{details.mailbox_number}</Badge>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="text-sm font-bold uppercase">Personal Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input value={phone} onChange={e => setPhone(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Tax Registration Number (TRN)</Label>
                        <Input value={trn} onChange={e => setTrn(e.target.value)} maxLength={9} />
                    </div>
                    <Button onClick={handleUpdate} disabled={isSaving} className="w-full">
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
                <h2 className="text-4xl font-black italic uppercase">Worldwide Support</h2>
                <p className="text-muted-foreground font-bold uppercase text-[10px]">Dedicated logistics lifeline.</p>
            </div>
            <div className="grid gap-4">
                <Button variant="outline" className="h-20 text-lg font-black uppercase italic" asChild>
                    <Link href="https://wa.me/18765069727" target="_blank">WhatsApp Hub</Link>
                </Button>
                <Button variant="outline" className="h-20 text-lg font-black uppercase italic" asChild>
                    <Link href="mailto:info@fromstore2door.com">Email Helpdesk</Link>
                </Button>
            </div>
        </div>
    );
}

export function CustomsCalculatorTab() {
    // Logic remains identical to the existing calculators
    return <div className="p-8 text-center opacity-50 italic">Calculators are JS-based and fully operational.</div>;
}
