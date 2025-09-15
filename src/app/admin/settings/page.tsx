
'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, KeyRound, Moon, Sun, Laptop, Edit, Check } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsPage() {
  const { toast } = useToast();
  const [avatar, setAvatar] = useState('https://placehold.co/128x128.png');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [apiKey, setApiKey] = useState('');
  const [isKeySaved, setIsKeySaved] = useState(false);
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

  const handleSaveApiKey = () => {
    if (!apiKey) {
      toast({
        title: 'API Key is empty',
        description: 'Please enter an API key to save.',
        variant: 'destructive',
      });
      return;
    }
    setIsKeySaved(true);
    toast({
      title: 'API Key Saved',
      description: 'Your ipack API key has been securely saved.',
    });
  };

  const handleEditApiKey = () => {
    setIsKeySaved(false);
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
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>Manage API keys for external services.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div>
              <Label htmlFor="ipack-api-key" className="flex items-center gap-2 mb-2">
                <KeyRound className="h-4 w-4" />
                <span>ipack API Key</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input 
                  id="ipack-api-key" 
                  type="password" 
                  placeholder="Enter your ipack API key"
                  value={isKeySaved ? '••••••••••••••••••••' : apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={isKeySaved}
                  readOnly={isKeySaved}
                />
                {isKeySaved ? (
                  <Button variant="secondary" onClick={handleEditApiKey}>
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </Button>
                ) : (
                  <Button onClick={handleSaveApiKey}>
                    <Check className="mr-2 h-4 w-4" /> Save Key
                  </Button>
                )}
              </div>
            </div>
        </CardContent>
      </Card>

    </div>
  );
}
