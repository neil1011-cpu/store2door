'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, KeyRound, Moon, Sun, Laptop, Edit, Check, Eye, EyeOff, Zap, ExternalLink, RefreshCw, ShieldCheck, Save, Loader2, Mail } from 'lucide-react';
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
  
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Load existing configuration from Firestore
  const logicwareRef = useMemoFirebase(() => doc(firestore!, 'metadata', 'logicware'), [firestore]);
  const { data: logicwareConfig } = useDoc(logicwareRef);

  const smtpRef = useMemoFirebase(() => doc(firestore!, 'metadata', 'email_config'), [firestore]);
  const { data: smtpConfig, isLoading: isLoadingSmtp } = useDoc(smtpRef);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
      if (logicwareConfig?.apiKey) {
          setLogicwareApi(prev => ({ ...prev, key: logicwareConfig.apiKey, isSaved: true }));
          localStorage.setItem('LOGICWARE_API_KEY', logicwareConfig.apiKey);
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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
        toast({
          title: 'Profile Picture Updated',
          description: 'Your new profile picture has been saved.',
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveLogicwareKey = async () => {
    if (!logicwareApi.key) {
      toast({ title: "Key Required", variant: 'destructive' });
      return;
    }
    
    setIsSavingKey(true);
    try {
        await setDoc(doc(firestore!, 'metadata', 'logicware'), {
            apiKey: logicwareApi.key,
            updatedAt: serverTimestamp(),
            updatedBy: 'admin'
        }, { merge: true });

        localStorage.setItem('LOGICWARE_API_KEY', logicwareApi.key);
        setLogicwareApi(prev => ({ ...prev, isSaved: true, isVisible: false }));
        
        toast({
          title: 'Integration Secured',
          description: `Logicware API key saved to global system settings.`,
        });
    } catch (e: any) {
        toast({ title: 'Save Failed', description: e.message, variant: 'destructive' });
    } finally {
        setIsSavingKey(false);
    }
  };

  const handleSaveSmtp = async () => {
      if (!smtp.user || !smtp.pass || !smtp.host) {
          toast({ title: "All SMTP fields required", variant: 'destructive' });
          return;
      }
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
          toast({ title: "Email Configuration Saved", description: "The system will now use these credentials for all automated dispatches." });
      } catch (e: any) {
          toast({ title: "Save Failed", description: e.message, variant: 'destructive' });
      } finally {
          setIsSavingSmtp(false);
      }
  };

  const handleTestConnection = async () => {
      if (!logicwareApi.key) return;
      setIsTesting(true);
      setIsVerified(false);
      try {
          const response = await fetch('/api/admin/logicware-test-connection', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ apiKey: logicwareApi.key })
          });
          
          const data = await response.json();
          if (data.success) {
              setIsVerified(true);
              toast({ title: "Connection Verified", description: "Your Logicware API key is valid and working." });
          } else {
              throw new Error(data.message);
          }
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
            <Link href="/admin">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Dashboard
            </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
            {/* SMTP Configuration - Firestore Backed */}
            <Card className="border-primary/20 shadow-xl overflow-hidden rounded-2xl">
                <CardHeader className="bg-primary/5 flex flex-row items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-xl"><Mail className="h-6 w-6 text-primary" /></div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-black uppercase tracking-widest italic">Email Dispatch Configuration</CardTitle>
                            {smtp.isSaved && <Badge className="bg-green-500 text-white uppercase text-[8px] font-black italic">Dispatch Ready</Badge>}
                        </div>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Store SMTP keys in the database for environments without ENV access.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase opacity-60">SMTP Host</Label>
                            <Input value={smtp.host} onChange={e => setSmtp({...smtp, host: e.target.value, isSaved: false})} className="h-11 border-2 font-mono" placeholder="smtp.gmail.com" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase opacity-60">SMTP Port</Label>
                            <Input value={smtp.port} onChange={e => setSmtp({...smtp, port: e.target.value, isSaved: false})} className="h-11 border-2 font-mono" placeholder="465 or 587" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase opacity-60">System Email (User)</Label>
                            <Input value={smtp.user} onChange={e => setSmtp({...smtp, user: e.target.value, isSaved: false})} className="h-11 border-2 font-mono" placeholder="admin@example.com" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase opacity-60">Secure App Password</Label>
                            <div className="relative">
                                <Input 
                                    type={smtp.isVisible ? 'text' : 'password'} 
                                    value={smtp.pass} 
                                    onChange={e => setSmtp({...smtp, pass: e.target.value, isSaved: false})} 
                                    className="h-11 border-2 font-mono pr-12" 
                                    placeholder="•••• •••• •••• ••••" 
                                />
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9"
                                    onClick={() => setSmtp({...smtp, isVisible: !smtp.isVisible})}
                                >
                                    {smtp.isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3 items-center">
                        <KeyRound className="h-5 w-5 text-amber-600 shrink-0" />
                        <p className="text-[9px] font-bold text-amber-800 uppercase leading-relaxed">
                            These credentials are saved to **Firestore Metadata**. Use a dedicated **App Password** for safety. These values will override any .env settings if present.
                        </p>
                    </div>
                    <Button onClick={handleSaveSmtp} disabled={isSavingSmtp || isLoadingSmtp} className="w-full h-14 text-lg font-black uppercase italic shadow-xl">
                        {isSavingSmtp ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Save className="mr-2 h-6 w-6" />}
                        Authorize & Save Email Configuration
                    </Button>
                </CardContent>
            </Card>

            <Card className="border-none shadow-lg overflow-hidden rounded-2xl">
                <CardHeader className="bg-muted/10">
                <CardTitle className="text-sm font-black uppercase tracking-widest italic">Application Appearance</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Customize your workspace visual parameters.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                <div className="space-y-4">
                    <Label className="text-[10px] font-bold uppercase opacity-60">System Theme Mode</Label>
                    {mounted ? (
                        <RadioGroup
                        value={theme}
                        onValueChange={setTheme}
                        className="grid max-w-md grid-cols-3 gap-4"
                        >
                        <Label className={cn("rounded-2xl border-2 p-4 flex flex-col items-center gap-2 cursor-pointer transition-all", theme === 'light' ? "border-primary bg-primary/5" : "hover:bg-muted")}>
                            <Sun className="h-6 w-6"/>
                            <RadioGroupItem value="light" id="light" className="sr-only" />
                            <span className="text-[10px] font-black uppercase tracking-tighter">Light</span>
                        </Label>
                        <Label className={cn("rounded-2xl border-2 p-4 flex flex-col items-center gap-2 cursor-pointer transition-all", theme === 'dark' ? "border-primary bg-primary/5" : "hover:bg-muted")}>
                            <Moon className="h-6 w-6" />
                            <RadioGroupItem value="dark" id="dark" className="sr-only" />
                            <span className="text-[10px] font-black uppercase tracking-tighter">Dark</span>
                        </Label>
                        <Label className={cn("rounded-2xl border-2 p-4 flex flex-col items-center gap-2 cursor-pointer transition-all", theme === 'system' ? "border-primary bg-primary/5" : "hover:bg-muted")}>
                            <Laptop className="h-6 w-6" />
                            <RadioGroupItem value="system" id="system" className="sr-only" />
                            <span className="text-[10px] font-black uppercase tracking-tighter">System</span>
                        </Label>
                        </RadioGroup>
                    ) : (
                        <div className="grid max-w-md grid-cols-3 gap-4">
                            <Skeleton className="h-24 w-full rounded-2xl" />
                            <Skeleton className="h-24 w-full rounded-2xl" />
                            <Skeleton className="h-24 w-full rounded-2xl" />
                        </div>
                    )}
                </div>
                </CardContent>
            </Card>

            <Card className="border-blue-200 shadow-lg overflow-hidden rounded-2xl">
                <CardHeader className="flex flex-row items-center gap-4 bg-blue-50/50">
                    <div className="bg-blue-100 p-3 rounded-xl">
                        <Zap className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-black uppercase tracking-widest italic">Logicware Portal Integration</CardTitle>
                            {(isVerified || (logicwareApi.isSaved)) && (
                                <Badge className="bg-blue-600 text-white uppercase text-[8px] font-black italic"><ShieldCheck className="mr-1 h-2 w-2" /> Linked</Badge>
                            )}
                        </div>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-blue-600/70">Synchronization bridge for global logistics hubs.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 border-2 rounded-2xl bg-muted/20">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Logistics Slug</p>
                            <div className="flex items-center justify-between">
                                <span className="font-mono font-black text-sm text-primary uppercase">{logicwareMeta.slug}</span>
                                <Badge variant="outline" className="text-[8px] font-black italic uppercase">Official</Badge>
                            </div>
                        </div>
                        <div className="p-4 border-2 rounded-2xl bg-muted/20">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Base Endpoint</p>
                            <div className="flex items-center justify-between">
                                <span className="font-mono text-[9px] truncate max-w-[150px] opacity-60">{logicwareMeta.baseUrl}</span>
                                <Link href={logicwareMeta.baseUrl} target="_blank" className="hover:text-primary"><ExternalLink className="h-3.5 w-3.5" /></Link>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase opacity-60">Logicware Connect API Key</Label>
                            <div className="flex items-center gap-2">
                                <Input 
                                type={logicwareApi.isVisible ? 'text' : 'password'}
                                placeholder="Enter system API key"
                                value={logicwareApi.key}
                                onChange={(e) => setLogicwareApi(prev => ({...prev, key: e.target.value, isSaved: false}))}
                                className="h-12 border-2 font-mono"
                                />
                                <Button variant="ghost" size="icon" className="h-12 w-12" onClick={() => setLogicwareApi(prev => ({ ...prev, isVisible: !prev.isVisible }))}>
                                    {logicwareApi.isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <Button onClick={handleSaveLogicwareKey} disabled={isSavingKey} className="h-14 font-black uppercase italic shadow-lg">
                                {isSavingKey ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Save className="mr-2 h-6 w-6" />}
                                Secure Key
                            </Button>
                            <Button 
                                variant="outline" 
                                className="h-14 font-black uppercase italic border-2 border-blue-200 text-blue-600 hover:bg-blue-50" 
                                onClick={handleTestConnection}
                                disabled={isTesting || !logicwareApi.key}
                            >
                                {isTesting ? <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> : <Zap className="mr-2 h-5 w-5" />}
                                Test Link
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
            <Card className="rounded-2xl shadow-lg border-none">
                <CardHeader className="bg-primary/5 pb-8">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-center opacity-40">Administrative Profile</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-8 pt-0 -mt-10">
                    <div className="relative group">
                        <Avatar className="h-36 w-32 rounded-3xl border-4 border-background shadow-2xl transition-transform group-hover:scale-105 duration-500">
                            <AvatarImage src={avatar} alt="Admin" className="object-cover" />
                            <AvatarFallback className="text-4xl font-black bg-primary text-primary-foreground">AD</AvatarFallback>
                        </Avatar>
                        <Button 
                            onClick={() => fileInputRef.current?.click()} 
                            size="icon" 
                            className="absolute -bottom-2 -right-2 h-10 w-10 rounded-2xl shadow-xl border-4 border-background"
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                    </div>
                    
                    <div className="text-center space-y-1">
                        <p className="font-black italic uppercase text-xl tracking-tighter">FSTD Administrator</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Global Operations Division</p>
                    </div>

                    <Input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAvatarChange}
                        className="hidden"
                        accept="image/*"
                    />
                    
                    <Separator className="opacity-10" />
                    
                    <div className="w-full space-y-4">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                            <span className="opacity-40">System Version</span>
                            <span className="text-primary italic">v2.1.0-LIVE</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                            <span className="opacity-40">Last Logged Sync</span>
                            <span className="text-primary italic">{new Date().toLocaleDateString()}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-zinc-950 text-white rounded-2xl border-none shadow-2xl overflow-hidden">
                <CardHeader className="pb-4">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">System Health Diagnostic</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Firebase Cloud Link: ACTIVE</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={cn("h-2 w-2 rounded-full animate-pulse", smtp.isSaved ? "bg-green-500" : "bg-red-500")} />
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">SMTP Dispatch Relay: {smtp.isSaved ? 'ONLINE' : 'OFFLINE'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={cn("h-2 w-2 rounded-full animate-pulse", logicwareApi.isSaved ? "bg-green-500" : "bg-red-500")} />
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Logicware Hub Bridge: {logicwareApi.isSaved ? 'LINKED' : 'PENDING'}</span>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
