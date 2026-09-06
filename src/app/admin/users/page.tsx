
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Loader2, Eye, Search, ShieldCheck } from 'lucide-react';
import { useSupabase } from '@/components/supabase-provider';
import Link from 'next/link';

export default function UsersPage() {
  const { supabase } = useSupabase();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*, app_roles(role)')
        .order('full_name', { ascending: true });
      setUsers(data || []);
      setIsLoading(false);
    };
    fetchUsers();
  }, [supabase]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">Identity Registry</h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px]">Supabase Auth & RBAC Central</p>
        </div>
        <Button className="font-black uppercase italic" disabled><PlusCircle className="mr-2 h-4 w-4" /> Add User (Auth logic required)</Button>
      </div>

      <Card className="shadow-2xl border-none overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="pl-6">Identity</TableHead>
                <TableHead>Mailbox</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-20"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
              ) : users.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="pl-6">
                    <p className="font-black text-primary uppercase text-sm">{u.full_name}</p>
                    <p className="text-[10px] opacity-60">{u.id}</p>
                  </TableCell>
                  <TableCell className="font-mono font-bold">{u.mailbox_number}</TableCell>
                  <TableCell>
                    {u.app_roles?.map((r: any) => (
                        <Badge key={r.role} variant={r.role === 'admin' ? 'default' : 'secondary'} className="mr-1 capitalize">{r.role}</Badge>
                    ))}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Button variant="outline" size="sm" asChild className="h-8 font-black uppercase text-[10px]"><Link href={`/admin/users/${u.id}`}>Details</Link></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
