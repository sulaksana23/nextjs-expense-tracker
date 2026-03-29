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

function formatRupiahInput(value: string) {
  if (!value) {
    return "";
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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
  const [amountInput, setAmountInput] = useState("");
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
  const activeCategoryLabel =
    deferredCategory === "Semua" ? "Semua kategori" : deferredCategory;

  return (
    <div className="min-h-screen bg-[var(--background)] px-3 py-3 text-slate-900 sm:px-4 sm:py-4 md:px-6 md:py-6">
      <div className="mx-auto grid w-full max-w-6xl gap-3">
        <header className="grid gap-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex w-fit rounded-full bg-[var(--surface-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-700">
                Dashboard Keuangan
              </span>
              <span className="inline-flex rounded-full border border-[var(--border-soft)] bg-white px-3 py-1 text-[11px] font-medium text-slate-600">
                Private per akun
              </span>
            </div>
            <div className="space-y-1.5">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Halo, {userName}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                Semua pemasukan dan pengeluaran yang tampil di dashboard ini hanya milik
                akun yang sedang login.
              </p>
            </div>
          </div>

          <form action={logoutAction} className="flex items-start justify-start lg:justify-end">
            <button
              type="submit"
              className="w-full rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
            >
              Logout
            </button>
          </form>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
              className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-4"
            >
              <p className="text-sm text-slate-500">{card.label}</p>
              <h2
                className={`pt-2 text-xl font-semibold tracking-tight sm:text-2xl ${card.tone}`}
              >
                {card.value}
              </h2>
            </article>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
          <article className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-4 sm:p-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-slate-900">Tambah transaksi</h2>
                <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  Akun sendiri
                </span>
              </div>
              <p className="text-sm leading-6 text-slate-600">
                Gunakan form ini untuk menambah income atau expense ke akun kamu.
              </p>
            </div>

            {transactionState?.error ? (
              <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {transactionState.error}
              </div>
            ) : null}

            <form action={transactionAction} className="grid gap-4 pt-5">
              <div className="grid gap-2">
                <span className="text-sm text-slate-600">Tipe transaksi</span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    { label: "Pengeluaran", value: "EXPENSE" as const },
                    { label: "Pemasukan", value: "INCOME" as const },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`rounded-xl border px-4 py-3 text-center text-sm font-medium transition ${
                        type === option.value
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-[var(--border-soft)] bg-[var(--surface-soft)] text-slate-600 hover:border-slate-300"
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

              <label className="grid gap-2 text-sm text-slate-600">
                <span>Judul transaksi</span>
                <input
                  name="title"
                  placeholder={type === "INCOME" ? "Gaji bulanan" : "Makan siang"}
                  className="rounded-xl border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400"
                  required
                />
              </label>

              <div className="grid gap-4 xl:grid-cols-2">
                <label className="grid gap-2 text-sm text-slate-600">
                  <span>Nominal</span>
                  <input name="amount" type="hidden" value={amountInput} />
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Rp 50.000"
                    value={formatRupiahInput(amountInput)}
                    onChange={(event) =>
                      setAmountInput(event.target.value.replace(/\D/g, ""))
                    }
                    className="rounded-xl border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400"
                    required
                  />
                </label>

                <label className="grid gap-2 text-sm text-slate-600">
                  <span>Tanggal</span>
                  <input
                    name="occurredAt"
                    type="date"
                    className="rounded-xl border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    required
                  />
                </label>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <label className="grid gap-2 text-sm text-slate-600">
                  <span>Kategori</span>
                  <select
                    name="category"
                    className="rounded-xl border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                    defaultValue={filterOptions[0]}
                  >
                    {filterOptions.map((option) => (
                      <option key={option} value={option} className="text-slate-900">
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm text-slate-600">
                  <span>Catatan</span>
                  <input
                    name="note"
                    placeholder="Opsional"
                    className="rounded-xl border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400"
                  />
                </label>
              </div>

              <SubmitButton label="Simpan transaksi" />
            </form>
          </article>

          <article className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold">List transaksi</h2>
                <p className="pt-2 text-sm leading-6 text-slate-500">
                  Hanya transaksi milik akun ini yang ditampilkan. Filter kategori
                  membantu review arus kas jadi lebih cepat.
                </p>
              </div>

              <label className="grid w-full gap-2 text-sm text-slate-500 lg:w-auto lg:min-w-52">
                <span>Filter kategori</span>
                <select
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                  className="w-full rounded-xl border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 grid gap-3 rounded-xl bg-[var(--surface-soft)] p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Ringkasan filter
                </p>
                <span className="rounded-full border border-[var(--border-soft)] bg-white px-3 py-1 text-xs text-slate-600">
                  {activeCategoryLabel}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl border border-[var(--border-soft)] bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Income Filtered
                  </p>
                  <p className="pt-2 text-lg font-semibold text-emerald-600">
                    {formatCurrency(filteredTotals.income)}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border-soft)] bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Expense Filtered
                  </p>
                  <p className="pt-2 text-lg font-semibold text-rose-600">
                    {formatCurrency(filteredTotals.expense)}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border-soft)] bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Balance Filtered
                  </p>
                  <p className="pt-2 text-lg font-semibold text-slate-900">
                    {formatCurrency(filteredTotals.income - filteredTotals.expense)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {filteredTransactions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
                  Belum ada transaksi untuk kategori ini.
                </div>
              ) : (
                filteredTransactions.map((transaction) => (
                  <article
                    key={transaction.id}
                    className="grid gap-4 rounded-xl border border-[var(--border-soft)] bg-white px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start"
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
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                        <span>{formatDate(transaction.occurredAt)}</span>
                        {transaction.note ? <span>{transaction.note}</span> : null}
                      </div>
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
