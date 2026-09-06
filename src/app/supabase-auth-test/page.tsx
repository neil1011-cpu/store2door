'use client';

import { TestRunner } from './test-runner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShieldCheck, Lock, Database } from 'lucide-react';

/**
 * @fileOverview Supabase Auth + RBAC Functional Test Interface.
 * Verification of the foundational SQL migration and RLS policies.
 */

export default function SupabaseAuthTestPage() {
  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl space-y-12">
      <div className="text-center space-y-4">
        <Badge variant="outline" className="px-4 py-1 border-primary/20 text-primary uppercase tracking-[0.3em] font-black italic">
          Supabase Security Audit v1.2
        </Badge>
        <h1 className="text-4xl sm:text-6xl font-black italic uppercase tracking-tighter">Auth & RBAC Foundation</h1>
        <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">Database Integrity Verification • Firebase Isolated</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8">
          <TestRunner />
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-xl bg-zinc-950 text-zinc-100 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-pulse" />
            <CardHeader className="pb-4">
              <CardTitle className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500 flex items-center gap-2">
                <Lock className="h-3 w-3" /> Security Boundary Specs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-[10px] uppercase font-bold tracking-wider leading-relaxed">
              <div className="space-y-1">
                <p className="text-primary italic">Profiles (public)</p>
                <ul className="list-disc pl-4 opacity-70">
                  <li>Select: own or admin</li>
                  <li>Update: own (cols: name, phone)</li>
                  <li>Immutable: trn, mailbox, id</li>
                </ul>
              </div>
              <Separator className="bg-white/10" />
              <div className="space-y-1">
                <p className="text-primary italic">Roles (public)</p>
                <ul className="list-disc pl-4 opacity-70">
                  <li>Select: own or admin</li>
                  <li>Insert/Update: DENIED ALL</li>
                  <li>Logic: manage_user_role() RPC</li>
                </ul>
              </div>
              <Separator className="bg-white/10" />
              <div className="space-y-1">
                <p className="text-primary italic">Authorizers</p>
                <ul className="list-disc pl-4 opacity-70">
                  <li>is_admin() (Definer)</li>
                  <li>has_role() (Definer)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <div className="p-6 rounded-2xl border-2 border-dashed bg-muted/10 space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Database className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Isolated System</span>
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight leading-relaxed">
              This terminal operates strictly on the Supabase PostgreSQL layer. Firebase Auth and Firestore remain ** untouched** and functional.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
