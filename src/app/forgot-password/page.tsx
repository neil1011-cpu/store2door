'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getSiteOrigin } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, Mail, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimit, setIsRateLimit] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setIsRateLimit(false);

    try {
      const supabase = createClient();
      const origin = getSiteOrigin();
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/reset-password`,
      });

      if (resetError) {
        if (resetError.message?.toLowerCase().includes('rate limit')) {
          setIsRateLimit(true);
          throw new Error('Supabase email protection rate limit exceeded.');
        }
        throw resetError;
      }

      setSuccess(true);
    } catch (err: any) {
      console.error('[PASSWORD_RESET_ERROR]', err);
      setError(err.message || 'An unexpected authentication disruption occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 font-body">
      <Card className="w-full max-w-md shadow-lg border">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-headline font-bold text-center">
            Account Recovery
          </CardTitle>
          <CardDescription className="text-center">
            Provide your email address to receive a secure recovery key.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4 py-2">
              <Alert className="border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle className="font-semibold font-headline">Dispatched Successfully</AlertTitle>
                <AlertDescription className="text-sm">
                  A verification link has been sent to <strong>{email}</strong>. Check your inbox and spam folders.
                </AlertDescription>
              </Alert>
              <p className="text-xs text-muted-foreground text-center">
                Clicking the secure link will automatically authorize your session and open the password configuration form.
              </p>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="font-headline font-semibold">System Notification</AlertTitle>
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}

              {isRateLimit && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2 text-xs text-amber-700 dark:text-amber-400">
                  <div className="flex items-center gap-1.5 font-semibold text-sm">
                    <ShieldAlert className="h-4 w-4 text-amber-600" />
                    How to fix this in your Dashboard:
                  </div>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Go to your <strong>Supabase Dashboard</strong>.</li>
                    <li>Navigate to <strong>Authentication</strong> &rarr; <strong>Provider Settings</strong>.</li>
                    <li>Expand the <strong>Email</strong> section.</li>
                    <li>Change <strong>Rate Limit</strong> (or <em>Minimum time between emails</em>) from <code>3600</code> to <code>5</code> seconds.</li>
                    <li>Click <strong>Save changes</strong> to completely unblock continuous testing.</li>
                  </ol>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Registered Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full font-headline" disabled={loading}>
                {loading ? 'Processing Registry Request...' : 'Dispatch Reset Link'}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center border-t pt-4">
          <Link
            href="/signin"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to authentication gate
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
