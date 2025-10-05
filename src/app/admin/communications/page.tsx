
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Send, Mail, Users, Inbox, RefreshCw, PlusCircle, Paperclip } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import placeholderImages from '@/lib/placeholder-images.json';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, doc, serverTimestamp, addDoc, setDoc } from 'firebase/firestore';


type Message = {
  id: string;
  conversationId: string;
  customerName: string;
  customerId: string;
  subject: string;
  message: string;
  date: string;
  sender: 'user' | 'agent';
  status: 'Open' | 'Closed';
  attachment?: string;
};

type Conversation = {
    id: string;
    customerName: string;
    customerId: string;
    subject: string;
    latestMessage: string;
    latestDate: string;
    isRead: boolean;
    date: string;
}

type User = {
    id: string;
    fullName: string;
    email: string;
}

export default function CommunicationsPage() {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [reply, setReply] = useState('');
    const [sending, setSending] = useState(false);
    
    // State for composing new email
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [composeRecipient, setComposeRecipient] = useState('');
    const [composeSubject, setComposeSubject] = useState('');
    const [composeBody, setComposeBody] = useState('');
    const [composeAttachment, setComposeAttachment] = useState<File | null>(null);
    const [isComposing, setIsComposing] = useState(false);

    const conversationsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'conversations'), orderBy('latestDate', 'desc'));
    }, [firestore]);
    const { data: conversations, isLoading: loading, error } = useCollection<Conversation>(conversationsQuery);

    const usersQuery = useMemoFirebase(() => {
        if(!firestore) return null;
        return query(collection(firestore, 'users'), orderBy('fullName', 'asc'));
    }, [firestore]);
    const { data: users, isLoading: usersLoading } = useCollection<User>(usersQuery);
    
    const messagesQuery = useMemoFirebase(() => {
        if (!firestore || !selectedConversation) return null;
        return query(
            collection(firestore, 'conversations', selectedConversation.id, 'messages'),
            orderBy('date', 'asc')
        );
    }, [firestore, selectedConversation]);

    const { data: messages, isLoading: messagesLoading } = useCollection<Message>(messagesQuery);


    const handleSendReply = async () => {
        if (!firestore || !reply.trim() || !selectedConversation) return;

        setSending(true);
        try {
            const conversationRef = doc(firestore, 'conversations', selectedConversation.id);
            const messagesCol = collection(conversationRef, 'messages');
            
            const messageData = {
                conversationId: selectedConversation.id,
                customerId: selectedConversation.customerId,
                customerName: selectedConversation.customerName,
                subject: selectedConversation.subject,
                message: reply,
                sender: 'agent' as 'user' | 'agent',
                status: 'Open' as 'Open' | 'Closed',
                date: serverTimestamp()
            };
            await addDoc(messagesCol, messageData);
            
            // Update the parent conversation doc
            const conversationData = {
                latestMessage: reply,
                latestDate: serverTimestamp(),
                isRead: true, // It's read from the admin's perspective
                status: 'Open'
            };
            await setDoc(conversationRef, conversationData, { merge: true });

            setReply('');
            toast({ title: 'Reply Sent!' });

        } catch (error) {
             toast({ title: 'Error', description: 'Could not send reply.', variant: 'destructive' });
        } finally {
            setSending(false);
        }
    };

    const handleComposeEmail = async () => {
        const recipientUser = users?.find(u => u.id === composeRecipient);
        if (!firestore || !composeRecipient || !composeSubject.trim() || !composeBody.trim() || !recipientUser) {
            toast({ title: 'Missing fields', description: 'Please select a valid recipient and enter a subject and message.', variant: 'destructive' });
            return;
        }

        setIsComposing(true);
        try {
            const newConversationRef = doc(collection(firestore, 'conversations'));
            const conversationData = {
                id: newConversationRef.id,
                customerId: recipientUser.id,
                customerName: recipientUser.fullName,
                subject: composeSubject,
                latestMessage: composeBody,
                latestDate: serverTimestamp(),
                isRead: true, // It's read from the admin's perspective
                status: 'Open',
                date: serverTimestamp()
            };
            await setDoc(newConversationRef, conversationData, { merge: false });


            const messagesCol = collection(newConversationRef, 'messages');
            await addDoc(messagesCol, {
                conversationId: newConversationRef.id,
                customerId: recipientUser.id,
                customerName: recipientUser.fullName,
                subject: composeSubject,
                message: composeBody,
                sender: 'agent',
                status: 'Open',
                date: serverTimestamp(),
            });

            toast({ title: 'Email Sent!', description: `Your email to ${recipientUser.fullName} has been sent.` });
            
            setIsComposeOpen(false);
            setComposeRecipient('');
            setComposeSubject('');
            setComposeBody('');
            setComposeAttachment(null);

        } catch (error) {
            toast({ title: 'Error', description: 'Could not send email.', variant: 'destructive' });
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
            View customer messages and send promotional emails.
          </p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" disabled={loading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
           <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
            <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2 h-4 w-4" /> Compose</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Compose New Email</DialogTitle>
                    <DialogDescription>Send a new email or promotion to a customer.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="recipient">Recipient</Label>
                         <Select value={composeRecipient} onValueChange={setComposeRecipient}>
                            <SelectTrigger id="recipient">
                                <SelectValue placeholder="Select a customer" />
                            </SelectTrigger>
                            <SelectContent>
                                {usersLoading && <SelectItem value="loading" disabled>Loading users...</SelectItem>}
                                {users?.map(user => (
                                    <SelectItem key={user.id} value={user.id}>{user.fullName} ({user.email})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input id="subject" value={composeSubject} onChange={e => setComposeSubject(e.target.value)} placeholder="e.g., Summer Sale!" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="body">Message</Label>
                        <Textarea id="body" value={composeBody} onChange={e => setComposeBody(e.target.value)} placeholder="Type your message here..." className="min-h-[200px]" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="attachment">Attachment</Label>
                        <Input id="attachment" type="file" onChange={(e) => setComposeAttachment(e.target.files ? e.target.files[0] : null)} />
                        {composeAttachment && <p className="text-sm text-muted-foreground">Selected: {composeAttachment.name}</p>}
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

        <Card className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-0 h-[calc(100vh-200px)]">
            <div className="md:col-span-1 lg:col-span-1 border-r h-full flex flex-col">
                <div className="p-4 border-b">
                    <h2 className="text-xl font-bold">Inbox ({conversations?.length ?? 0})</h2>
                </div>
                 <ScrollArea className="flex-1">
                    {loading && (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    )}
                    {conversations && conversations.map(convo => (
                        <button
                            key={convo.id}
                            className={cn(
                                "block w-full text-left p-4 border-b hover:bg-accent focus:outline-none focus:bg-accent",
                                selectedConversation?.id === convo.id && "bg-accent"
                            )}
                            onClick={() => setSelectedConversation(convo)}
                        >
                            <div className="flex justify-between items-start">
                                <p className={cn("font-semibold", !convo.isRead && "text-primary")}>{convo.customerName}</p>
                                {!convo.isRead && <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />}
                            </div>
                            <p className="text-sm font-medium truncate">{convo.subject}</p>
                            <p className="text-sm text-muted-foreground truncate">{convo.latestMessage}</p>
                        </button>
                    ))}
                    {!loading && conversations?.length === 0 && (
                        <div className="text-center p-8 text-muted-foreground">
                            <Inbox className="mx-auto h-12 w-12" />
                            <p>Your inbox is empty.</p>
                        </div>
                    )}
                </ScrollArea>
            </div>
            <div className="md:col-span-2 lg:col-span-3 h-full flex flex-col">
                {selectedConversation ? (
                    <>
                        <div className="p-4 border-b">
                            <h3 className="text-lg font-semibold">{selectedConversation.subject}</h3>
                            <p className="text-sm text-muted-foreground">From: {selectedConversation.customerName}</p>
                        </div>
                         <ScrollArea className="flex-1 p-4">
                             <div className="space-y-6">
                                {messagesLoading && <div className="text-center"><Loader2 className="h-6 w-6 animate-spin"/></div>}
                                {messages && messages.map(msg => (
                                    <div key={msg.id} className={cn("flex items-end gap-3", msg.sender === 'agent' ? 'flex-row-reverse' : 'flex-row')}>
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={msg.sender === 'user' ? undefined : placeholderImages.avatars.supportAgent.src} />
                                            <AvatarFallback>{msg.customerName.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className={cn(
                                            "max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-lg",
                                            msg.sender === 'agent' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                                        )}>
                                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                            {msg.attachment && (
                                                <div className="mt-2 pt-2 border-t border-white/20">
                                                    <a href="#" className="flex items-center gap-2 text-sm font-medium hover:underline">
                                                        <Paperclip className="h-4 w-4" />
                                                        <span>{msg.attachment}</span>
                                                    </a>
                                                </div>
                                            )}
                                            <p className={cn("text-xs mt-2", msg.sender === 'agent' ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{msg.date ? new Date(msg.date).toLocaleString() : 'Just now'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                        <div className="p-4 border-t bg-background">
                            <div className="relative">
                                 <Textarea
                                    placeholder="Type your reply..."
                                    value={reply}
                                    onChange={e => setReply(e.target.value)}
                                    className="pr-24"
                                />
                                <Button 
                                    onClick={handleSendReply} 
                                    disabled={!reply.trim() || sending}
                                    className="absolute right-2 bottom-2"
                                >
                                    {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                    Send
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Mail className="h-16 w-16" />
                        <p className="mt-4 text-lg">Select a conversation to read</p>
                        <p className="text-sm">or compose a new email.</p>
                    </div>
                )}
            </div>
        </Card>
    </div>
  );
}
