"use client";

import { useActionState, useDeferredValue, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { logoutAction } from "@/app/actions/auth";
import {
  createTransactionAction,
  type TransactionState,
} from "@/app/actions/transactions";
import type { TransactionType } from "@/app/generated/prisma/enums";

type TransactionView = {
  id: string;
  title: string;
  category: string;
  note: string | null;
  amount: number;
  type: TransactionType;
  occurredAt: string;
};

type DashboardClientProps = {
  userName: string;
  transactions: TransactionView[];
};

const incomeCategories = ["Gaji", "Freelance", "Bonus", "Investasi", "Lainnya"];
const expenseCategories = [
  "Makan",
  "Transport",
  "Belanja",
  "Tagihan",
  "Kesehatan",
  "Hiburan",
  "Lainnya",
];

const initialTransactionState: TransactionState = {};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center rounded-2xl bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
    >
      {pending ? "Menyimpan..." : label}
    </button>
  );
}

export default function DashboardClient({
  userName,
  transactions,
}: DashboardClientProps) {
  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const deferredCategory = useDeferredValue(selectedCategory);
  const [transactionState, transactionAction] = useActionState(
    createTransactionAction,
    initialTransactionState,
  );

  const categories = useMemo(() => {
    const source = new Set<string>(["Semua"]);

    for (const transaction of transactions) {
      source.add(transaction.category);
    }

    return Array.from(source);
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    if (deferredCategory === "Semua") {
      return transactions;
    }

    return transactions.filter(
      (transaction) => transaction.category === deferredCategory,
    );
  }, [deferredCategory, transactions]);

  const totals = useMemo(() => {
    return transactions.reduce(
      (accumulator, transaction) => {
        if (transaction.type === "INCOME") {
          accumulator.income += transaction.amount;
        } else {
          accumulator.expense += transaction.amount;
        }

        return accumulator;
      },
      { income: 0, expense: 0 },
    );
  }, [transactions]);

  const filteredTotals = useMemo(() => {
    return filteredTransactions.reduce(
      (accumulator, transaction) => {
        if (transaction.type === "INCOME") {
          accumulator.income += transaction.amount;
        } else {
          accumulator.expense += transaction.amount;
        }

        return accumulator;
      },
      { income: 0, expense: 0 },
    );
  }, [filteredTransactions]);

  const balance = totals.income - totals.expense;
  const filterOptions =
    type === "INCOME" ? incomeCategories : expenseCategories;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.18),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.18),_transparent_30%),linear-gradient(180deg,_#fff9f2_0%,_#f6efe6_45%,_#edf3f7_100%)] px-4 py-4 text-slate-900 sm:px-5 sm:py-6 md:px-8 md:py-8">
      <div className="mx-auto grid w-full max-w-7xl gap-4 sm:gap-6">
        <header className="grid gap-4 rounded-[28px] border border-black/6 bg-white/84 p-5 shadow-[0_30px_100px_rgba(15,23,42,0.10)] backdrop-blur sm:rounded-[32px] sm:p-6 lg:grid-cols-[1.3fr_0.7fr] md:p-8">
          <div className="space-y-3">
            <span className="inline-flex w-fit rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
              Dashboard Keuangan
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl lg:text-5xl">
                Halo, {userName}
              </h1>
              <p className="max-w-2xl pt-3 text-sm leading-6 text-slate-600 sm:leading-7 md:text-base">
                Catat pemasukan dan pengeluaran harian, lihat balance secara cepat,
                lalu fokus ke kategori yang paling sering bikin budget bergeser.
              </p>
            </div>
          </div>

          <form action={logoutAction} className="flex items-start justify-start lg:justify-end">
            <button
              type="submit"
              className="w-full rounded-2xl border border-slate-200 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
            >
              Logout
            </button>
          </form>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total Balance",
              value: formatCurrency(balance),
              tone: balance >= 0 ? "text-emerald-600" : "text-rose-600",
            },
            {
              label: "Total Income",
              value: formatCurrency(totals.income),
              tone: "text-emerald-600",
            },
            {
              label: "Total Expense",
              value: formatCurrency(totals.expense),
              tone: "text-rose-600",
            },
            {
              label:
                deferredCategory === "Semua"
                  ? "Total Transaksi"
                  : `Filter ${deferredCategory}`,
              value:
                deferredCategory === "Semua"
                  ? `${transactions.length} transaksi`
                  : `${filteredTransactions.length} transaksi`,
              tone: "text-sky-700",
            },
          ].map((card) => (
            <article
              key={card.label}
              className="rounded-[24px] border border-black/5 bg-white/86 p-4 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur sm:rounded-[28px] sm:p-5"
            >
              <p className="text-sm text-slate-500">{card.label}</p>
              <h2
                className={`pt-3 text-xl font-semibold tracking-tight sm:pt-4 sm:text-2xl ${card.tone}`}
              >
                {card.value}
              </h2>
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-[28px] border border-black/6 bg-[#101b2d] p-5 text-white shadow-[0_30px_90px_rgba(2,6,23,0.34)] sm:rounded-[32px] sm:p-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold sm:text-2xl">Tambah transaksi</h2>
              <p className="text-sm leading-6 text-white/65">
                Gunakan form ini untuk menambah income atau expense ke akun kamu.
              </p>
            </div>

            {transactionState?.error ? (
              <div className="mt-5 rounded-2xl border border-rose-500/30 bg-rose-500/12 px-4 py-3 text-sm text-rose-100">
                {transactionState.error}
              </div>
            ) : null}

            <form action={transactionAction} className="grid gap-4 pt-6 sm:gap-5">
              <div className="grid gap-2">
                <span className="text-sm text-white/72">Tipe transaksi</span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    { label: "Pengeluaran", value: "EXPENSE" as const },
                    { label: "Pemasukan", value: "INCOME" as const },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`rounded-2xl border px-4 py-3 text-center text-sm font-medium transition ${
                        type === option.value
                          ? "border-[var(--accent)] bg-white text-slate-950"
                          : "border-white/10 bg-white/6 text-white/72 hover:border-white/20"
                      }`}
                    >
                      <input
                        type="radio"
                        name="type"
                        value={option.value}
                        checked={type === option.value}
                        onChange={() => setType(option.value)}
                        className="sr-only"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              <label className="grid gap-2 text-sm text-white/72">
                <span>Judul transaksi</span>
                <input
                  name="title"
                  placeholder={type === "INCOME" ? "Gaji bulanan" : "Makan siang"}
                  className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[var(--accent)]"
                  required
                />
              </label>

              <div className="grid gap-4 xl:grid-cols-2">
                <label className="grid gap-2 text-sm text-white/72">
                  <span>Nominal</span>
                  <input
                    name="amount"
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="50000"
                    className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[var(--accent)]"
                    required
                  />
                </label>

                <label className="grid gap-2 text-sm text-white/72">
                  <span>Tanggal</span>
                  <input
                    name="occurredAt"
                    type="date"
                    className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none focus:border-[var(--accent)]"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    required
                  />
                </label>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <label className="grid gap-2 text-sm text-white/72">
                  <span>Kategori</span>
                  <select
                    name="category"
                    className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none focus:border-[var(--accent)]"
                    defaultValue={filterOptions[0]}
                  >
                    {filterOptions.map((option) => (
                      <option key={option} value={option} className="text-slate-900">
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm text-white/72">
                  <span>Catatan</span>
                  <input
                    name="note"
                    placeholder="Opsional"
                    className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[var(--accent)]"
                  />
                </label>
              </div>

              <SubmitButton label="Simpan transaksi" />
            </form>
          </article>

          <article className="rounded-[28px] border border-black/6 bg-white/84 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.09)] backdrop-blur sm:rounded-[32px] sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold sm:text-2xl">List transaksi</h2>
                <p className="pt-2 text-sm leading-6 text-slate-500">
                  Filter kategori untuk fokus ke arus kas yang ingin kamu review.
                </p>
              </div>

              <label className="grid w-full gap-2 text-sm text-slate-500 lg:w-auto lg:min-w-52">
                <span>Filter kategori</span>
                <select
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--accent-strong)]"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-5 grid gap-3 rounded-[24px] bg-[var(--surface-soft)] p-3 sm:rounded-[28px] sm:p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Income Filtered
                  </p>
                  <p className="pt-2 text-lg font-semibold text-emerald-600">
                    {formatCurrency(filteredTotals.income)}
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Expense Filtered
                  </p>
                  <p className="pt-2 text-lg font-semibold text-rose-600">
                    {formatCurrency(filteredTotals.expense)}
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Balance Filtered
                  </p>
                  <p className="pt-2 text-lg font-semibold text-slate-900">
                    {formatCurrency(filteredTotals.income - filteredTotals.expense)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {filteredTransactions.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
                  Belum ada transaksi untuk kategori ini.
                </div>
              ) : (
                filteredTransactions.map((transaction) => (
                  <article
                    key={transaction.id}
                    className="grid gap-4 rounded-[24px] border border-slate-200 bg-white px-4 py-4 sm:rounded-[28px] sm:px-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start"
                  >
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words text-lg font-semibold text-slate-900">
                          {transaction.title}
                        </h3>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                            transaction.type === "INCOME"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {transaction.type === "INCOME" ? "Income" : "Expense"}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          {transaction.category}
                        </span>
                      </div>
                      <p className="break-words text-sm text-slate-500">
                        {formatDate(transaction.occurredAt)}
                        {transaction.note ? ` • ${transaction.note}` : ""}
                      </p>
                    </div>

                    <div
                      className={`text-left text-lg font-semibold tracking-tight sm:text-xl md:text-right ${
                        transaction.type === "INCOME"
                          ? "text-emerald-600"
                          : "text-rose-600"
                      }`}
                    >
                      {transaction.type === "INCOME" ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </div>
                  </article>
                ))
              )}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
