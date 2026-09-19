'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
    ArrowLeft, Moon, Sun, Laptop, Eye, EyeOff, Zap, 
    RefreshCw, ShieldCheck, Save, Loader2, Mail, Cloud, 
    Database, CheckCircle2, AlertCircle, Terminal 
} from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

type StatusState = 'IDLE' | 'TESTING' | 'CONNECTED' | 'FAILED' | 'SAVING';

export default function SettingsPage() {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  const [isLoading, setIsLoading] = useState(true);
  
  // SMTP State
  const [smtp, setSmtp] = useState({ host: '', port: '465', user: '', pass: '', fromEmail: '', fromName: '', isVisible: false });
  const [smtpStatus, setSmtpStatus] = useState<StatusState>('IDLE');
  const [smtpMsg, setSmtpMsg] = useState('');

  // Vultr State
  const [vultr, setVultr] = useState({ accessKey: '', secretKey: '', endpoint: 'ewr1.vultrobjects.com', bucket: '', isVisible: false });
  const [vultrStatus, setVultrStatus] = useState<StatusState>('IDLE');
  const [vultrMsg, setVultrMsg] = useState('');

  // Logicware State
  const [logicware, setLogicware] = useState({ apiKey: '', baseUrl: 'https://from-store-to-door-api.logicware.app', isVisible: false });
  const [logicwareStatus, setLogicwareStatus] = useState<StatusState>('IDLE');
  const [logicwareMsg, setLogicwareMsg] = useState('');

  useEffect(() => {
    setMounted(true);
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setIsLoading(true);
    try {
        const res = await fetch('/api/admin/settings');
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.message || 'Failed to load registry.');

        (data || []).forEach((config: any) => {
            const val = config.config_value;
            if (config.config_key === 'email_config') {
                setSmtp(prev => ({ ...prev, ...val }));
                setSmtpStatus('CONNECTED');
            } else if (config.config_key === 'vultr_config') {
                setVultr(prev => ({ ...prev, ...val }));
                setVultrStatus('CONNECTED');
            } else if (config.config_key === 'logicware') {
                setLogicware(prev => ({ ...prev, ...val }));
                setLogicwareStatus('CONNECTED');
            }
        });
    } catch (e: any) {
        toast({ title: "Sync Error", description: e.message, variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  const handleSave = async (type: string, data: any, statusSetter: any) => {
    statusSetter('SAVING');
    try {
        const key = type === 'email' ? 'email_config' : type === 'vultr' ? 'vultr_config' : 'logicware';
        const res = await fetch('/api/admin/settings/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value: data })
        });
        
        const result = await res.json();
        
        if (!res.ok) {
            throw new Error(result.message || 'Save operation failed.');
        }

        toast({ title: "Configuration Secured" });
        statusSetter('CONNECTED');
    } catch (e: any) {
        toast({ title: "Save Error", description: e.message, variant: "destructive" });
        statusSetter('FAILED');
    }
  };

  const handleTest = async (type: string, data: any, statusSetter: any, msgSetter: any) => {
    statusSetter('TESTING');
    msgSetter('');
    try {
        const res = await fetch('/api/admin/settings/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, config: data })
        });
        const result = await res.json();
        if (result.success) {
            statusSetter('CONNECTED');
            toast({ title: "Test Passed", description: result.message });
        } else {
            statusSetter('FAILED');
            msgSetter(result.message);
            toast({ title: "Test Failed", description: result.message, variant: "destructive" });
        }
    } catch (e: any) {
        statusSetter('FAILED');
        msgSetter(e.message);
        toast({ title: "Handshake Failed", description: e.message, variant: "destructive" });
    }
  };

  if (isLoading || !mounted) {
      return <div className="flex h-screen items-center justify-center flex-col gap-4"><Loader2 className="animate-spin text-primary h-10 w-10" /><p className="text-[10px] font-black uppercase tracking-widest opacity-40">Decrypting System Keys...</p></div>;
  }

  const StatusIndicator = ({ status }: { status: StatusState }) => {
    if (status === 'TESTING' || status === 'SAVING') return <Badge variant="outline" className="animate-pulse bg-muted">PROCESSING</Badge>;
    if (status === 'CONNECTED') return <Badge className="bg-green-500 hover:bg-green-600 font-black italic text-[9px] border-2 border-white/20 shadow-sm"><CheckCircle2 className="h-2 w-2 mr-1" /> ACTIVE</Badge>;
    if (status === 'FAILED') return <Badge variant="destructive" className="font-black italic text-[9px] shadow-sm"><AlertCircle className="h-2 w-2 mr-1" /> OFFLINE</Badge>;
    return <Badge variant="outline" className="opacity-40">NOT TESTED</Badge>;
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary">System Console</h1>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px] mt-1">Global settings and Supabase integrations center.</p>
        </div>
        <Button variant="outline" asChild className="font-bold border-2">
            <Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" /> Dashboard</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
            
            {/* Email Relay */}
            <Card className="border-primary/20 shadow-xl overflow-hidden rounded-2xl">
                <CardHeader className="bg-primary/5 flex flex-row items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-xl"><Mail className="h-6 w-6 text-primary" /></div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-black uppercase tracking-widest italic">Email Relay Settings</CardTitle>
                            <StatusIndicator status={smtpStatus} />
                        </div>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Master SMTP credentials for automated dispatches.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-8">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase opacity-60">SMTP Host</Label><Input value={smtp.host} onChange={e => setSmtp({...smtp, host: e.target.value})} className="h-11 border-2" /></div>
                        <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase opacity-60">Port</Label><Input value={smtp.port} onChange={e => setSmtp({...smtp, port: e.target.value})} className="h-11 border-2" /></div>
                        <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase opacity-60">User / Email</Label><Input value={smtp.user} onChange={e => setSmtp({...smtp, user: e.target.value})} className="h-11 border-2" /></div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase opacity-60">Password / App Key</Label>
                            <div className="relative">
                                <Input type={smtp.isVisible ? 'text' : 'password'} value={smtp.pass} onChange={e => setSmtp({...smtp, pass: e.target.value})} className="h-11 border-2 pr-12 font-mono" />
                                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setSmtp({...smtp, isVisible: !smtp.isVisible})}>
                                    {smtp.isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase opacity-60">Display From Name</Label><Input value={smtp.fromName} onChange={e => setSmtp({...smtp, fromName: e.target.value})} className="h-11 border-2" /></div>
                        <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase opacity-60">Reply-To Address</Label><Input value={smtp.fromEmail} onChange={e => setSmtp({...smtp, fromEmail: e.target.value})} className="h-11 border-2" /></div>
                    </div>
                    {smtpMsg && <p className="text-[10px] font-mono text-red-500 bg-red-50 p-2 rounded border border-red-100">{smtpMsg}</p>}
                    <div className="flex gap-4">
                        <Button onClick={() => handleTest('email', smtp, setSmtpStatus, setSmtpMsg)} disabled={smtpStatus === 'TESTING'} variant="outline" className="flex-1 h-14 font-black uppercase italic border-2">
                             Test Handshake
                        </Button>
                        <Button onClick={() => handleSave('email', smtp, setSmtpStatus)} disabled={smtpStatus === 'SAVING'} className="flex-1 h-14 text-lg font-black uppercase italic shadow-xl">
                            {smtpStatus === 'SAVING' ? <Loader2 className="animate-spin mr-2 h-6 w-6" /> : <Save className="mr-2 h-6 w-6" />}
                            Save Relay
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Vultr */}
            <Card className="border-orange-200 shadow-xl overflow-hidden rounded-2xl">
                <CardHeader className="bg-orange-50/50 flex flex-row items-center gap-4">
                    <div className="bg-orange-100 p-3 rounded-xl"><Cloud className="h-6 w-6 text-orange-600" /></div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-black uppercase tracking-widest italic text-orange-700">Vultr Cloud Storage</CardTitle>
                            <StatusIndicator status={vultrStatus} />
                        </div>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Global documentation storage (S3 Compatible).</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-8">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase opacity-60">Access Key</Label><Input value={vultr.accessKey} onChange={e => setVultr({...vultr, accessKey: e.target.value})} className="h-11 border-2 font-mono" /></div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase opacity-60">Secret Key</Label>
                            <div className="relative">
                                <Input type={vultr.isVisible ? 'text' : 'password'} value={vultr.secretKey} onChange={e => setVultr({...vultr, secretKey: e.target.value})} className="h-11 border-2 pr-12 font-mono" />
                                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setVultr({...vultr, isVisible: !vultr.isVisible})}>
                                    {vultr.isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase opacity-60">Bucket Name</Label><Input value={vultr.bucket} onChange={e => setVultr({...vultr, bucket: e.target.value})} className="h-11 border-2" /></div>
                        <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase opacity-60">Hostname Endpoint</Label><Input value={vultr.endpoint} onChange={e => setVultr({...vultr, endpoint: e.target.value})} className="h-11 border-2 font-mono" /></div>
                    </div>
                    {vultrMsg && <p className="text-[10px] font-mono text-red-500 bg-red-50 p-2 rounded border border-red-100">{vultrMsg}</p>}
                    <div className="flex gap-4">
                        <Button onClick={() => handleTest('vultr', vultr, setVultrStatus, setVultrMsg)} disabled={vultrStatus === 'TESTING'} variant="outline" className="flex-1 h-14 font-black uppercase italic border-2 border-orange-200 text-orange-700">
                             Ping Storage
                        </Button>
                        <Button onClick={() => handleSave('vultr', vultr, setVultrStatus)} disabled={vultrStatus === 'SAVING'} className="flex-1 h-14 text-lg font-black uppercase italic shadow-xl bg-orange-600 hover:bg-orange-700">
                            {vultrStatus === 'SAVING' ? <Loader2 className="animate-spin mr-2 h-6 w-6" /> : <Database className="mr-2 h-6 w-6" />}
                            Link Storage
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Logicware */}
            <Card className="border-blue-200 shadow-xl overflow-hidden rounded-2xl">
                <CardHeader className="bg-blue-50/50 flex flex-row items-center gap-4">
                    <div className="bg-blue-100 p-3 rounded-xl"><Zap className="h-6 w-6 text-blue-600" /></div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-black uppercase tracking-widest italic text-blue-700">Logicware Hub Sync</CardTitle>
                            <StatusIndicator status={logicwareStatus} />
                        </div>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest">External logistics portal synchronization.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-8">
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase opacity-60">API Key</Label>
                            <div className="relative">
                                <Input type={logicware.isVisible ? 'text' : 'password'} value={logicware.apiKey} onChange={e => setLogicware({...logicware, apiKey: e.target.value})} className="h-11 border-2 pr-12 font-mono" />
                                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setLogicware({...logicware, isVisible: !logicware.isVisible})}>
                                    {logicware.isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase opacity-60">API Base URL</Label><Input value={logicware.baseUrl} onChange={e => setLogicware({...logicware, baseUrl: e.target.value})} className="h-11 border-2 font-mono" /></div>
                    </div>
                    {logicwareMsg && <p className="text-[10px] font-mono text-red-500 bg-red-50 p-2 rounded border border-red-100">{logicwareMsg}</p>}
                    <div className="flex gap-4">
                        <Button onClick={() => handleTest('logicware', logicware, setLogicwareStatus, setLogicwareMsg)} disabled={logicwareStatus === 'TESTING'} variant="outline" className="flex-1 h-14 font-black uppercase italic border-2 border-blue-200 text-blue-700">
                             Verify API
                        </Button>
                        <Button onClick={() => handleSave('logicware', logicware, setLogicwareStatus)} disabled={logicwareStatus === 'SAVING'} className="flex-1 h-14 text-lg font-black uppercase italic shadow-xl bg-blue-600 hover:bg-blue-700">
                            {logicwareStatus === 'SAVING' ? <Loader2 className="animate-spin mr-2 h-6 w-6" /> : <RefreshCw className="mr-2 h-6 w-6" />}
                            Update Sync
                        </Button>
                    </div>
                </CardContent>
            </Card>

        </div>

        <div className="lg:col-span-4 space-y-6">
            <Card className="border-none shadow-lg overflow-hidden rounded-2xl">
                <CardHeader className="bg-muted/10 pb-4"><CardTitle className="text-sm font-black uppercase tracking-widest italic">Application Mode</CardTitle></CardHeader>
                <CardContent className="pt-6">
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-bold uppercase opacity-60">System Theme Mode</Label>
                            <RadioGroup value={theme} onValueChange={setTheme} className="grid grid-cols-1 gap-2">
                                {['light', 'dark', 'system'].map(t => (
                                    <Label key={t} className={cn("rounded-xl border-2 p-3 flex items-center justify-between cursor-pointer transition-all", theme === t ? "border-primary bg-primary/5" : "hover:bg-muted")}>
                                        <div className="flex items-center gap-3">
                                            {t === 'light' ? <Sun className="h-4 w-4" /> : t === 'dark' ? <Moon className="h-4 w-4" /> : <Laptop className="h-4 w-4" />}
                                            <span className="text-[10px] font-black uppercase tracking-tighter capitalize">{t}</span>
                                        </div>
                                        <RadioGroupItem value={t} className="sr-only" />
                                        {theme === t && <CheckCircle2 className="h-4 w-4 text-primary" />}
                                    </Label>
                                ))}
                            </RadioGroup>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                             <Label className="text-[10px] font-bold uppercase opacity-60">Diagnostic Terminal</Label>
                             <Button variant="ghost" size="sm" asChild className="w-full justify-start font-mono text-[9px] h-10 border border-dashed text-primary/60">
                                 <Link href="/setup-admin"><Terminal className="mr-2 h-3 w-3" /> Execute System Proof</Link>
                             </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="p-6 rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 space-y-4">
                <div className="flex items-center gap-3 text-primary">
                    <ShieldCheck className="h-6 w-6" />
                    <p className="text-xs font-black uppercase italic tracking-tighter leading-tight">Master Authority</p>
                </div>
                <p className="text-[10px] font-medium leading-relaxed opacity-70">
                    Integration keys are persisted in an immutable PostgreSQL registry. Secrets are server-masked and never dispatched to the client DOM.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}
