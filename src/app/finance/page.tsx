
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
import { ArrowUpRight, ArrowDownRight, DollarSign, ArrowLeft } from 'lucide-react';
import { FinanceChart } from '@/components/finance-chart';

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
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profit & Loss</h1>
          <p className="text-muted-foreground">
            View your financial statements and performance.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
    </div>
  );
}
