'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, KeyRound, Moon, Sun, Laptop, Edit, Check, Eye, EyeOff, Zap, ExternalLink, RefreshCcw, ShieldCheck, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { logicwareMeta } from '@/lib/logicware';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

type ApiKeyState = {
    key: string;
    isSaved: boolean;
    isVisible: boolean;
};

export default function SettingsPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [avatar, setAvatar] = useState('https://placehold.co/128x128.png');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [partyApi, setPartyApi] = useState<ApiKeyState>({ key: '', isSaved: false, isVisible: false });
  const [logicwareApi, setLogicwareApi] = useState<ApiKeyState>({ 
    key: '', 
    isSaved: false, 
    isVisible: false 
  });
  
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Load existing key from Firestore
  const logicwareRef = useMemoFirebase(() => doc(firestore, 'metadata', 'logicware'), [firestore]);
  const { data: logicwareConfig, isLoading: isLoadingConfig } = useDoc(logicwareRef);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
      if (logicwareConfig?.apiKey) {
          setLogicwareApi(prev => ({ ...prev, key: logicwareConfig.apiKey, isSaved: true }));
          localStorage.setItem('LOGICWARE_API_KEY', logicwareConfig.apiKey);
      }
  }, [logicwareConfig]);

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
        await setDoc(doc(firestore, 'metadata', 'logicware'), {
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

  const handleTestConnection = async () => {
      if (!logicwareApi.key) return;
      setIsTesting(true);
      setIsVerified(false);
      try {
          const res = await fetch('/api/admin/logicware-test-connection', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ apiKey: logicwareApi.key })
          });
          const data = await res.json();
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

  const handleEditApiKey = () => {
    setLogicwareApi(prev => ({ ...prev, isSaved: false }));
    setIsVerified(false);
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account and application settings.</p>
        </div>
        <Button variant="outline" asChild>
            <Link href="/admin">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
            </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>
                    Customize the look and feel of the application.
                </CardDescription>
                </CardHeader>
                <CardContent>
                <div className="space-y-2">
                    <Label>Theme</Label>
                    {mounted ? (
                        <RadioGroup
                        value={theme}
                        onValueChange={setTheme}
                        className="grid max-w-md grid-cols-3 gap-4"
                        >
                        <Label className={cn("rounded-md border-2 p-4 flex flex-col items-center gap-2 cursor-pointer", theme === 'light' && "border-primary")}>
                            <Sun className="h-5 w-5"/>
                            <RadioGroupItem value="light" id="light" className="sr-only" />
                            <span>Light</span>
                        </Label>
                        <Label className={cn("rounded-md border-2 p-4 flex flex-col items-center gap-2 cursor-pointer", theme === 'dark' && "border-primary")}>
                            <Moon className="h-5 w-5" />
                            <RadioGroupItem value="dark" id="dark" className="sr-only" />
                            <span>Dark</span>
                        </Label>
                        <Label className={cn("rounded-md border-2 p-4 flex flex-col items-center gap-2 cursor-pointer", theme === 'system' && "border-primary")}>
                            <Laptop className="h-5 w-5" />
                            <RadioGroupItem value="system" id="system" className="sr-only" />
                            <span>System</span>
                        </Label>
                        </RadioGroup>
                    ) : (
                        <div className="grid max-w-md grid-cols-3 gap-4">
                            <Skeleton className="h-[98px]" />
                            <Skeleton className="h-[98px]" />
                            <Skeleton className="h-[98px]" />
                        </div>
                    )}
                </div>
                </CardContent>
            </Card>

            <Card className="border-primary/20">
                <CardHeader className="flex flex-row items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-xl">
                        <Zap className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <CardTitle>Logicware Integration</CardTitle>
                            {(isVerified || (logicwareApi.isSaved && !isLoadingConfig)) && (
                                <Badge className="bg-green-500 text-white"><ShieldCheck className="mr-1 h-3 w-3" /> System Linked</Badge>
                            )}
                        </div>
                        <CardDescription>Connect to your Logicware portals for shipper sync and tracking.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg bg-muted/20">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Courier Slug</p>
                            <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-sm">{logicwareMeta.slug}</span>
                                <Badge variant="secondary">Official</Badge>
                            </div>
                        </div>
                        <div className="p-4 border rounded-lg bg-muted/20">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Base API URL</p>
                            <div className="flex items-center justify-between">
                                <span className="font-mono text-[10px] truncate max-w-[150px]">{logicwareMeta.baseUrl}</span>
                                <Link href={logicwareMeta.baseUrl} target="_blank"><ExternalLink className="h-3 w-3" /></Link>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="logicware-api-key" className="text-xs font-bold uppercase opacity-60">Logicware Connect API Key</Label>
                            <div className="flex items-center gap-2">
                                <Input 
                                id="logicware-api-key" 
                                type={logicwareApi.isSaved && !logicwareApi.isVisible ? 'password' : 'text'}
                                placeholder="Enter your Logicware API key"
                                value={logicwareApi.key}
                                onChange={(e) => setLogicwareApi(prev => ({...prev, key: e.target.value}))}
                                disabled={logicwareApi.isSaved || isLoadingConfig}
                                className="h-11 border-2"
                                />
                                {logicwareApi.isSaved ? (
                                <>
                                    <Button variant="ghost" size="icon" onClick={() => setLogicwareApi(prev => ({ ...prev, isVisible: !prev.isVisible }))}>
                                        {logicwareApi.isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                    <Button variant="secondary" onClick={handleEditApiKey}>
                                        Edit
                                    </Button>
                                </>
                                ) : (
                                <Button onClick={handleSaveLogicwareKey} disabled={isSavingKey} className="h-11 px-6 font-bold">
                                    {isSavingKey ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Secure Key
                                </Button>
                                )}
                            </div>
                        </div>
                        
                        {logicwareApi.isSaved && (
                            <Button 
                                variant="outline" 
                                className="w-full h-11 font-bold border-2" 
                                onClick={handleTestConnection}
                                disabled={isTesting}
                            >
                                {isTesting ? <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4 text-blue-500" />}
                                Test Logicware Connection
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                <CardTitle>Profile</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-6">
                    <Avatar className="h-32 w-32 border-4 border-primary/10">
                        <AvatarImage src={avatar} alt="User avatar" />
                        <AvatarFallback>SR</AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                        <Button onClick={() => fileInputRef.current?.click()} size="sm" variant="outline">
                            Change Picture
                        </Button>
                        <Input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleAvatarChange}
                            className="hidden"
                            accept="image/png, image/jpeg, image/jpg"
                        />
                        <p className="text-[10px] text-muted-foreground mt-2 uppercase font-bold tracking-widest">
                            JPG or PNG. 1MB max.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}