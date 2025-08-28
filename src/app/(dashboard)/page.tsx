
'use client'
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Route } from 'lucide-react';
import Link from 'next/link';

export default function Home() {

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center items-center gap-2 mb-4">
            <Route className="size-12 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">Welcome to SwiftRoute</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Your journey begins here. Navigate to the dashboard to get started.
          </p>
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
    );
}
