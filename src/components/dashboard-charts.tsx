'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Legend, Tooltip, Line, LineChart, Cell, Pie, PieChart } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

export function TrendChart({ data }: { data: any[] }) {
  const config = {
    volume: { label: "Volume", color: "hsl(var(--primary))" }
  };

  return (
    <ChartContainer config={config} className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.1} />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tickMargin={10} fontSize={10} fontWeight="bold" />
          <YAxis axisLine={false} tickLine={false} tickMargin={10} fontSize={10} fontWeight="bold" />
          <Tooltip content={<ChartTooltipContent />} />
          <Line type="monotone" dataKey="volume" stroke="var(--color-volume)" strokeWidth={4} dot={{ r: 4, fill: "var(--color-volume)" }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

export function StatusPieChart({ data }: { data: any[] }) {
  const COLORS = ['#0ea5e9', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#8b5cf6'];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          dataKey="value"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function RevenueBarChart({ data }: { data: any[] }) {
  const config = {
    revenue: { label: "Revenue", color: "hsl(var(--primary))" }
  };

  return (
    <ChartContainer config={config} className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid vertical={false} opacity={0.1} />
          <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={10} fontWeight="bold" />
          <YAxis axisLine={false} tickLine={false} fontSize={10} fontWeight="bold" tickFormatter={(v) => `$${v/1000}k`} />
          <Tooltip content={<ChartTooltipContent />} />
          <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
