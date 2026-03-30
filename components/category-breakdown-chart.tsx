"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type CategoryBreakdownItem = {
  amount: number;
  category: string;
};

type CategoryBreakdownChartProps = {
  items: CategoryBreakdownItem[];
};

const colors = ["#f97316", "#14b8a6", "#0ea5e9", "#f43f5e", "#f59e0b", "#8b5cf6"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CategoryBreakdownChart({
  items,
}: CategoryBreakdownChartProps) {
  const chartData = useMemo(() => items.slice(0, 6), [items]);

  if (chartData.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
        Grafik kategori akan muncul setelah ada data pengeluaran.
      </div>
    );
  }

  return (
    <div className="h-72 w-full sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 8, right: 20, left: 8, bottom: 8 }}
          barCategoryGap={14}
        >
          <CartesianGrid stroke="rgba(148, 163, 184, 0.16)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: "#64748b", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => formatCurrency(value)}
          />
          <YAxis
            dataKey="category"
            type="category"
            width={92}
            tick={{ fill: "#475569", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => [formatCurrency(Number(value ?? 0)), "Expense"]}
            contentStyle={{
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              boxShadow: "0 16px 40px rgba(15, 23, 42, 0.08)",
            }}
          />
          <Bar dataKey="amount" radius={[0, 12, 12, 0]}>
            {chartData.map((item, index) => (
              <Cell key={`${item.category}-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
