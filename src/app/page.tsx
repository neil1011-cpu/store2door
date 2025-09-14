
'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to SwiftRoute</CardTitle>
          <CardDescription>
            This is the starting point for your application. The admin backend
            is now located at `/admin`.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/admin">
            <Button className="w-full">
              Go to Admin Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
