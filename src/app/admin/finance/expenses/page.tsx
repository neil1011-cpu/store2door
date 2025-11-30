
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Mock data removed. This will be replaced with dynamic data in a future step.
const expensesData: any[] = [];

export default function ExpensesPage() {
  const totalExpenses = expensesData.reduce((acc, item) => acc + item.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses Breakdown</h1>
          <p className="text-muted-foreground">
            A detailed list of all expense transactions.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/finance">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Finance
          </Link>
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>All Expense Transactions</CardTitle>
          <CardDescription>
            Total Expenses: <span className="font-bold text-red-500">${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expensesData.length > 0 ? (
                expensesData.map((item) => (
                    <TableRow key={item.id}>
                    <TableCell className="font-mono">{item.id}</TableCell>
                    <TableCell>{item.date}</TableCell>
                    <TableCell><Badge variant="outline">{item.category}</Badge></TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right text-red-500 font-medium">${item.amount.toFixed(2)}</TableCell>
                    </TableRow>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                        No expenses have been recorded yet.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
