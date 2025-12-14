
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
import { ArrowLeft, Loader2, Send, History, PlusCircle } from 'lucide-react';
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


type SentEmail = {
    id: string;
    recipientName: string;
    recipientEmail: string;
    subject: string;
    body: string;
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

        if (!isBulkSend && !isCustomEmail && !recipientUser) {
            toast({ title: 'Invalid Recipient', description: 'The selected user could not be found.', variant: 'destructive' });
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
                    recipientName: recipientName // Pass name for logging
                }),
            });

            const errorData = await response.json();
            if (!response.ok) {
                throw new Error(errorData.message || 'Failed to send email.');
            }

            toast({ title: 'Email Sent!', description: `Your email to ${recipientName} has been sent.` });
            
            setIsComposeOpen(false);
            setComposeRecipient('');
            setCustomEmail('');
            setComposeSubject('');
            setComposeBody('');
        } catch (error) {
             toast({ title: 'Error Sending Email', description: (error as Error).message, variant: 'destructive' });
        } finally {
            setIsComposing(false);
        }
    }

  if (loading || !users) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Communications</h1>
          <p className="text-muted-foreground">
            Send updates and promotional emails to your customers.
          </p>
        </div>
        <div className="flex items-center gap-2">
           <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Compose Email
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Compose New Email</DialogTitle>
                    <DialogDescription>Send an email or promotion to a customer.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                    <div className="space-y-2">
                        <Label htmlFor="recipient">Recipient</Label>
                         <Select value={composeRecipient} onValueChange={setComposeRecipient}>
                            <SelectTrigger id="recipient">
                                <SelectValue placeholder={"Select a customer or option"} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Users ({users.length})</SelectItem>
                                <SelectItem value="custom">Custom Email Address</SelectItem>
                                {users.map(user => (
                                    <SelectItem key={user.id} value={user.id}>{user.fullName} ({user.email})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {composeRecipient === 'custom' && (
                      <div className="space-y-2">
                          <Label htmlFor="custom-email">Custom Email</Label>
                          <Input id="custom-email" type="email" value={customEmail} onChange={e => setCustomEmail(e.target.value)} placeholder="Enter email address" />
                      </div>
                    )}
                     <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input id="subject" value={composeSubject} onChange={e => setComposeSubject(e.target.value)} placeholder="e.g., Your Weekly Update or Summer Sale!" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="body">Message Body</Label>
                        <Textarea id="body" value={composeBody} onChange={e => setComposeBody(e.target.value)} placeholder="Type your message here..." className="min-h-[200px]" />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleComposeEmail} disabled={isComposing}>
                        {isComposing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Send Email
                    </Button>
                </DialogFooter>
            </DialogContent>
           </Dialog>
          <Button variant="outline" asChild>
            <Link href="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>
      </div>
      
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Sent History
                </CardTitle>
                <CardDescription>A log of all emails sent to customers.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Recipient</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead>Date Sent</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoadingSentEmails ? (
                           <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </TableCell>
                            </TableRow>
                        ) : sentEmails && sentEmails.length > 0 ? (
                            sentEmails.map(email => (
                                <TableRow key={email.id}>
                                    <TableCell>
                                        <div className="font-medium">{email.recipientName}</div>
                                        <div className="text-sm text-muted-foreground">{email.recipientEmail}</div>
                                    </TableCell>
                                    <TableCell>{email.subject}</TableCell>
                                    <TableCell>{email.sentAt ? email.sentAt.toDate().toLocaleString() : 'N/A'}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                             <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                    No emails have been sent yet.
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
