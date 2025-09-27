

'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, RefreshCw, Send, Archive, ArchiveRestore } from 'lucide-react';
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
            View and manage incoming messages from users.
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
