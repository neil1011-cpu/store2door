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
import Link from 'next/link';

/**
 * @fileOverview Unified Password Reset Interface.
 * Handles both the forced first-time reset and the PKCE recovery flow.
 */
export default function ResetPasswordPage() {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [sessionError, setSessionError] = useState<string | null>(null);
    const { supabase, user, isLoading: isAuthLoading } = useSupabase();
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        // Only trigger session missing error if we aren't loading and there's no user at all.
        // If there's a user, it's either an active recovery session or a forced-reset session.
        if (!isAuthLoading && !user) {
            setSessionError('Security session missing. Your recovery link may have expired or been used already.');
        }
    }, [user, isAuthLoading]);

    const handleUpdate = async () => {
        if (!newPassword || newPassword.length < 8) {
            toast({ title: "Security Alert", description: "Password must be at least 8 characters.", variant: "destructive" });
            return;
        }
        if (newPassword !== confirmPassword) {
            toast({ title: "Verification Error", description: "Passwords do not match.", variant: "destructive" });
            return;
        }

        setIsUpdating(true);
        try {
            // Update the password and clear the force-reset flag in one go
            const { error } = await supabase.auth.updateUser({ 
                password: newPassword,
                data: { needs_password_reset: false } 
            });
            
            if (error) throw error;

            toast({ title: "Access Key Updated", description: "Your credentials have been successfully updated." });
            setIsSuccess(true);
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
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Authorizing Security Terminal...</p>
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div className="container mx-auto py-12 px-4 flex justify-center items-center min-h-[80vh]">
                <Card className="w-full max-w-md shadow-2xl border-green-200">
                    <CardHeader className="text-center bg-green-50/50 pb-8">
                        <div className="mx-auto bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="h-10 w-10 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl font-black italic uppercase tracking-tighter">Identity Secured</CardTitle>
                        <CardDescription className="font-bold text-[10px] uppercase tracking-widest text-green-700">Credential update complete.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 text-center">
                        <p className="text-sm font-medium text-muted-foreground mb-8">Your new access key is now active across the global logistics OS.</p>
                        <Button className="w-full h-14 font-black uppercase italic text-lg shadow-lg" asChild>
                            <Link href="/account">Proceed to Dashboard</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const isForcedReset = user?.user_metadata?.needs_password_reset;

    return (
        <div className="container mx-auto py-12 px-4 flex justify-center items-center min-h-[80vh]">
            <Card className="w-full max-w-md shadow-2xl border-primary/20">
                <CardHeader className="text-center space-y-2 pb-8 bg-primary/5">
                    <div className="mx-auto bg-orange-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-2"><Lock className="h-8 w-8 text-orange-600" /></div>
                    <CardTitle className="text-2xl font-black italic uppercase tracking-tighter">
                        {isForcedReset ? 'Finalize Setup' : 'New Access Key'}
                    </CardTitle>
                    <CardDescription className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">
                        {isForcedReset ? 'You must define your own password to continue.' : 'Define your secure entry credentials.'}
                    </CardDescription>
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
                            <p className="text-[11px] font-bold leading-relaxed uppercase tracking-tight">Set a strong password to protect your global shipping registry and mailbox data.</p>
                        </div>
                    )}

                    {!sessionError && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase opacity-60">New Access Key</Label>
                                <Input type="password" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="h-12 border-2" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase opacity-60">Confirm Verification</Label>
                                <Input type="password" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="h-12 border-2" />
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="pb-8">
                    {!sessionError ? (
                        <Button onClick={handleUpdate} disabled={isUpdating} className="w-full h-14 text-lg font-black uppercase italic shadow-xl">
                            {isUpdating ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <CheckCircle2 className="mr-2 h-6 w-6" />} Finalize Setup
                        </Button>
                    ) : (
                        <Button variant="ghost" onClick={() => router.push('/signin')} className="w-full h-12 font-black uppercase italic opacity-60">Return to Sign In</Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
