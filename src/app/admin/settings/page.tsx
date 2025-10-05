
'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, KeyRound, Moon, Sun, Laptop, Edit, Check, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

type ApiKeyState = {
    key: string;
    isSaved: boolean;
    isVisible: boolean;
};

export default function SettingsPage() {
  const { toast } = useToast();
  const [avatar, setAvatar] = useState('https://placehold.co/128x128.png');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [partyApi, setPartyApi] = useState<ApiKeyState>({ key: '', isSaved: false, isVisible: false });
  const [coloaderApi, setColoaderApi] = useState<ApiKeyState>({ key: '', isSaved: false, isVisible: false });

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

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

  const handleSaveApiKey = (
    state: ApiKeyState, 
    setter: React.Dispatch<React.SetStateAction<ApiKeyState>>, 
    keyName: string
  ) => {
    if (!state.key) {
      toast({
        title: `${keyName} is empty`,
        description: `Please enter an API key to save.`,
        variant: 'destructive',
      });
      return;
    }
    setter({ ...state, isSaved: true, isVisible: false });
    toast({
      title: 'API Key Saved',
      description: `Your ${keyName} has been securely saved.`,
    });
  };

  const handleEditApiKey = (
    setter: React.Dispatch<React.SetStateAction<ApiKeyState>>
  ) => {
    setter(prev => ({ ...prev, isSaved: false }));
  }

  const handleToggleVisibility = (
    setter: React.Dispatch<React.SetStateAction<ApiKeyState>>
  ) => {
    setter(prev => ({ ...prev, isVisible: !prev.isVisible }));
  }

  return (
    <div className="flex flex-col gap-6">
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

      <Card>
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
          <CardDescription>Update your profile picture.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <Avatar className="h-32 w-32">
              <AvatarImage src={avatar} alt="User avatar" />
              <AvatarFallback>SR</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-2">
              <Button onClick={() => fileInputRef.current?.click()}>
                Change Picture
              </Button>
              <Input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                className="hidden"
                accept="image/png, image/jpeg, image/jpg"
              />
              <p className="text-sm text-muted-foreground">
                JPG, JPEG, or PNG. 1MB max.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

       <Card>
        <CardHeader>
          <CardTitle>API Access Tokens</CardTitle>
          <CardDescription>Manage API access tokens used to allow access to third parties.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            {/* 3Party Warehouse API Key */}
            <div>
              <Label htmlFor="3party-api-key" className="flex items-center gap-2 mb-2 font-semibold">
                <span>3Party Warehouse Integration Token</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input 
                  id="3party-api-key" 
                  type={partyApi.isSaved && !partyApi.isVisible ? 'password' : 'text'}
                  placeholder="Enter your 3Party Warehouse token"
                  value={partyApi.key}
                  onChange={(e) => setPartyApi(prev => ({...prev, key: e.target.value}))}
                  disabled={partyApi.isSaved}
                  readOnly={partyApi.isSaved}
                />
                {partyApi.isSaved ? (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => handleToggleVisibility(setPartyApi)}>
                        {partyApi.isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="secondary" onClick={() => handleEditApiKey(setPartyApi)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => handleSaveApiKey(partyApi, setPartyApi, '3Party Warehouse API Key')}>
                    <Check className="mr-2 h-4 w-4" /> Save
                  </Button>
                )}
              </div>
            </div>

            {/* Co-loader API Key */}
            <div>
              <Label htmlFor="coloader-api-key" className="flex items-center gap-2 mb-2 font-semibold">
                <span>Co-loader Data To Access Token</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input 
                  id="coloader-api-key" 
                  type={coloaderApi.isSaved && !coloaderApi.isVisible ? 'password' : 'text'}
                  placeholder="Enter your Co-loader token"
                  value={coloaderApi.key}
                  onChange={(e) => setColoaderApi(prev => ({...prev, key: e.target.value}))}
                  disabled={coloaderApi.isSaved}
                  readOnly={coloaderApi.isSaved}
                />
                {coloaderApi.isSaved ? (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => handleToggleVisibility(setColoaderApi)}>
                        {coloaderApi.isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="secondary" onClick={() => handleEditApiKey(setColoaderApi)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => handleSaveApiKey(coloaderApi, setColoaderApi, 'Co-loader API Key')}>
                    <Check className="mr-2 h-4 w-4" /> Save
                  </Button>
                )}
              </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

    