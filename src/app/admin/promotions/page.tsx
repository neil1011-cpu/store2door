'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Send, Loader2, Users, Mail } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';


export default function PromotionsPage() {
    const { toast } = useToast();
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [recipientGroup, setRecipientGroup] = useState('all');
    const [loading, setLoading] = useState(false);

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
        }, 1500);
    };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Promotional Emails</h1>
          <p className="text-muted-foreground">
            Send marketing emails and promotions to your customers.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

        <Card>
          <CardHeader>
            <CardTitle>Compose Promotion</CardTitle>
            <CardDescription>
                Create your marketing message below. It will be sent to the selected customer group.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
          </CardContent>
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
        </Card>
    </div>
  );
}
