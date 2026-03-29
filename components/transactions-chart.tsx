"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type ChartConfiguration,
} from "chart.js";
import type { TransactionType } from "@/app/generated/prisma/enums";

type ChartTransaction = {
  amount: number;
  occurredAt: string;
  type: TransactionType;
};

type TransactionsChartProps = {
  transactions: ChartTransaction[];
};

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
);

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
    year: "numeric",
  }).format(value);
}

export default function TransactionsChart({
  transactions,
}: TransactionsChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const chartData = useMemo(() => {
    const monthlyBuckets = new Map<
      string,
      { income: number; expense: number; label: string }
    >();

    for (const transaction of transactions) {
      const occurredAt = new Date(transaction.occurredAt);
      const monthKey = `${occurredAt.getFullYear()}-${String(
        occurredAt.getMonth() + 1,
      ).padStart(2, "0")}`;

      const currentValue = monthlyBuckets.get(monthKey) ?? {
        income: 0,
        expense: 0,
        label: formatMonthLabel(new Date(occurredAt.getFullYear(), occurredAt.getMonth(), 1)),
      };

      if (transaction.type === "INCOME") {
        currentValue.income += transaction.amount;
      } else {
        currentValue.expense += transaction.amount;
      }

      monthlyBuckets.set(monthKey, currentValue);
    }

    const sortedEntries = Array.from(monthlyBuckets.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(-6);

    return {
      labels: sortedEntries.map(([, value]) => value.label),
      incomes: sortedEntries.map(([, value]) => value.income),
      expenses: sortedEntries.map(([, value]) => value.expense),
      balances: sortedEntries.map(([, value]) => value.income - value.expense),
    };
  }, [transactions]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || chartData.labels.length === 0) {
      return;
    }

    const configuration: ChartConfiguration<"bar" | "line"> = {
      type: "bar",
      data: {
        labels: chartData.labels,
        datasets: [
          {
            type: "bar",
            label: "Pemasukan",
            data: chartData.incomes,
            backgroundColor: "rgba(16, 185, 129, 0.75)",
            borderRadius: 10,
            borderSkipped: false,
            maxBarThickness: 28,
          },
          {
            type: "bar",
            label: "Pengeluaran",
            data: chartData.expenses,
            backgroundColor: "rgba(244, 63, 94, 0.7)",
            borderRadius: 10,
            borderSkipped: false,
            maxBarThickness: 28,
          },
          {
            type: "line",
            label: "Balance",
            data: chartData.balances,
            borderColor: "rgb(15, 23, 42)",
            backgroundColor: "rgb(15, 23, 42)",
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 5,
            tension: 0.35,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              pointStyle: "circle",
              color: "#475569",
            },
          },
          tooltip: {
            callbacks: {
              label(context) {
                const datasetLabel = context.dataset.label ?? "Nilai";
                const amount =
                  typeof context.parsed.y === "number" ? context.parsed.y : 0;
                return `${datasetLabel}: ${formatCurrency(amount)}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: "#64748b",
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(148, 163, 184, 0.18)",
            },
            ticks: {
              color: "#64748b",
              callback(value) {
                return formatCurrency(Number(value));
              },
            },
          },
        },
      },
    };

    const chart = new Chart(canvas, configuration);

    return () => {
      chart.destroy();
    };
  }, [chartData]);

  if (chartData.labels.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
        Chart akan muncul setelah ada transaksi di lebih dari satu waktu pencatatan.
      </div>
    );
  }

  return (
    <div className="h-64 w-full sm:h-72">
      <canvas ref={canvasRef} aria-label="Chart arus kas bulanan" role="img" />
    </div>
  );
}
