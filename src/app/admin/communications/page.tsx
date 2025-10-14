
'use client';

import { useState } from 'react';
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
import { users as allUsers, type UserProfile as User } from '@/lib/mock-data';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type SentEmail = {
    id: string;
    recipientName: string;
    recipientEmail: string;
    subject: string;
    body: string;
    sentAt: string;
};

export default function CommunicationsPage() {
    const { toast } = useToast();
    const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
    
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [composeRecipient, setComposeRecipient] = useState('');
    const [composeSubject, setComposeSubject] = useState('');
    const [composeBody, setComposeBody] = useState('');
    const [isComposing, setIsComposing] = useState(false);

    const users: User[] = allUsers;

    const handleComposeEmail = async () => {
        const recipientUser = users?.find(u => u.id === composeRecipient);
        if (!composeRecipient || !composeSubject.trim() || !composeBody.trim() || !recipientUser) {
            toast({ title: 'Missing fields', description: 'Please select a valid recipient and enter a subject and message.', variant: 'destructive' });
            return;
        }

        setIsComposing(true);
        
        try {
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: recipientUser.email,
                    subject: composeSubject,
                    body: composeBody,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to send email.');
            }

            const newSentEmail: SentEmail = {
                id: `email-${Date.now()}`,
                recipientName: recipientUser.fullName,
                recipientEmail: recipientUser.email,
                subject: composeSubject,
                body: composeBody,
                sentAt: new Date().toISOString(),
            };

            setSentEmails(prev => [newSentEmail, ...prev]);

            toast({ title: 'Email Sent!', description: `Your email to ${recipientUser.fullName} has been sent.` });
            
            setIsComposeOpen(false);
            setComposeRecipient('');
            setComposeSubject('');
            setComposeBody('');
        } catch (error) {
             toast({ title: 'Error Sending Email', description: (error as Error).message, variant: 'destructive' });
        } finally {
            setIsComposing(false);
        }
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
                <Button><PlusCircle className="mr-2 h-4 w-4" /> Compose Email</Button>
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
                                <SelectValue placeholder="Select a customer" />
                            </SelectTrigger>
                            <SelectContent>
                                {users?.map(user => (
                                    <SelectItem key={user.id} value={user.id}>{user.fullName} ({user.email})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
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
                        {sentEmails.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                    No emails have been sent yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            sentEmails.map(email => (
                                <TableRow key={email.id}>
                                    <TableCell>
                                        <div className="font-medium">{email.recipientName}</div>
                                        <div className="text-sm text-muted-foreground">{email.recipientEmail}</div>
                                    </TableCell>
                                    <TableCell>{email.subject}</TableCell>
                                    <TableCell>{new Date(email.sentAt).toLocaleString()}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}
