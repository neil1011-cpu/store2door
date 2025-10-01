

'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, RefreshCw, Send, Archive, ArchiveRestore, Megaphone, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import placeholderImages from '@/lib/placeholder-images.json';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users } from 'lucide-react';


type Message = {
  id: string;
  conversationId: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
};

type Conversation = {
    id: string;
    subject: string;
    customerName: string;
    status: 'Open' | 'Closed';
    messages: Message[];
    lastUpdate: string;
}

function PromotionDialog() {
    const { toast } = useToast();
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [recipientGroup, setRecipientGroup] = useState('all');
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const handleSendPromotion = () => {
        if (!subject || !body) {
            toast({
                title: 'Missing Fields',
                description: 'Please provide a subject and body for the email.',
                variant: 'destructive',
            });
            return;
        }

        setLoading(true);

        // Simulate sending the email
        setTimeout(() => {
            setLoading(false);
            toast({
                title: 'Promotional Email Sent!',
                description: `Your email with the subject "${subject}" has been sent to all customers.`,
            });
            // Reset fields
            setSubject('');
            setBody('');
            setOpen(false);
        }, 1500);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Megaphone className="mr-2 h-4 w-4" />
                    Compose Promotion
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Compose Promotion</DialogTitle>
                    <DialogDescription>
                        Create your marketing message below. It will be sent to the selected customer group.
                    </DialogDescription>
                </DialogHeader>
                 <div className="space-y-6 py-4">
                     <div className="space-y-2 max-w-sm">
                        <Label htmlFor="recipients">Recipients</Label>
                         <Select value={recipientGroup} onValueChange={setRecipientGroup}>
                            <SelectTrigger id="recipients" className="w-full">
                                <SelectValue placeholder="Select recipients" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4" /> All Customers
                                    </div>
                                </SelectItem>
                                 <SelectItem value="newsletter-subscribers" disabled>
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4" /> Newsletter Subscribers (coming soon)
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="subject">Email Subject</Label>
                        <Input
                            id="subject"
                            placeholder="e.g., ✨ 20% Off Shipping This Weekend! ✨"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="body">Email Body</Label>
                        <Textarea
                            id="body"
                            placeholder="Hi [Customer Name],\n\nGet ready for a treat! We're offering a special discount..."
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            className="min-h-[250px]"
                        />
                    </div>
                </div>
                <CardFooter>
                    <Button onClick={handleSendPromotion} disabled={loading}>
                        {loading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="mr-2 h-4 w-4" />
                        )}
                        {loading ? 'Sending...' : 'Send to All Customers'}
                    </Button>
                </CardFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const supportAvatar = placeholderImages.avatars.supportAgent;

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/messages');
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      const data = await response.json();
      
      // Group messages by conversation ID
      const groupedConversations: {[key: string]: Conversation} = {};
      data.forEach((msg: any) => {
          if (!groupedConversations[msg.conversationId]) {
              groupedConversations[msg.conversationId] = {
                  id: msg.conversationId,
                  customerName: msg.customerName,
                  subject: msg.subject,
                  status: msg.status || 'Open',
                  messages: [],
                  lastUpdate: msg.date,
              };
          }
          groupedConversations[msg.conversationId].messages.push({
            id: msg.id,
            conversationId: msg.conversationId,
            sender: msg.sender,
            text: msg.message,
            timestamp: msg.date,
          });
          // Sort messages within conversation by date
          groupedConversations[msg.conversationId].messages.sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          
          // Update lastUpdate time
           const latestMessageDate = new Date(groupedConversations[msg.conversationId].messages[groupedConversations[msg.conversationId].messages.length - 1].timestamp);
           if (new Date(groupedConversations[msg.conversationId].lastUpdate) < latestMessageDate) {
                groupedConversations[msg.conversationId].lastUpdate = latestMessageDate.toLocaleString();
           }
      });
      
      setConversations(Object.values(groupedConversations).sort((a, b) => new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime()));

    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleCloseConversation = (conversationId: string) => {
    setConversations(conversations.map(conv => 
      conv.id === conversationId ? { ...conv, status: 'Closed' } : conv
    ));
    toast({
        title: 'Conversation Closed',
        description: `Conversation ${conversationId} has been marked as closed.`,
    });
    // In a real app, you would also make an API call to update the status on the backend.
  };

  const handleReopenConversation = (conversationId: string) => {
    setConversations(conversations.map(conv => 
      conv.id === conversationId ? { ...conv, status: 'Open' } : conv
    ));
    toast({
        title: 'Conversation Reopened',
        description: `Conversation ${conversationId} has been marked as open.`,
    });
    // In a real app, you would also make an API call to update the status on the backend.
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Messages</h1>
          <p className="text-muted-foreground">
            View messages from users and send promotional emails.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchMessages} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
          <PromotionDialog />
          <Button variant="outline" asChild>
            <Link href="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inbox</CardTitle>
          <CardDescription>A list of all message threads from customers.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              You have no messages.
            </p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {conversations.map((conv) => (
                <AccordionItem value={conv.id} key={conv.id}>
                  <AccordionTrigger>
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-4">
                        <Badge
                          variant={conv.status === 'Open' ? 'destructive' : 'secondary'}
                        >
                          {conv.status}
                        </Badge>
                        <span className="font-medium">{conv.customerName}</span>
                        <span className="text-muted-foreground hidden md:inline">
                          - {conv.subject}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(conv.lastUpdate).toLocaleString()}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                        <div className="p-4 space-y-4">
                            {conv.messages.map(msg => (
                                <div key={msg.id} className={cn("flex items-start gap-3", msg.sender === 'agent' ? "justify-end" : "justify-start")}>
                                     {msg.sender === 'user' && (
                                        <Avatar className="h-9 w-9">
                                            <AvatarFallback>{conv.customerName.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                     )}
                                     <div className={cn("rounded-lg p-3 max-w-lg", msg.sender === 'agent' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                                        <p className="text-sm">{msg.text}</p>
                                        <p className="text-xs mt-1 opacity-70 text-right">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                                     </div>
                                      {msg.sender === 'agent' && (
                                        <Avatar className="h-9 w-9">
                                             <AvatarImage src={supportAvatar.src} alt={supportAvatar.alt} />
                                            <AvatarFallback>SA</AvatarFallback>
                                        </Avatar>
                                     )}
                                </div>
                            ))}
                             <div className="pt-4 border-t">
                                <Label className="mb-2">Reply to {conv.customerName}</Label>
                                <Textarea placeholder="Write a reply..." className="mb-2" />
                                <div className="flex justify-between items-center">
                                    <Button size="sm">
                                        <Send className="mr-2 h-4 w-4" />
                                        Send Reply
                                    </Button>
                                    {conv.status === 'Open' ? (
                                        <Button variant="outline" size="sm" onClick={() => handleCloseConversation(conv.id)}>
                                            <Archive className="mr-2 h-4 w-4" />
                                            Close Conversation
                                        </Button>
                                    ) : (
                                        <Button variant="outline" size="sm" onClick={() => handleReopenConversation(conv.id)}>
                                            <ArchiveRestore className="mr-2 h-4 w-4" />
                                            Reopen Conversation
                                        </Button>
                                    )}
                                </div>
                             </div>
                        </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
