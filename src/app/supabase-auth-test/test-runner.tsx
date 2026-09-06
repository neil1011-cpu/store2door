'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { createTestUserB, promoteToAdmin, cleanupTestData, signOut } from './actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, Play, Trash2, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type TestResult = {
  name: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL' | 'PENDING';
  error?: string;
};

export function TestRunner() {
  const supabase = createClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testUids, setTestUids] = useState<string[]>([]);
  const [results, setResults] = useState<TestResult[]>([
    { name: '1. Registration', expected: 'Profile and Role created', actual: '', status: 'PENDING' },
    { name: '2. Read Own Profile', expected: 'PASS — own profile readable', actual: '', status: 'PENDING' },
    { name: '3. Read Other Profile', expected: 'PASS — access denied', actual: '', status: 'PENDING' },
    { name: '4. Update Allowed Fields', expected: 'PASS — update succeeds', actual: '', status: 'PENDING' },
    { name: '5. Update Protected Fields', expected: 'PASS — fields immutable', actual: '', status: 'PENDING' },
    { name: '6. Direct Role Mutation', expected: 'PASS — mutations denied', actual: '', status: 'PENDING' },
    { name: '7. Self Promotion (RPC)', expected: 'PASS — unauthorized exception', actual: '', status: 'PENDING' },
    { name: '8. Admin Authorization', expected: 'is_admin() returns true', actual: '', status: 'PENDING' },
    { name: '9. Admin Assign Role', expected: 'PASS — staff role assigned', actual: '', status: 'PENDING' },
    { name: '10. Timestamp Trigger', expected: 'updated_at changes automatically', actual: '', status: 'PENDING' },
  ]);

  const updateResult = (index: number, partial: Partial<TestResult>) => {
    setResults(prev => prev.map((r, i) => i === index ? { ...r, ...partial } : r));
  };

  const runSuite = async () => {
    setLoading(true);
    const uids: string[] = [];

    try {
      // TEST 1: Registration
      const email = `test-a-${Date.now()}@fstd-test.com`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: 'TestPassword123!',
        options: { data: { full_name: 'Test Customer A' } }
      });

      if (authError || !authData.user) throw new Error(`Reg Failed: ${authError?.message}`);
      const userA = authData.user;
      uids.push(userA.id);

      // Wait for trigger
      await new Promise(r => setTimeout(r, 1000));

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', userA.id).single();
      const { data: role } = await supabase.from('app_roles').select('*').eq('user_id', userA.id).single();

      const t1Passed = profile && profile.mailbox_number && role?.role === 'customer';
      updateResult(0, { 
        actual: t1Passed ? `Profile ${profile?.mailbox_number} / Role ${role?.role}` : 'Missing records',
        status: t1Passed ? 'PASS' : 'FAIL'
      });

      // SETUP: Create User B via Admin Action
      const resB = await createTestUserB();
      if (resB.error || !resB.user) throw new Error(`Setup B Failed: ${resB.error}`);
      const userB = resB.user;
      uids.push(userB.id);

      // TEST 2: Read Own
      const { data: ownData } = await supabase.from('profiles').select('*').eq('id', userA.id).single();
      updateResult(1, { actual: ownData ? 'Readable' : 'Denied', status: ownData ? 'PASS' : 'FAIL' });

      // TEST 3: Read B
      const { data: otherData } = await supabase.from('profiles').select('*').eq('id', userB.id);
      const t3Passed = !otherData || otherData.length === 0;
      updateResult(2, { actual: t3Passed ? 'Access Denied' : 'DATA LEAK!', status: t3Passed ? 'PASS' : 'FAIL' });

      // TEST 4: Update Allowed
      const { error: updError } = await supabase.from('profiles').update({ full_name: 'Updated Name' }).eq('id', userA.id);
      updateResult(3, { actual: updError ? updError.message : 'Success', status: updError ? 'FAIL' : 'PASS' });

      // TEST 5: Update Protected (TRN)
      const { error: protError } = await supabase.from('profiles').update({ trn: '999999999' }).eq('id', userA.id);
      const t5Passed = !!protError; // Expecting error
      updateResult(4, { actual: t5Passed ? 'Forbidden' : 'ALLOWED (Critical Security Failure)', status: t5Passed ? 'PASS' : 'FAIL' });

      // TEST 6: Role Mutation
      const { error: roleError } = await supabase.from('app_roles').insert({ user_id: userA.id, role: 'admin' });
      const t6Passed = !!roleError;
      updateResult(5, { actual: t6Passed ? 'Mutation Denied' : 'ALLOWED (Critical Security Failure)', status: t6Passed ? 'PASS' : 'FAIL' });

      // TEST 7: Self Promote (RPC)
      const { error: rpcError } = await supabase.rpc('manage_user_role', { target_user_id: userA.id, new_role: 'admin' });
      const t7Passed = !!rpcError;
      updateResult(6, { actual: t7Passed ? 'RPC Rejected' : 'PROMOTED!', status: t7Passed ? 'PASS' : 'FAIL' });

      // TEST 8: Admin Authorization
      await promoteToAdmin(userA.id);
      const { data: isAdmin } = await supabase.rpc('is_admin');
      updateResult(7, { actual: isAdmin ? 'Verified Admin' : 'Promotion Failed', status: isAdmin ? 'PASS' : 'FAIL' });

      // TEST 9: Admin Assign Role
      const { error: adminRpcError } = await supabase.rpc('manage_user_role', { target_user_id: userB.id, new_role: 'staff' });
      const { data: bRole } = await supabase.from('app_roles').select('role').eq('user_id', userB.id).eq('role', 'staff').single();
      const t9Passed = !adminRpcError && bRole;
      updateResult(8, { actual: t9Passed ? 'Assigned Staff' : 'RPC Failed', status: t9Passed ? 'PASS' : 'FAIL' });

      // TEST 10: Timestamp Trigger
      const before = profile?.updated_at;
      await new Promise(r => setTimeout(r, 1000));
      await supabase.from('profiles').update({ phone: '555-TEST' }).eq('id', userA.id);
      const { data: freshProfile } = await supabase.from('profiles').select('updated_at').eq('id', userA.id).single();
      const t10Passed = freshProfile && freshProfile.updated_at !== before;
      updateResult(9, { actual: t10Passed ? 'Auto-Updated' : 'Stale', status: t10Passed ? 'PASS' : 'FAIL' });

    } catch (err: any) {
      toast({ title: 'Test Interrupt', description: err.message, variant: 'destructive' });
    } finally {
      setTestUids(uids);
      setLoading(false);
      await signOut(); // Ensure session is cleared
    }
  };

  const handleCleanup = async () => {
    setLoading(true);
    await cleanupTestData(testUids);
    setTestUids([]);
    toast({ title: 'Test Data Purged' });
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-muted/50 p-4 rounded-xl border border-dashed">
        <div className="space-y-1">
          <h3 className="font-bold text-sm uppercase tracking-tight">Functional Security Harness</h3>
          <p className="text-[10px] text-muted-foreground uppercase">Isolated Environment • RLS Active • No Secret Key In Browser</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runSuite} disabled={loading} size="sm">
            {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
            Run Suite
          </Button>
          <Button variant="outline" onClick={handleCleanup} disabled={loading || testUids.length === 0} size="sm">
            <Trash2 className="mr-2 h-4 w-4" />
            Cleanup
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {results.map((r, i) => (
          <div key={i} className="flex items-center justify-between p-4 bg-background border rounded-xl shadow-sm">
            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-tight">{r.name}</p>
              <p className="text-[10px] text-muted-foreground font-medium italic">Expected: {r.expected}</p>
              {r.actual && <p className="text-[11px] font-bold text-primary mt-1">Actual: {r.actual}</p>}
            </div>
            <div className="flex items-center gap-3">
              {r.status === 'PASS' && <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" /> PASS</Badge>}
              {r.status === 'FAIL' && <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> FAIL</Badge>}
              {r.status === 'PENDING' && <Badge variant="outline" className="animate-pulse">PENDING</Badge>}
            </div>
          </div>
        ))}
      </div>

      {testUids.length > 0 && (
        <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl flex gap-3 items-center">
          <ShieldAlert className="h-5 w-5 text-orange-600" />
          <p className="text-[10px] font-bold text-orange-800 uppercase leading-relaxed">
            Active test users: {testUids.length}. Perform cleanup before leaving this terminal to avoid orphan Auth records.
          </p>
        </div>
      )}
    </div>
  );
}
