
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';

export default function MakeAdminPage() {
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [loading, setLoading] = useState(false);

  const handleMakeAdmin = async () => {
    if (!user) {
      toast({
        title: 'Not Signed In',
        description: 'You must be signed in to perform this action.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const adminRoleRef = doc(firestore, 'roles_admin', user.uid);
      // We are intentionally not using the non-blocking version here.
      // We need to wait for this operation to complete before we sign out.
      await setDoc(adminRoleRef, {
        createdAt: serverTimestamp(),
      });
      
      toast({
        title: 'Admin Role Granted!',
        description: 'You will be signed out. Please log in again at the admin page.',
      });

      // Wait a moment for the toast to be visible, then sign out and redirect.
      setTimeout(async () => {
        await signOut(auth);
        router.push('/admin-login');
      }, 2000);

    } catch (error: any) {
      console.error("Failed to create admin role:", error);
      toast({
        title: 'Error',
        description: 'Could not grant admin privileges. ' + error.message,
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
       <div className="container mx-auto py-12 px-4 md:px-6 max-w-lg">
         <Card>
            <CardHeader>
                <CardTitle>Action Required</CardTitle>
                <CardDescription>Please sign in to the application first, then return to this page to grant yourself admin privileges.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button className="w-full" onClick={() => router.push('/signin')}>Go to Sign In</Button>
            </CardContent>
         </Card>
       </div>
    )
  }

  return (
    <div className="container mx-auto py-12 px-4 md:px-6 max-w-lg">
      <Card>
        <CardHeader className="text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="text-3xl mt-4">Become Administrator</CardTitle>
          <CardDescription>
            You are signed in as <span className="font-bold">{user.email}</span>. Click the button below to grant this user full administrative privileges.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            size="lg"
            className="w-full"
            onClick={handleMakeAdmin}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="mr-2 h-4 w-4" />
            )}
            Make Me Admin
          </Button>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            You will be signed out and redirected after clicking this button. This page should be removed after use.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
