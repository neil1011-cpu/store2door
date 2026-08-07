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
import { ArrowLeft, Loader2, Send, History, PlusCircle, AlertCircle, CheckCircle2, Eye, FileText, Mail, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { UserProfile } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type SentEmail = {
    id: string;
    recipientName: string;
    recipientEmail: string;
    subject: string;
    body: string;
    status?: 'sent' | 'simulated' | 'failed';
    sentAt: {
      toDate: () => Date;
    };
};

export default function CommunicationsPage() {
    const { toast } = useToast();
    
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [composeRecipient, setComposeRecipient] = useState('');
    const [customEmail, setCustomEmail] = useState('');
    const [composeSubject, setComposeSubject] = useState('');
    const [composeBody, setComposeBody] = useState('');
    const [isComposing, setIsComposing] = useState(false);
    
    const [viewingEmail, setViewingEmail] = useState<SentEmail | null>(null);
    
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const usersQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collection(firestore, 'users'), orderBy('fullName', 'asc'))
    }, [firestore, user]);
    const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);
    
    const sentEmailsQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collection(firestore, 'sent_emails'), orderBy('sentAt', 'desc'));
    }, [firestore, user]);
    const { data: sentEmails, isLoading: isLoadingSentEmails } = useCollection<SentEmail>(sentEmailsQuery);
    
    const loading = isUserLoading || isLoadingUsers || isLoadingSentEmails;

    const handleComposeEmail = async () => {
        if (!users) {
            toast({ title: 'Users not loaded', description: 'Please wait for users to load.', variant: 'destructive'});
            return;
        }

        const isBulkSend = composeRecipient === 'all';
        const isCustomEmail = composeRecipient === 'custom';

        let recipientUser: UserProfile | undefined;
        let emailTarget: string | string[] = '';
        let recipientName = '';

        if (isBulkSend) {
          emailTarget = users.map(u => u.email);
          recipientName = 'All Users';
        } else if (isCustomEmail) {
            if (!customEmail.trim()) {
                toast({ title: 'Missing fields', description: 'Please enter a custom email address.', variant: 'destructive' });
                return;
            }
            emailTarget = customEmail;
            recipientName = customEmail;
        } else {
            recipientUser = users.find(u => u.id === composeRecipient);
            if (recipientUser) {
              emailTarget = recipientUser.email;
              recipientName = recipientUser.fullName;
            }
        }
        
        if (!emailTarget || (Array.isArray(emailTarget) && emailTarget.length === 0) || !composeSubject.trim() || !composeBody.trim()) {
            toast({ title: 'Missing fields', description: 'Please select a valid recipient and enter a subject and message.', variant: 'destructive' });
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
            if (!response.ok) {
                throw new Error(data.message || 'Failed to send email.');
            }

            if (data.simulated) {
                toast({ 
                    title: 'Simulation Active', 
                    description: 'Email logged in history but NOT sent. Please configure SMTP settings.',
                    variant: 'default'
                });
            } else {
                toast({ title: 'Email Sent!', description: `Your email to ${recipientName} has been delivered.` });
            }
            
            setIsComposeOpen(false);
            setComposeRecipient('');
            setCustomEmail('');
            setComposeSubject('');
            setComposeBody('');
        } catch (error: any) {
             toast({ title: 'Transmission Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsComposing(false);
        }
    }

  if (loading || !users) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="font-bold uppercase tracking-widest text-xs animate-pulse">Syncing Communication Hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary">Communications Hub</h1>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px] mt-1">
            Official customer correspondence and outreach center.
          </p>
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
                        <Label htmlFor="recipient" className="text-[10px] font-bold uppercase opacity-60">Recipient Selection</Label>
                         <Select value={composeRecipient} onValueChange={setComposeRecipient}>
                            <SelectTrigger id="recipient" className="h-12 border-2">
                                <SelectValue placeholder={"Select a customer or group"} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="font-bold uppercase text-xs">All Registered Clients ({users.length})</SelectItem>
                                <SelectItem value="custom" className="font-bold uppercase text-xs">Custom Email Address</SelectItem>
                                {users.map(user => (
                                    <SelectItem key={user.id} value={user.id} className="font-medium">{user.fullName} ({user.email})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {composeRecipient === 'custom' && (
                      <div className="space-y-2 animate-in slide-in-from-top-2">
                          <Label htmlFor="custom-email" className="text-[10px] font-bold uppercase opacity-60">Manual Target Entry</Label>
                          <Input id="custom-email" type="email" value={customEmail} onChange={e => setCustomEmail(e.target.value)} placeholder="Enter full email address" className="h-12 border-2" />
                      </div>
                    )}
                     <div className="space-y-2">
                        <Label htmlFor="subject" className="text-[10px] font-bold uppercase opacity-60">Message Subject</Label>
                        <Input id="subject" value={composeSubject} onChange={e => setComposeSubject(e.target.value)} placeholder="e.g. Your Package Status or Global Update" className="h-12 border-2 font-bold" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="body" className="text-[10px] font-bold uppercase opacity-60">Message Content</Label>
                        <Textarea id="body" value={composeBody} onChange={e => setComposeBody(e.target.value)} placeholder="Type your message here..." className="min-h-[200px] border-2" />
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
            <Link href="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        </div>
      </div>
      
        <Card className="shadow-2xl border-none overflow-hidden rounded-2xl">
            <CardHeader className="bg-muted/10 border-b">
                <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" /> Outbound Dispatch History
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Master audit trail of all automated and manual correspondence.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead className="pl-6 text-[10px] font-black uppercase tracking-widest">Recipient</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Subject Header</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">System Status</TableHead>
                            <TableHead className="text-right pr-6 text-[10px] font-black uppercase tracking-widest">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoadingSentEmails ? (
                           <TableRow>
                                <TableCell colSpan={4} className="h-48 text-center">
                                    <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
                                    <p className="text-[10px] font-bold uppercase mt-2 opacity-40 animate-pulse">Syncing History Ledger...</p>
                                </TableCell>
                            </TableRow>
                        ) : sentEmails && sentEmails.length > 0 ? (
                            sentEmails.map(email => (
                                <TableRow key={email.id} className="hover:bg-primary/5 transition-colors h-20">
                                    <TableCell className="pl-6">
                                        <div className="flex flex-col">
                                            <span className="font-black text-sm uppercase">{email.recipientName}</span>
                                            <span className="text-[10px] font-bold text-muted-foreground opacity-60 uppercase tracking-widest">{email.recipientEmail}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-bold text-xs uppercase italic tracking-tight line-clamp-1">{email.subject}</span>
                                        <span className="text-[9px] font-bold opacity-40 block">{email.sentAt ? email.sentAt.toDate().toLocaleString() : 'N/A'}</span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={email.status === 'sent' ? 'default' : email.status === 'simulated' ? 'secondary' : 'destructive'} className="uppercase text-[9px] font-black italic tracking-widest border-2">
                                            {email.status === 'sent' && <CheckCircle2 className="h-2 w-2 mr-1" />}
                                            {email.status === 'simulated' && <AlertCircle className="h-2 w-2 mr-1" />}
                                            {email.status || 'Sent'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <Button variant="outline" size="sm" onClick={() => setViewingEmail(email)} className="h-9 font-black border-2 uppercase tracking-tighter text-[10px]">
                                            <Eye className="h-3.5 w-3.5 mr-2" /> Preview
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                             <TableRow>
                                <TableCell colSpan={4} className="h-48 text-center text-muted-foreground italic opacity-30">
                                    No dispatch records detected in the communication ledger.
                                </TableCell>
                            </TableRow>
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
                        <Mail className="h-8 w-8 text-primary" /> Official Dispatch Preview
                    </DialogTitle>
                    <DialogDescription className="font-bold text-[10px] uppercase tracking-widest text-center">Complete correspondence audit record</DialogDescription>
                </DialogHeader>
                
                <div className="flex-1 overflow-hidden py-6 space-y-6">
                    <Card className="bg-muted/30 border-none shadow-inner rounded-2xl overflow-hidden">
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between gap-4">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Recipient</Label>
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-primary" />
                                        <p className="text-sm font-black uppercase">{viewingEmail?.recipientName}</p>
                                    </div>
                                    <p className="text-[11px] font-mono opacity-60 ml-6">{viewingEmail?.recipientEmail}</p>
                                </div>
                                <div className="space-y-1 sm:text-right">
                                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Dispatch Timestamp</Label>
                                    <p className="text-xs font-bold">{viewingEmail?.sentAt?.toDate().toLocaleString()}</p>
                                    <Badge variant={viewingEmail?.status === 'sent' ? 'default' : 'secondary'} className="text-[9px] font-black uppercase">
                                        Status: {viewingEmail?.status}
                                    </Badge>
                                </div>
                            </div>
                            
                            <Separator className="opacity-10" />
                            
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Subject Header</Label>
                                <div className="p-3 bg-background rounded-xl border font-bold text-sm italic tracking-tight">
                                    {viewingEmail?.subject}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-2">Message Body</Label>
                        <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
                            <ScrollArea className="h-[300px] w-full p-6">
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <div className="whitespace-pre-wrap font-medium text-sm leading-relaxed text-foreground/80">
                                        {viewingEmail?.body}
                                    </div>
                                </div>
                            </ScrollArea>
                        </Card>
                    </div>
                </div>

                <DialogFooter className="border-t pt-6">
                    <DialogClose asChild>
                        <Button variant="outline" className="w-full sm:w-auto h-12 font-black uppercase tracking-widest text-[11px] border-2">
                            Close Audit View
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
