'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Send, History, PlusCircle, AlertCircle, CheckCircle2, Eye, Mail, User, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSupabase } from '@/components/supabase-provider';

type SentEmail = {
    id: string;
    recipient_email: string;
    recipient_name: string;
    subject: string;
    body_content: string;
    status: 'sent' | 'simulated' | 'failed';
    sent_at: string;
};

export default function CommunicationsPage() {
    const { toast } = useToast();
    const { supabase } = useSupabase();
    
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [composeRecipient, setComposeRecipient] = useState('');
    const [customEmail, setCustomEmail] = useState('');
    const [composeSubject, setComposeSubject] = useState('');
    const [composeBody, setComposeBody] = useState('');
    const [isComposing, setIsComposing] = useState(false);
    
    const [users, setUsers] = useState<any[]>([]);
    const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [viewingEmail, setViewingEmail] = useState<SentEmail | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [usersRes, emailsRes] = await Promise.all([
                supabase.from('profiles').select('*').order('full_name', { ascending: true }),
                supabase.from('sent_emails').select('*').order('sent_at', { ascending: false })
            ]);

            setUsers(usersRes.data || []);
            setSentEmails(emailsRes.data || []);
        } catch (error: any) {
            console.error('Fetch error:', error);
            toast({ title: 'Sync Failure', description: 'Could not load registry records.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleComposeEmail = async () => {
        const isBulkSend = composeRecipient === 'all';
        const isCustomEmail = composeRecipient === 'custom';

        let emailTarget: string | string[] = '';
        let recipientName = '';

        if (isBulkSend) {
          emailTarget = users.map(u => u.email);
          recipientName = 'All Users';
        } else if (isCustomEmail) {
            if (!customEmail.trim()) {
                toast({ title: 'Missing fields', description: 'Enter custom address.', variant: 'destructive' });
                return;
            }
            emailTarget = customEmail;
            recipientName = customEmail;
        } else {
            const recipientUser = users.find(u => u.id === composeRecipient);
            if (recipientUser) {
              emailTarget = recipientUser.email;
              recipientName = recipientUser.full_name;
            }
        }
        
        if (!emailTarget || !composeSubject.trim() || !composeBody.trim()) {
            toast({ title: 'Missing fields', description: 'Complete all message details.', variant: 'destructive' });
            return;
        }

        setIsComposing(true);
        
        try {
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: emailTarget,
                    subject: composeSubject,
                    body: composeBody,
                    recipientName: recipientName
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to dispatch.');

            if (data.simulated) {
                toast({ 
                    title: 'Simulation Active', 
                    description: 'Email logged but NOT sent. Please configure SMTP in Settings.',
                });
            } else {
                toast({ title: 'Email Sent!', description: `Delivered to ${recipientName}.` });
            }
            
            setIsComposeOpen(false);
            setComposeRecipient('');
            setCustomEmail('');
            setComposeSubject('');
            setComposeBody('');
            fetchData(); // Refresh history
        } catch (error: any) {
             toast({ title: 'Dispatch Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsComposing(false);
        }
    }

    const handleDeleteEmail = async (emailId: string) => {
        setIsDeleting(emailId);
        try {
            const { error } = await supabase.from('sent_emails').delete().eq('id', emailId);
            if (error) throw error;
            toast({ title: 'Record Removed' });
            fetchData();
        } catch (error: any) {
            toast({ title: 'Deletion Failed', description: error.message, variant: 'destructive' });
        } finally {
            setIsDeleting(null);
        }
    }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full max-w-6xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary">Communications Hub</h1>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px] mt-1">Official Supabase-powered correspondence center.</p>
        </div>
        <div className="flex items-center gap-2">
           <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
            <DialogTrigger asChild>
                <Button className="font-black uppercase italic tracking-tight shadow-lg">
                    <PlusCircle className="mr-2 h-4 w-4" /> Compose Message
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-center">New Official Correspondence</DialogTitle>
                    <DialogDescription className="font-bold text-[10px] uppercase tracking-widest text-center">Dispatch automated or custom logistics updates</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase opacity-60">Recipient Selection</Label>
                         <Select value={composeRecipient} onValueChange={setComposeRecipient}>
                            <SelectTrigger className="h-12 border-2">
                                <SelectValue placeholder={"Select a customer or group"} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="font-bold uppercase text-xs">All Clients ({users.length})</SelectItem>
                                <SelectItem value="custom" className="font-bold uppercase text-xs">Manual Entry</SelectItem>
                                {users.map(user => (
                                    <SelectItem key={user.id} value={user.id} className="font-medium">{user.full_name} ({user.email})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {composeRecipient === 'custom' && (
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase opacity-60">Manual Email</Label>
                          <Input type="email" value={customEmail} onChange={e => setCustomEmail(e.target.value)} placeholder="target@example.com" className="h-12 border-2" />
                      </div>
                    )}
                     <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase opacity-60">Subject Header</Label>
                        <Input value={composeSubject} onChange={e => setComposeSubject(e.target.value)} placeholder="e.g. Package Status Update" className="h-12 border-2 font-bold" />
                    </div>
                     <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase opacity-60">Message Content</Label>
                        <Textarea value={composeBody} onChange={e => setComposeBody(e.target.value)} placeholder="Type your message here..." className="min-h-[200px] border-2" />
                    </div>
                </div>
                <DialogFooter className="gap-2">
                    <DialogClose asChild><Button variant="outline" className="font-bold h-14 uppercase">Cancel</Button></DialogClose>
                    <Button onClick={handleComposeEmail} disabled={isComposing} className="flex-1 h-14 text-lg font-black uppercase italic shadow-xl">
                        {isComposing ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Send className="mr-2 h-6 w-6" />}
                        Authorize Dispatch
                    </Button>
                </DialogFooter>
            </DialogContent>
           </Dialog>
          <Button variant="outline" asChild className="font-bold border-2">
            <Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" /> Dashboard</Link>
          </Button>
        </div>
      </div>
      
        <Card className="shadow-2xl border-none overflow-hidden rounded-2xl">
            <CardHeader className="bg-muted/10 border-b">
                <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" /> Outbound Dispatch History
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Master audit trail of all correspondence.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead className="pl-6 text-[10px] font-black uppercase">Recipient</TableHead>
                            <TableHead className="text-[10px] font-black uppercase">Subject</TableHead>
                            <TableHead className="text-[10px] font-black uppercase">System Status</TableHead>
                            <TableHead className="text-right pr-6 text-[10px] font-black uppercase">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sentEmails.length > 0 ? (
                            sentEmails.map(email => (
                                <TableRow key={email.id} className="hover:bg-primary/5 transition-colors h-20">
                                    <TableCell className="pl-6">
                                        <p className="font-black text-sm uppercase">{email.recipient_name}</p>
                                        <p className="text-[10px] font-mono opacity-60 uppercase">{email.recipient_email}</p>
                                    </TableCell>
                                    <TableCell>
                                        <p className="font-bold text-xs uppercase italic line-clamp-1">{email.subject}</p>
                                        <p className="text-[9px] font-bold opacity-40">{new Date(email.sent_at).toLocaleString()}</p>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={email.status === 'sent' ? 'default' : 'secondary'} className="uppercase text-[9px] font-black italic border-2">
                                            {email.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" size="sm" onClick={() => setViewingEmail(email)} className="h-9 font-black border-2 uppercase tracking-tighter text-[10px]">
                                                Preview
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-9 text-destructive hover:bg-destructive/5 px-2">
                                                        {isDeleting === email.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="font-black uppercase italic">Purge Dispatch Record?</AlertDialogTitle>
                                                        <AlertDialogDescription className="text-[10px] font-bold uppercase">This action is irreversible.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel className="font-bold uppercase h-12">Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteEmail(email.id)} className="bg-destructive text-destructive-foreground font-black uppercase h-12">Confirm Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                             <TableRow><TableCell colSpan={4} className="h-48 text-center text-muted-foreground italic opacity-30">No dispatch records found.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        {/* Message Preview Dialog */}
        <Dialog open={!!viewingEmail} onOpenChange={(open) => !open && setViewingEmail(null)}>
            <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-3 justify-center">
                        <Mail className="h-8 w-8 text-primary" /> Correspondence Audit
                    </DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-hidden py-6 space-y-6">
                    <Card className="bg-muted/30 border-none shadow-inner rounded-2xl overflow-hidden">
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between gap-4">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-black uppercase opacity-60">Recipient</Label>
                                    <p className="text-sm font-black uppercase">{viewingEmail?.recipient_name}</p>
                                    <p className="text-[11px] font-mono opacity-60">{viewingEmail?.recipient_email}</p>
                                </div>
                                <div className="space-y-1 sm:text-right">
                                    <Label className="text-[10px] font-black uppercase opacity-60">Sent Date</Label>
                                    <p className="text-xs font-bold">{viewingEmail?.sent_at ? new Date(viewingEmail.sent_at).toLocaleString() : 'N/A'}</p>
                                </div>
                            </div>
                            <Separator className="opacity-10" />
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase opacity-60">Subject Header</Label>
                                <div className="p-3 bg-background rounded-xl border font-bold text-sm italic">{viewingEmail?.subject}</div>
                            </div>
                        </CardContent>
                    </Card>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase opacity-60 ml-2">Message Body</Label>
                        <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
                            <ScrollArea className="h-[300px] w-full p-6">
                                <div className="whitespace-pre-wrap font-medium text-sm leading-relaxed text-foreground/80">{viewingEmail?.body_content}</div>
                            </ScrollArea>
                        </Card>
                    </div>
                </div>
                <DialogFooter><DialogClose asChild><Button variant="outline" className="w-full h-12 font-black uppercase tracking-widest text-[11px] border-2">Close View</Button></DialogClose></DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}