
'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const { toast } = useToast();
  const [avatar, setAvatar] = useState('https://placehold.co/128x128.png');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings.</p>
        </div>
        <Button variant="outline" asChild>
            <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
            </Link>
        </Button>
      </div>

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
    </div>
  );
}
