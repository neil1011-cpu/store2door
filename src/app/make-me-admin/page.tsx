'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MakeAdminPage() {
  const { toast } = useToast();
  const router = useRouter();
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
      await setDoc(adminRoleRef, {
        createdAt: serverTimestamp(),
      });

      toast({
        title: 'Success!',
        description: 'You have been granted admin privileges. Redirecting to the admin login page.',
      });
      
      // Redirect to the admin login page to sign in again with the new privileges.
      router.push('/admin-login');

    } catch (error: any) {
      console.error("Failed to create admin role:", error);
      toast({
        title: 'Error',
        description: 'Could not grant admin privileges. ' + error.message,
        variant: 'destructive',
      });
    } finally {
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
            This is a one-time action. This page should be removed after use.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
