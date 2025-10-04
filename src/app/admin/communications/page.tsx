
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
import { ArrowLeft, Loader2, Send, Mail, Users, Inbox, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import placeholderImages from '@/lib/placeholder-images.json';


type Message = {
  id: string;
  conversationId: string;
  customerName: string;
  subject: string;
  message: string;
  date: string;
  sender: 'user' | 'agent';
  status: 'Open' | 'Closed';
};

type Conversation = {
    id: string;
    customerName: string;
    subject: string;
    latestMessage: string;
    latestDate: string;
    isRead: boolean;
    messages: Message[];
}

export default function CommunicationsPage() {
    const { toast } = useToast();
    const [messages, setMessages] = useState<Message[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [reply, setReply] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    const fetchMessages = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/messages');
            if (!response.ok) {
                throw new Error('Failed to fetch messages');
            }
            const data: Message[] = await response.json();
            setMessages(data);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Could not load messages.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, []);

    const conversations = useMemo(() => {
        const convos: Record<string, Conversation> = {};
        messages.forEach(msg => {
            if (!convos[msg.conversationId]) {
                convos[msg.conversationId] = {
                    id: msg.conversationId,
                    customerName: msg.customerName,
                    subject: msg.subject,
                    latestMessage: '',
                    latestDate: '',
                    isRead: true, // assume read initially
                    messages: []
                };
            }
            convos[msg.conversationId].messages.push(msg);
        });

        Object.values(convos).forEach(convo => {
            convo.messages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const latestMsg = convo.messages[0];
            convo.latestMessage = latestMsg.message;
            convo.latestDate = latestMsg.date;
            // A conversation is unread if the latest message is from a user and its status is Open
            // This is a simplification; a real app might have per-message read status
            convo.isRead = !(latestMsg.sender === 'user' && latestMsg.status === 'Open');
        });
        
        return Object.values(convos).sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime());
    }, [messages]);


    const handleSendReply = async () => {
        if (!reply.trim() || !selectedConversation) return;

        setSending(true);
        try {
            const response = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversationId: selectedConversation.id,
                    customerName: selectedConversation.customerName,
                    subject: selectedConversation.subject,
                    message: reply,
                    sender: 'agent'
                }),
            });
            if (!response.ok) throw new Error('Failed to send reply');

            const newReply = await response.json();
            setMessages([...messages, newReply]);
            
            // Optimistically update the selected conversation
            setSelectedConversation(prev => prev ? {...prev, messages: [newReply, ...prev.messages]} : null);

            setReply('');
            toast({ title: 'Reply Sent!' });

        } catch (error) {
             toast({ title: 'Error', description: 'Could not send reply.', variant: 'destructive' });
        } finally {
            setSending(false);
        }
    };


  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Communications</h1>
          <p className="text-muted-foreground">
            View and respond to customer messages.
          </p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" onClick={fetchMessages} disabled={loading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>

        <Card className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-0 h-[calc(100vh-200px)]">
            <div className="md:col-span-1 lg:col-span-1 border-r h-full flex flex-col">
                <div className="p-4 border-b">
                    <h2 className="text-xl font-bold">Inbox ({conversations.length})</h2>
                </div>
                 <ScrollArea className="flex-1">
                    {loading && (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    )}
                    {!loading && conversations.map(convo => (
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
                    {!loading && conversations.length === 0 && (
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
                                {selectedConversation.messages.map(msg => (
                                    <div key={msg.id} className={cn("flex items-end gap-3", msg.sender === 'agent' ? 'flex-row-reverse' : 'flex-row')}>
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={msg.sender === 'user' ? undefined : placeholderImages.avatars.supportAgent.src} />
                                            <AvatarFallback>{msg.customerName.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className={cn(
                                            "max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-lg",
                                            msg.sender === 'agent' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                                        )}>
                                            <p className="text-sm">{msg.message}</p>
                                            <p className={cn("text-xs mt-2", msg.sender === 'agent' ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{new Date(msg.date).toLocaleString()}</p>
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
                    </div>
                )}
            </div>
        </Card>
    </div>
  );
}
