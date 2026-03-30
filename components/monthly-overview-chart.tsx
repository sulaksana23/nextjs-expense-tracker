"use client";

import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TransactionType } from "@/app/generated/prisma/enums";

type ChartTransaction = {
  amount: number;
  occurredAt: string;
  type: TransactionType;
};

type MonthlyOverviewChartProps = {
  transactions: ChartTransaction[];
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMonthLabel(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    month: "short",
    year: "2-digit",
  }).format(value);
}

export default function MonthlyOverviewChart({
  transactions,
}: MonthlyOverviewChartProps) {
  const chartData = useMemo(() => {
    const monthlyBuckets = new Map<
      string,
      { balance: number; expense: number; income: number; label: string }
    >();

    for (const transaction of transactions) {
      const occurredAt = new Date(transaction.occurredAt);
      const monthKey = `${occurredAt.getFullYear()}-${String(
        occurredAt.getMonth() + 1,
      ).padStart(2, "0")}`;
      const currentValue = monthlyBuckets.get(monthKey) ?? {
        balance: 0,
        expense: 0,
        income: 0,
        label: formatMonthLabel(new Date(occurredAt.getFullYear(), occurredAt.getMonth(), 1)),
      };

      if (transaction.type === "INCOME") {
        currentValue.income += transaction.amount;
      } else {
        currentValue.expense += transaction.amount;
      }

      currentValue.balance = currentValue.income - currentValue.expense;
      monthlyBuckets.set(monthKey, currentValue);
    }

    return Array.from(monthlyBuckets.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(-6)
      .map(([, value]) => value);
  }, [transactions]);

  if (chartData.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
        Grafik bulanan akan muncul setelah ada transaksi.
      </div>
    );
  }

  return (
    <div className="h-72 w-full sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="rgba(148, 163, 184, 0.18)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fill: "#64748b", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => formatCurrency(value)}
          />
          <Tooltip
            formatter={(value, name) => [formatCurrency(Number(value ?? 0)), name]}
            contentStyle={{
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              boxShadow: "0 16px 40px rgba(15, 23, 42, 0.08)",
            }}
          />
          <Legend />
          <Bar dataKey="income" name="Income" fill="#10b981" radius={[10, 10, 0, 0]} />
          <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[10, 10, 0, 0]} />
          <Line
            type="monotone"
            dataKey="balance"
            name="Balance"
            stroke="#0f172a"
            strokeWidth={3}
            dot={{ fill: "#0f172a", r: 4 }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
