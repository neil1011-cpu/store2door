
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
import { ArrowUpRight, DollarSign, ArrowLeft, PlusCircle } from 'lucide-react';
import { FinanceChart } from '@/components/finance-chart';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';


const financeData = {
  summary: {
    revenue: 45231.89,
    expenses: 21789.45,
    profit: 23442.44,
    revenueChange: 20.1,
    expensesChange: 12.2,
    profitChange: 28.3,
  },
  breakdown: [
    { month: 'April', revenue: 12000, expenses: 7000, profit: 5000 },
    { month: 'May', revenue: 15500, expenses: 8200, profit: 7300 },
    { month: 'June', revenue: 17731.89, expenses: 6589.45, profit: 11142.44 },
  ],
};

export default function FinancePage() {
  const { toast } = useToast();
  const [newTransaction, setNewTransaction] = useState({
      type: 'revenue',
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
  });

  const handleAddTransaction = () => {
    if (!newTransaction.description || !newTransaction.amount) {
        toast({
            title: 'Missing Fields',
            description: 'Please enter a description and an amount.',
            variant: 'destructive',
        });
        return;
    }
    toast({
        title: 'Transaction Added',
        description: `A new ${newTransaction.type} of $${newTransaction.amount} has been recorded.`,
    });
    // Reset form
    setNewTransaction({
        type: 'revenue',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
    });
  };


  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finance</h1>
          <p className="text-muted-foreground">
            View your financial statements and performance.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${financeData.summary.revenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground flex items-center">
              <ArrowUpRight className="h-4 w-4 mr-1 text-green-500" />
              +{financeData.summary.revenueChange}% from last quarter
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${financeData.summary.expenses.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground flex items-center">
              <ArrowUpRight className="h-4 w-4 mr-1 text-red-500" />
              +{financeData.summary.expensesChange}% from last quarter
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${financeData.summary.profit.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground flex items-center">
              <ArrowUpRight className="h-4 w-4 mr-1 text-green-500" />
              +{financeData.summary.profitChange}% from last quarter
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Financial Overview</CardTitle>
                    <CardDescription>
                    Revenue vs. Expenses over the last 3 months.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <FinanceChart data={financeData.breakdown} />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Detailed Breakdown</CardTitle>
                    <CardDescription>
                    Monthly financial data.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Expenses</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {financeData.breakdown.map((item) => (
                        <TableRow key={item.month}>
                            <TableCell className="font-medium">{item.month}</TableCell>
                            <TableCell className="text-right text-green-500">
                            ${item.revenue.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-red-500">
                            ${item.expenses.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-bold">
                            ${item.profit.toLocaleString()}
                            </TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Add Transaction</CardTitle>
            <CardDescription>Manually record a new transaction.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="space-y-2">
                <Label htmlFor="tx-type">Transaction Type</Label>
                <Select value={newTransaction.type} onValueChange={(value) => setNewTransaction({...newTransaction, type: value})}>
                    <SelectTrigger id="tx-type">
                        <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="revenue">Revenue</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                </Select>
            </div>
             <div className="space-y-2">
                <Label htmlFor="tx-desc">Description</Label>
                <Input id="tx-desc" placeholder="e.g., Shipping supplies" value={newTransaction.description} onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="tx-amount">Amount (USD)</Label>
                <Input id="tx-amount" type="number" placeholder="e.g., 150.00" value={newTransaction.amount} onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="tx-date">Date</Label>
                <Input id="tx-date" type="date" value={newTransaction.date} onChange={(e) => setNewTransaction({...newTransaction, date: e.target.value})} />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleAddTransaction}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Transaction
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
