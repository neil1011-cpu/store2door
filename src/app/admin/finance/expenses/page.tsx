
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

const expensesData = [
    { id: 'EXP001', date: '2024-06-28', category: 'Logistics', description: 'Fuel for delivery truck', amount: 150.75 },
    { id: 'EXP002', date: '2024-06-27', category: 'Supplies', description: 'Packing tape and boxes', amount: 75.20 },
    { id: 'EXP003', date: '2024-06-26', category: 'Utilities', description: 'Warehouse electricity bill', amount: 320.00 },
    { id: 'EXP004', date: '2024-06-25', category: 'Marketing', description: 'Social media ad campaign', amount: 200.00 },
    { id: 'EXP005', date: '2024-06-24', category: 'Software', description: 'Subscription for tracking software', amount: 99.00 },
];

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
              {expensesData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono">{item.id}</TableCell>
                  <TableCell>{item.date}</TableCell>
                  <TableCell><Badge variant="outline">{item.category}</Badge></TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right text-red-500 font-medium">${item.amount.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

    