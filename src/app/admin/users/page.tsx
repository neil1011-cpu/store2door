'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Loader2, UserPlus, ShieldCheck, AlertCircle, MailCheck, Database, ArrowRight, RefreshCcw, Zap, Search, Mail, CheckCircle2 } from 'lucide-react';
import { useSupabase } from '@/components/supabase-provider';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export default function UsersPage() {
  const { supabase } = useSupabase();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [lastError, setLastError] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selection State
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    trn: '',
    isAdmin: false,
    mailboxNumber: '',
    sendWelcomeEmail: true
  });

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setLastError(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, app_roles(role)')
        .order('full_name', { ascending: true });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
        console.error("[USERS_FETCH_ERROR]", error);
        setLastError(error);
        toast({ 
            title: "Registry Sync Failure", 
            description: error.message || "Ensure you have authorized your Admin role in PostgreSQL.", 
            variant: "destructive" 
        });
    } finally {
        setIsLoading(false);
    }
  }, [supabase, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    const s = searchTerm.toLowerCase();
    return users.filter(u => 
        u.full_name?.toLowerCase().includes(s) || 
        u.email?.toLowerCase().includes(s) || 
        u.mailbox_number?.toLowerCase().includes(s)
    );
  }, [users, searchTerm]);

  const toggleSelectAll = () => {
    if (selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const toggleSelectUser = (id: string) => {
    const next = new Set(selectedUserIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedUserIds(next);
  };

  const handleBulkSync = async () => {
    setIsBulkProcessing(true);
    let success = 0;
    let failed = 0;

    try {
      for (const id of Array.from(selectedUserIds)) {
        try {
          const res = await fetch('/api/admin/logicware-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profileId: id })
          });
          if (res.ok) success++;
          else failed++;
        } catch (e) {
          failed++;
        }
      }

      toast({ 
        title: "Bulk Sync Complete", 
        description: `Successfully synchronized ${success} profiles. Errors: ${failed}.` 
      });
      setSelectedUserIds(new Set());
      fetchUsers();
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleCreateUser = async () => {
      if (!newUser.email || !newUser.firstName || !newUser.lastName) {
          toast({ title: "Missing Required Fields", variant: "destructive" });
          return;
      }

      setIsCreating(true);
      setLastError(null);
      try {
          const { data: { session } } = await supabase.auth.getSession();
          const accessToken = session?.access_token;

          const response = await fetch('/api/admin/create-user', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': accessToken ? `Bearer ${accessToken}` : ''
              },
              body: JSON.stringify(newUser)
          });

          const result = await response.json();
          
          if (!response.ok) {
            setLastError(result);
            throw new Error(result.message || 'Operation failed.');
          }

          toast({ 
            title: "Identity Created", 
            description: newUser.sendWelcomeEmail 
                ? `Account for ${newUser.email} is active and reset link dispatched.` 
                : `Account for ${newUser.email} is active.` 
          });
          
          setIsAddUserOpen(false);
          setNewUser({ firstName: '', lastName: '', email: '', phone: '', trn: '', isAdmin: false, mailboxNumber: '', sendWelcomeEmail: true });
          fetchUsers();
      } catch (error: any) {
          toast({ title: "Operation Failed", description: error.message, variant: "destructive" });
      } finally {
          setIsCreating(false);
      }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary">Identity Registry</h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] mt-1">Universal Account & RBAC Central</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
            {selectedUserIds.size > 0 && (
                <div className="flex items-center gap-2 mr-2 bg-primary/5 p-1 rounded-lg border-2 border-primary/20 animate-in fade-in slide-in-from-right-4">
                    <Badge className="font-black italic ml-2">{selectedUserIds.size} SELECTED</Badge>
                    <Button onClick={handleBulkSync} disabled={isBulkProcessing} size="sm" variant="secondary" className="font-black uppercase italic text-[10px]">
                        {isBulkProcessing ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Zap className="mr-2 h-3.5 w-3.5 text-blue-500" />}
                        Bulk Hub Sync
                    </Button>
                    <Button size="sm" variant="outline" asChild className="font-black uppercase italic text-[10px] border-2">
                        <Link href="/admin/communications">
                            <Mail className="mr-2 h-3.5 w-3.5" /> Bulk Message
                        </Link>
                    </Button>
                </div>
            )}
            <Button variant="outline" onClick={fetchUsers} disabled={isLoading} className="font-bold border-2">
                <RefreshCcw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} /> Sync
            </Button>
            <Button variant="outline" asChild className="font-bold border-2">
                <Link href="/admin/migration">
                    <Database className="mr-2 h-4 w-4" /> Migrate
                </Link>
            </Button>
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                <DialogTrigger asChild>
                    <Button className="font-black uppercase italic shadow-lg">
                        <PlusCircle className="mr-2 h-4 w-4" /> New Client
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-center">New Global Identity</DialogTitle>
                        <DialogDescription className="font-bold text-[10px] uppercase tracking-widest text-center">Register a new client or administrator</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {lastError && (
                        <Alert variant="destructive" className="bg-red-50 border-red-200">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle className="text-xs font-bold uppercase">System Diagnostic</AlertTitle>
                            <AlertDescription className="text-[10px] font-mono whitespace-pre-wrap mt-1 overflow-auto max-h-[150px]">
                            {JSON.stringify(lastError, null, 2)}
                            </AlertDescription>
                        </Alert>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase opacity-60">First Name</Label>
                                <Input value={newUser.firstName} onChange={e => setNewUser({...newUser, firstName: e.target.value})} className="h-11 border-2" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase opacity-60">Last Name</Label>
                                <Input value={newUser.lastName} onChange={e => setNewUser({...newUser, lastName: e.target.value})} className="h-11 border-2" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase opacity-60">Email Address</Label>
                            <Input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="h-11 border-2" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase opacity-60">FSTD Mailbox Number (Optional)</Label>
                            <Input value={newUser.mailboxNumber} onChange={e => setNewUser({...newUser, mailboxNumber: e.target.value.toUpperCase()})} placeholder="e.g. FSTD1234" className="h-11 border-2 font-mono uppercase" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase opacity-60">Phone</Label>
                                <Input value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} className="h-11 border-2" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase opacity-60">TRN</Label>
                                <Input value={newUser.trn} onChange={e => setNewUser({...newUser, trn: e.target.value})} maxLength={9} className="h-11 border-2 font-mono" />
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border-2 border-dashed border-primary/20">
                                <div className="space-y-0.5">
                                    <Label className="text-xs font-black uppercase flex items-center gap-2">
                                        <MailCheck className="h-3 w-3 text-primary" /> Welcome Protocol
                                    </Label>
                                    <p className="text-[9px] text-muted-foreground uppercase font-bold">Dispatch Reset Email Immediately</p>
                                </div>
                                <Switch checked={newUser.sendWelcomeEmail} onCheckedChange={checked => setNewUser({...newUser, sendWelcomeEmail: checked})} />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border-2 border-dashed">
                                <div className="space-y-0.5">
                                    <Label className="text-xs font-bold uppercase">Grant Admin Access</Label>
                                    <p className="text-[9px] text-muted-foreground uppercase">Enable full dashboard management</p>
                                </div>
                                <Switch checked={newUser.isAdmin} onCheckedChange={checked => setNewUser({...newUser, isAdmin: checked})} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <DialogClose asChild><Button variant="outline" className="font-bold h-12 uppercase">Cancel</Button></DialogClose>
                        <Button onClick={handleCreateUser} disabled={isCreating} className="flex-1 h-12 font-black uppercase italic shadow-xl">
                            {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-5 w-5" />}
                            Authorize Creation
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
      </div>

      <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search name, email, or mailbox number..." 
            className="pl-10 h-12 border-2 shadow-sm rounded-xl max-w-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
      </div>

      {users.length === 0 && !isLoading && (
        <Alert className="bg-primary/5 border-primary/20 shadow-lg border-2">
            <Database className="h-5 w-5 text-primary" />
            <AlertTitle className="font-black uppercase italic tracking-tight">Identity Registry Empty</AlertTitle>
            <AlertDescription className="text-xs font-medium uppercase tracking-widest leading-relaxed mt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <span>Your Supabase identity registry is currently empty or RLS is blocking access.</span>
                <Button size="sm" asChild className="font-bold h-8 px-4 text-[10px]">
                    <Link href="/admin/migration">Launch Migration Matrix <ArrowRight className="ml-2 h-3 w-3" /></Link>
                </Button>
            </AlertDescription>
        </Alert>
      )}

      <Card className="shadow-2xl border-none overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="h-12">
                <TableHead className="w-[50px] pl-6 text-center">
                  <Checkbox 
                    checked={selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0} 
                    onCheckedChange={toggleSelectAll} 
                  />
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Identity</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Mailbox</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Role</TableHead>
                <TableHead className="text-right pr-6 text-[10px] font-black uppercase tracking-widest">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center">
                        <Loader2 className="animate-spin h-10 w-10 mx-auto text-primary" />
                        <p className="text-[10px] font-bold uppercase mt-2 opacity-40">Syncing Registry...</p>
                    </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map(u => (
                    <TableRow key={u.id} className={cn("hover:bg-primary/5 transition-colors h-20", selectedUserIds.has(u.id) && "bg-primary/5")}>
                    <TableCell className="pl-6 text-center">
                        <Checkbox 
                        checked={selectedUserIds.has(u.id)} 
                        onCheckedChange={() => toggleSelectUser(u.id)} 
                        />
                    </TableCell>
                    <TableCell>
                        <p className="font-black text-primary uppercase text-sm">{u.full_name}</p>
                        <p className="text-[10px] font-mono opacity-60 uppercase tracking-tighter">{u.email}</p>
                    </TableCell>
                    <TableCell className="font-mono font-bold">
                        <Badge variant="outline" className="h-8 px-4 font-black italic border-2">{u.mailbox_number}</Badge>
                    </TableCell>
                    <TableCell>
                        <div className="flex gap-1">
                            {u.app_roles?.map((r: any) => (
                                <Badge key={r.role} variant={r.role === 'admin' ? 'default' : 'secondary'} className="capitalize text-[8px] font-black italic tracking-widest border-2">
                                    {r.role === 'admin' && <ShieldCheck className="h-2 w-2 mr-1" />}
                                    {r.role}
                                </Badge>
                            ))}
                        </div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                        <Button variant="outline" size="sm" asChild className="h-9 font-black uppercase italic text-[10px] border-2 shadow-sm px-6">
                            <Link href={`/admin/users/${u.id}`}>Audit Record</Link>
                        </Button>
                    </TableCell>
                    </TableRow>
                ))
              )}
              {filteredUsers.length === 0 && !isLoading && (
                  <TableRow>
                      <TableCell colSpan={5} className="h-48 text-center text-muted-foreground italic opacity-30">
                          No identities match your search parameters.
                      </TableCell>
                  </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}