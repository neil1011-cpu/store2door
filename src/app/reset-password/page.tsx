'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldAlert, Loader2, CheckCircle2, Lock, AlertCircle } from 'lucide-react';
import { useSupabase } from '@/components/supabase-provider';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/**
 * Universal Set New Password Page.
 * This page is shown after the /auth/callback exchanges the PKCE code for a session.
 */
export default function ResetPasswordPage() {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [sessionError, setSessionError] = useState<string | null>(null);
    const { supabase, user, isLoading: isAuthLoading } = useSupabase();
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        // Verification: If auth loading is done and there's no user, the callback failed to establish a session
        if (!isAuthLoading && !user) {
            setSessionError('Security session missing. The reset link may have expired or was used already.');
        }
    }, [user, isAuthLoading]);

    const handleUpdate = async () => {
        if (!newPassword || newPassword.length < 8) {
            toast({ title: "Security Alert", description: "Minimum 8 characters required.", variant: "destructive" });
            return;
        }
        if (newPassword !== confirmPassword) {
            toast({ title: "Mismatch", description: "Verification password does not match.", variant: "destructive" });
            return;
        }

        setIsUpdating(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;

            toast({ title: "Access Key Updated", description: "Identity registry updated successfully." });
            setTimeout(() => router.push('/account'), 1500);
        } catch (error: any) {
            toast({ title: "Update Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    if (isAuthLoading) {
        return (
            <div className="container mx-auto py-24 flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Verifying Security Session...</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-12 px-4 flex justify-center items-center min-h-[80vh]">
            <Card className="w-full max-w-md shadow-2xl border-primary/20">
                <CardHeader className="text-center space-y-2 pb-8 bg-primary/5">
                    <div className="mx-auto bg-orange-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-2"><Lock className="h-8 w-8 text-orange-600" /></div>
                    <CardTitle className="text-2xl font-black italic uppercase tracking-tighter">New Access Key</CardTitle>
                    <CardDescription className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Finalize your logistics identity setup.</CardDescription>
                </CardHeader>
                <CardContent className="pt-8 space-y-6">
                    {sessionError ? (
                        <Alert variant="destructive" className="bg-destructive/5 border-dashed">
                            <AlertCircle className="h-5 w-5" />
                            <AlertTitle className="text-xs font-black uppercase">Authentication Error</AlertTitle>
                            <AlertDescription className="text-xs leading-relaxed mt-2">
                                {sessionError}
                                <div className="mt-4">
                                    <Button variant="outline" className="w-full h-10 font-black uppercase text-[10px]" onClick={() => router.push('/forgot-password')}>Request New Link</Button>
                                </div>
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="p-4 bg-muted/50 rounded-xl border border-dashed flex gap-4">
                            <ShieldAlert className="h-5 w-5 text-primary shrink-0" />
                            <p className="text-[11px] font-bold leading-relaxed uppercase tracking-tight">Define a strong access key to protect your global shipping registry.</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase opacity-60">New Access Key</Label>
                            <Input type="password" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="h-12 border-2" disabled={!!sessionError} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase opacity-60">Confirm Verification</Label>
                            <Input type="password" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="h-12 border-2" disabled={!!sessionError} />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="pb-8">
                    {!sessionError ? (
                        <Button onClick={handleUpdate} disabled={isUpdating} className="w-full h-14 text-lg font-black uppercase italic shadow-xl">
                            {isUpdating ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <CheckCircle2 className="mr-2 h-6 w-6" />} Finalize Protocol
                        </Button>
                    ) : (
                        <Button variant="ghost" onClick={() => router.push('/signin')} className="w-full h-12 font-black uppercase italic opacity-60">Return to Sign In</Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
