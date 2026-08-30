'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, KeyRound, Moon, Sun, Laptop, Edit, Check, Eye, EyeOff, Zap, ExternalLink, RefreshCw, ShieldCheck, Save, Loader2, Mail, Cloud, Database } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { logicwareMeta } from '@/lib/logicware';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

type ApiKeyState = {
    key: string;
    isSaved: boolean;
    isVisible: boolean;
};

type SmtpState = {
    host: string;
    port: string;
    user: string;
    pass: string;
    isVisible: boolean;
    isSaved: boolean;
};

type VultrState = {
    accessKey: string;
    secretKey: string;
    endpoint: string;
    bucket: string;
    isVisible: boolean;
    isSaved: boolean;
};

export default function SettingsPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [avatar, setAvatar] = useState('https://placehold.co/128x128.png');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [logicwareApi, setLogicwareApi] = useState<ApiKeyState>({ 
    key: '', 
    isSaved: false, 
    isVisible: false 
  });

  const [smtp, setSmtp] = useState<SmtpState>({
      host: 'smtp.gmail.com',
      port: '465',
      user: 'admin@neilussolutions.com',
      pass: '',
      isVisible: false,
      isSaved: false
  });

  const [vultr, setVultr] = useState<VultrState>({
      accessKey: '',
      secretKey: '',
      endpoint: 'ewr1.vultrobjects.com',
      bucket: '',
      isVisible: false,
      isSaved: false
  });
  
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [isSavingVultr, setIsSavingVultr] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const logicwareRef = useMemoFirebase(() => doc(firestore!, 'metadata', 'logicware'), [firestore]);
  const { data: logicwareConfig } = useDoc(logicwareRef);

  const smtpRef = useMemoFirebase(() => doc(firestore!, 'metadata', 'email_config'), [firestore]);
  const { data: smtpConfig, isLoading: isLoadingSmtp } = useDoc(smtpRef);

  const vultrRef = useMemoFirebase(() => doc(firestore!, 'metadata', 'vultr_config'), [firestore]);
  const { data: vultrConfig, isLoading: isLoadingVultr } = useDoc(vultrRef);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
      if (logicwareConfig?.apiKey) {
          setLogicwareApi(prev => ({ ...prev, key: logicwareConfig.apiKey, isSaved: true }));
      }
  }, [logicwareConfig]);

  useEffect(() => {
      if (smtpConfig) {
          setSmtp(prev => ({ 
              ...prev, 
              host: smtpConfig.host || 'smtp.gmail.com',
              port: smtpConfig.port || '465',
              user: smtpConfig.user || '',
              pass: smtpConfig.pass || '',
              isSaved: true 
          }));
      }
  }, [smtpConfig]);

  useEffect(() => {
      if (vultrConfig) {
          setVultr(prev => ({
              ...prev,
              accessKey: vultrConfig.accessKey || '',
              secretKey: vultrConfig.secretKey || '',
              endpoint: vultrConfig.endpoint || 'ewr1.vultrobjects.com',
              bucket: vultrConfig.bucket || '',
              isSaved: true
          }));
      }
  }, [vultrConfig]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
        toast({ title: 'Profile Picture Updated' });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveLogicwareKey = async () => {
    if (!logicwareApi.key) return;
    setIsSavingKey(true);
    try {
        await setDoc(doc(firestore!, 'metadata', 'logicware'), {
            apiKey: logicwareApi.key,
            updatedAt: serverTimestamp()
        }, { merge: true });
        setLogicwareApi(prev => ({ ...prev, isSaved: true, isVisible: false }));
        toast({ title: 'Logicware Configuration Saved' });
    } catch (e: any) {
        toast({ title: 'Save Failed', description: e.message, variant: 'destructive' });
    } finally {
        setIsSavingKey(false);
    }
  };

  const handleSaveSmtp = async () => {
      if (!smtp.user || !smtp.pass) return;
      setIsSavingSmtp(true);
      try {
          await setDoc(doc(firestore!, 'metadata', 'email_config'), {
              host: smtp.host,
              port: smtp.port,
              user: smtp.user,
              pass: smtp.pass,
              updatedAt: serverTimestamp()
          }, { merge: true });
          setSmtp(prev => ({ ...prev, isSaved: true, isVisible: false }));
          toast({ title: "Email Configuration Saved" });
      } catch (e: any) {
          toast({ title: "Save Failed", description: e.message, variant: 'destructive' });
      } finally {
          setIsSavingSmtp(false);
      }
  };

  const handleSaveVultr = async () => {
      if (!vultr.accessKey || !vultr.secretKey || !vultr.bucket) {
          toast({ title: "Vultr Access Details Required", variant: 'destructive' });
          return;
      }
      setIsSavingVultr(true);
      try {
          await setDoc(doc(firestore!, 'metadata', 'vultr_config'), {
              accessKey: vultr.accessKey,
              secretKey: vultr.secretKey,
              endpoint: vultr.endpoint,
              bucket: vultr.bucket,
              updatedAt: serverTimestamp()
          }, { merge: true });
          setVultr(prev => ({ ...prev, isSaved: true, isVisible: false }));
          toast({ title: "Vultr Cloud Storage Linked", description: "All document uploads will now proceed to your Vultr primary bucket." });
      } catch (e: any) {
          toast({ title: "Vultr Sync Failed", description: e.message, variant: 'destructive' });
      } finally {
          setIsSavingVultr(false);
      }
  };

  const handleTestConnection = async () => {
      if (!logicwareApi.key) return;
      setIsTesting(true);
      try {
          const response = await fetch('/api/admin/logicware-test-connection', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ apiKey: logicwareApi.key })
          });
          const data = await response.json();
          if (data.success) {
              setIsVerified(true);
              toast({ title: "Connection Verified" });
          } else throw new Error(data.message);
      } catch (e: any) {
          toast({ title: "Verification Failed", description: e.message, variant: "destructive" });
      } finally {
          setIsTesting(false);
      }
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">System Console</h1>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px] mt-1">Global settings and integrations center.</p>
        </div>
        <Button variant="outline" asChild className="font-bold border-2">
            <Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" /> Dashboard</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
            {/* Vultr Cloud Storage - The New Primary */}
            <Card className="border-orange-200 shadow-xl overflow-hidden rounded-2xl">
                <CardHeader className="bg-orange-50/50 flex flex-row items-center gap-4">
                    <div className="bg-orange-100 p-3 rounded-xl"><Cloud className="h-6 w-6 text-orange-600" /></div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-black uppercase tracking-widest italic text-orange-700">Vultr Primary Cloud Storage</ Eldorado/CardTitle>
                            {vultr.isSaved && <Badge className="bg-green-500 text-white uppercase text-[8px] font-black italic">Cloud ACTIVE</Badge>}
                        </div>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-orange-600/70">Connect your Vultr account to bypass Google Storage limitations.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase opacity-60">Access Key</Label>
                            <Input value={vultr.accessKey} onChange={e => setVultr({...vultr, accessKey: e.target.value, isSaved: false})} className="h-11 border-2 font-mono" placeholder="VULTR_ACCESS_KEY" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase opacity-60">Secret Key</Label>
                            <div className="relative">
                                <Input 
                                    type={vultr.isVisible ? 'text' : 'password'} 
                                    value={vultr.secretKey} 
                                    onChange={e => setVultr({...vultr, secretKey: e.target.value, isSaved: false})} 
                                    className="h-11 border-2 font-mono pr-12" 
                                    placeholder="VULTR_SECRET_KEY" 
                                />
                                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9" onClick={() => setVultr({...vultr, isVisible: !vultr.isVisible})}><Eye className="h-4 w-4" /></Button>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase opacity-60">Hostname / Endpoint</Label>
                            <Input value={vultr.endpoint} onChange={e => setVultr({...vultr, endpoint: e.target.value, isSaved: false})} className="h-11 border-2 font-mono" placeholder="ewr1.vultrobjects.com" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase opacity-60">Bucket Name</ Eldorado/Label>
                            <Input value={vultr.bucket} onChange={e => setVultr({...vultr, bucket: e.target.value, isSaved: false})} className="h-11 border-2 font-mono" placeholder="store2door-docs" />
                        </div>
                    </div>
                    <Button onClick={handleSaveVultr} disabled={isSavingVultr || isLoadingVultr} className="w-full h-14 text-lg font-black uppercase italic shadow-xl bg-orange-600 hover:bg-orange-700">
                        {isSavingVultr ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Database className="mr-2 h-6 w-6" />}
                        Finalize Vultr Primary Link
                    </Button>
                </CardContent>
            </Card>

            {/* SMTP Configuration */}
            <Card className="border-primary/20 shadow-lg overflow-hidden rounded-2xl opacity-60 hover:opacity-100 transition-opacity">
                <CardHeader className="bg-primary/5 flex flex-row items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-xl"><Mail className="h-6 w-6 text-primary" /></div>
                    <div className="flex-1">
                        <CardTitle className="text-sm font-black uppercase tracking-widest italic">Email Relay Settings</CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Master SMTP credentials for automated dispatches.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-8">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase opacity-60">Host</Label><Input value={smtp.host} onChange={e => setSmtp({...smtp, host: e.target.value, isSaved: false})} className="h-11 border-2" /></div>
                        <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase opacity-60">Port</Label><Input value={smtp.port} onChange={e => setSmtp({...smtp, port: e.target.value, isSaved: false})} className="h-11 border-2" /></div>
                    </div>
                    <Button onClick={handleSaveSmtp} disabled={isSavingSmtp} className="w-full h-12 font-black uppercase italic shadow-lg">Save Email Relay</Button>
                </CardContent>
            </Card>

            <Card className="border-none shadow-lg overflow-hidden rounded-2xl">
                <CardHeader className="bg-muted/10"><CardTitle className="text-sm font-black uppercase tracking-widest italic">Application Appearance</CardTitle></CardHeader>
                <CardContent className="pt-6">
                <div className="space-y-4">
                    <Label className="text-[10px] font-bold uppercase opacity-60">System Theme Mode</Label>
                    {mounted ? (
                        <RadioGroup value={theme} onValueChange={setTheme} className="grid max-w-md grid-cols-3 gap-4">
                        {['light', 'dark', 'system'].map(t => (
                            <Label key={t} className={cn("rounded-2xl border-2 p-4 flex flex-col items-center gap-2 cursor-pointer transition-all", theme === t ? "border-primary bg-primary/5" : "hover:bg-muted")}>
                                {t === 'light' ? <Sun /> : t === 'dark' ? <Moon /> : <Laptop />}
                                <RadioGroupItem value={t} className="sr-only" />
                                <span className="text-[10px] font-black uppercase tracking-tighter capitalize">{t}</span>
                            </Label>
                        ))}
                        </RadioGroup>
                    ) : <Skeleton className="h-24 w-full rounded-2xl" />}
                </div>
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
            <Card className="rounded-2xl shadow-lg border-none">
                <CardHeader className="bg-primary/5 pb-8"><CardTitle className="text-xs font-black uppercase tracking-widest text-center opacity-40">Administrative Identity</CardTitle></CardHeader>
                <CardContent className="flex flex-col items-center gap-8 pt-0 -mt-10">
                    <div className="relative group">
                        <Avatar className="h-36 w-32 rounded-3xl border-4 border-background shadow-2xl transition-transform group-hover:scale-105">
                            <AvatarImage src={avatar} className="object-cover" /><AvatarFallback className="text-4xl font-black bg-primary text-primary-foreground">AD</AvatarFallback>
                        </Avatar>
                        <Button onClick={() => fileInputRef.current?.click()} size="icon" className="absolute -bottom-2 -right-2 h-10 w-10 rounded-2xl shadow-xl border-4 border-background"><Edit className="h-4 w-4" /></Button>
                    </div>
                    <div className="text-center space-y-1"><p className="font-black italic uppercase text-xl tracking-tighter">FSTD Administrator</p><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Global Operations Division</p></div>
                    <Input type="file" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" />
                    <Separator className="opacity-10" />
                    <div className="w-full space-y-4">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest"><span className="opacity-40">System Version</span><span className="text-primary italic">v2.5.0-VULTR</span></div>
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest"><span className="opacity-40">Last Sync</span><span className="text-primary italic">{new Date().toLocaleDateString()}</span></div>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}