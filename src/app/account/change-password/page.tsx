
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldAlert, Loader2, CheckCircle2, Lock } from 'lucide-react';
import { useSupabase } from '@/components/supabase-provider';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function ChangePasswordPage() {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const { supabase } = useSupabase();
    const { toast } = useToast();
    const router = useRouter();

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
            router.push('/account');
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

    return (
        <div className="container mx-auto py-12 px-4 flex justify-center items-center min-h-[80vh]">
            <Card className="w-full max-w-md shadow-2xl border-primary/20">
                <CardHeader className="text-center space-y-2 pb-8 bg-primary/5">
                    <div className="mx-auto bg-orange-100 dark:bg-orange-950/40 w-16 h-16 rounded-2xl flex items-center justify-center mb-2">
                        <Lock className="h-8 w-8 text-orange-600" />
                    </div>
                    <CardTitle className="text-2xl font-black italic uppercase tracking-tighter">Security Protocol</CardTitle>
                    <CardDescription className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">
                        Define your new Supabase access credentials.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-8 space-y-6">
                    <div className="p-4 bg-muted/50 rounded-xl border border-dashed flex gap-4">
                        <ShieldAlert className="h-5 w-5 text-primary shrink-0" />
                        <p className="text-[11px] font-bold leading-relaxed uppercase tracking-tight">
                            Define a unique secure key to protect your global logistics account.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase opacity-60">New Secure Key</Label>
                            <Input 
                                type="password" 
                                placeholder="••••••••" 
                                value={newPassword} 
                                onChange={e => setNewPassword(e.target.value)} 
                                className="h-12 border-2"
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
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="pb-8">
                    <Button onClick={handleUpdate} disabled={isUpdating} className="w-full h-14 text-lg font-black uppercase italic shadow-xl">
                        {isUpdating ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <CheckCircle2 className="mr-2 h-6 w-6" />}
                        Finalize Setup
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
