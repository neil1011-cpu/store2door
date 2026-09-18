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
 * @fileOverview Universal Password Reset Interface.
 * Accessed via /reset-password once a recovery session is established.
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
        // Verification: Password update requires an active session
        if (!isAuthLoading && !user) {
            setSessionError('No active recovery session detected. Please request a new reset link.');
        }
    }, [user, isAuthLoading]);

    const handleUpdate = async () => {
        if (!newPassword || newPassword.length < 8) {
            toast({ title: "Secure Entry Required", description: "Password must be at least 8 characters.", variant: "destructive" });
            return;
        }
        if (newPassword !== confirmPassword) {
            toast({ title: "Validation Mismatch", description: "Passwords do not match.", variant: "destructive" });
            return;
        }

        setIsUpdating(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            toast({ title: "Identity Secured", description: "Your new credentials are now active." });
            
            // Log the activity
            await fetch('/api/log-activity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'password_reset_success',
                    description: 'User successfully defined a new access key via recovery flow.',
                    userId: user?.id
                })
            });

            setTimeout(() => router.push('/account'), 1500);
        } catch (error: any) {
            console.error("[SECURITY RESET ERROR]", error);
            toast({ 
                title: "Security Update Failed", 
                description: error.message, 
                variant: "destructive" 
            });
        } finally {
            setIsUpdating(false);
        }
    };

    if (isAuthLoading) {
        return (
            <div className="container mx-auto py-24 flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-12 px-4 flex justify-center items-center min-h-[80vh]">
            <Card className="w-full max-w-md shadow-2xl border-primary/20">
                <CardHeader className="text-center space-y-2 pb-8 bg-primary/5">
                    <div className="mx-auto bg-orange-100 dark:bg-orange-950/40 w-16 h-16 rounded-2xl flex items-center justify-center mb-2">
                        <Lock className="h-8 w-8 text-orange-600" />
                    </div>
                    <CardTitle className="text-2xl font-black italic uppercase tracking-tighter">Security Protocol</CardTitle>
                    <CardDescription className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">
                        Define your new access credentials.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-8 space-y-6">
                    {sessionError ? (
                        <Alert variant="destructive" className="bg-destructive/5 border-dashed">
                            <AlertCircle className="h-5 w-5" />
                            <AlertTitle className="text-xs font-black uppercase">Session Missing</AlertTitle>
                            <AlertDescription className="text-xs leading-relaxed mt-2">
                                {sessionError}
                                <Button variant="link" className="p-0 h-auto font-black uppercase text-[10px] ml-2" onClick={() => router.push('/forgot-password')}>Request New Link</Button>
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="p-4 bg-muted/50 rounded-xl border border-dashed flex gap-4">
                            <ShieldAlert className="h-5 w-5 text-primary shrink-0" />
                            <p className="text-[11px] font-bold leading-relaxed uppercase tracking-tight">
                                Define a unique secure key to protect your global logistics account.
                            </p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase opacity-60">New Secure Key</Label>
                            <Input 
                                type="password" 
                                placeholder="••••••••" 
                                value={newPassword} 
                                onChange={e => setNewPassword(e.target.value)} 
                                className="h-12 border-2"
                                disabled={!!sessionError}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase opacity-60">Confirm Verification</Label>
                            <Input 
                                type="password" 
                                placeholder="••••••••" 
                                value={confirmPassword} 
                                onChange={e => setConfirmPassword(e.target.value)} 
                                className="h-12 border-2"
                                disabled={!!sessionError}
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="pb-8">
                    {!sessionError ? (
                        <Button onClick={handleUpdate} disabled={isUpdating} className="w-full h-14 text-lg font-black uppercase italic shadow-xl">
                            {isUpdating ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <CheckCircle2 className="mr-2 h-6 w-6" />}
                            Finalize Setup
                        </Button>
                    ) : (
                        <Button variant="outline" onClick={() => router.push('/signin')} className="w-full h-12 font-black uppercase italic border-2">Return to Login</Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
