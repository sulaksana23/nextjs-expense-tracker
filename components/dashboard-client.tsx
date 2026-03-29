"use client";

import { useActionState, useDeferredValue, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { logoutAction } from "@/app/actions/auth";
import {
  createTransactionAction,
  type TransactionState,
} from "@/app/actions/transactions";
import type { TransactionType } from "@/app/generated/prisma/enums";
import TransactionsChart from "@/components/transactions-chart";

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

type TransactionTypeFilter = TransactionType | "ALL";

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
const monthMap = new Map([
  ["jan", "01"],
  ["feb", "02"],
  ["mar", "03"],
  ["apr", "04"],
  ["mei", "05"],
  ["jun", "06"],
  ["jul", "07"],
  ["agu", "08"],
  ["sep", "09"],
  ["okt", "10"],
  ["nov", "11"],
  ["des", "12"],
]);

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

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
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

function guessExpenseCategory(title: string) {
  const normalizedTitle = title.toLowerCase();

  if (
    normalizedTitle.includes("kfc") ||
    normalizedTitle.includes("makan") ||
    normalizedTitle.includes("resto") ||
    normalizedTitle.includes("cafe") ||
    normalizedTitle.includes("kopi")
  ) {
    return "Makan";
  }

  if (
    normalizedTitle.includes("gojek") ||
    normalizedTitle.includes("grab") ||
    normalizedTitle.includes("transport") ||
    normalizedTitle.includes("parkir")
  ) {
    return "Transport";
  }

  if (
    normalizedTitle.includes("listrik") ||
    normalizedTitle.includes("air") ||
    normalizedTitle.includes("internet") ||
    normalizedTitle.includes("tagihan")
  ) {
    return "Tagihan";
  }

  if (
    normalizedTitle.includes("apotek") ||
    normalizedTitle.includes("klinik") ||
    normalizedTitle.includes("rumah sakit")
  ) {
    return "Kesehatan";
  }

  if (
    normalizedTitle.includes("bioskop") ||
    normalizedTitle.includes("game") ||
    normalizedTitle.includes("netflix")
  ) {
    return "Hiburan";
  }

  if (
    normalizedTitle.includes("belanja") ||
    normalizedTitle.includes("mart") ||
    normalizedTitle.includes("store") ||
    normalizedTitle.includes("shop")
  ) {
    return "Belanja";
  }

  return "Lainnya";
}

function toIsoDateFromIndonesianDate(value: string) {
  const match = value
    .trim()
    .toLowerCase()
    .match(/(\d{1,2})\s+([a-z]{3})\s+(\d{4})/);

  if (!match) {
    return "";
  }

  const [, day, monthLabel, year] = match;
  const month = monthMap.get(monthLabel);

  if (!month) {
    return "";
  }

  return `${year}-${month}-${day.padStart(2, "0")}`;
}

function parseReceiptImport(rawValue: string) {
  const lines = rawValue
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const joined = lines.join("\n");
  const merchant =
    joined.match(/Ke\s*\n?(.+)/i)?.[1]?.trim() ||
    joined.match(/merchant\s*[:\-]?\s*(.+)/i)?.[1]?.trim() ||
    "";
  const amountText =
    joined.match(/Jumlah\s*\n?Rp\s*([\d.]+)/i)?.[1] ||
    joined.match(/Rp\s*([\d.]+)/i)?.[1] ||
    "";
  const transactionDateText =
    joined.match(/Waktu\s+Transaksi\s*\n?([^\n,]+(?:,\s*\d{2}:\d{2})?)/i)?.[1] || "";
  const transactionMethod =
    joined.match(/Metode\s+Transaksi\s*\n?([^\n]+)/i)?.[1]?.trim() || "";
  const acquirer =
    joined.match(/Nama\s+Acquirer\s*\n?([^\n]+)/i)?.[1]?.trim() || "";
  const reference =
    joined.match(/No\.\s*Referensi\s*\n?([^\n]+)/i)?.[1]?.trim() || "";

  const amount = amountText.replace(/\D/g, "");
  const occurredAt = toIsoDateFromIndonesianDate(transactionDateText);
  const title = merchant || "Pengeluaran QRIS";
  const noteParts = [transactionMethod, acquirer, reference && `Ref ${reference}`].filter(
    Boolean,
  );

  if (!amount) {
    return null;
  }

  return {
    amount,
    category: guessExpenseCategory(title),
    note: noteParts.join(" • "),
    occurredAt,
    title,
  };
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
  const [titleInput, setTitleInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [occurredAtInput, setOccurredAtInput] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [formCategory, setFormCategory] = useState(expenseCategories[0]);
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [selectedTypeFilter, setSelectedTypeFilter] =
    useState<TransactionTypeFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [receiptImportText, setReceiptImportText] = useState("");
  const [receiptImportState, setReceiptImportState] = useState("");
  const [receiptImageName, setReceiptImageName] = useState("");
  const [isProcessingReceiptImage, setIsProcessingReceiptImage] = useState(false);
  const deferredCategory = useDeferredValue(selectedCategory);
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());
  const [transactionState, transactionAction] = useActionState(
    createTransactionAction,
    initialTransactionState,
  );
  const formCategoryOptions =
    type === "INCOME" ? incomeCategories : expenseCategories;

  const categories = useMemo(() => {
    const source = new Set<string>(["Semua"]);

    for (const transaction of transactions) {
      source.add(transaction.category);
    }

    return Array.from(source);
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      if (
        deferredCategory !== "Semua" &&
        transaction.category !== deferredCategory
      ) {
        return false;
      }

      if (
        selectedTypeFilter !== "ALL" &&
        transaction.type !== selectedTypeFilter
      ) {
        return false;
      }

      if (!deferredSearchQuery) {
        return true;
      }

      const haystack = [
        transaction.title,
        transaction.category,
        transaction.note ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(deferredSearchQuery);
    });
  }, [deferredCategory, deferredSearchQuery, selectedTypeFilter, transactions]);

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
  const activeCategoryLabel =
    deferredCategory === "Semua" ? "Semua kategori" : deferredCategory;
  const activeTypeLabel =
    selectedTypeFilter === "ALL"
      ? "Semua tipe"
      : selectedTypeFilter === "INCOME"
        ? "Pemasukan"
        : "Pengeluaran";

  const expenseByCategory = useMemo(() => {
    const grouped = filteredTransactions.reduce(
      (accumulator, transaction) => {
        if (transaction.type !== "EXPENSE") {
          return accumulator;
        }

        accumulator.set(
          transaction.category,
          (accumulator.get(transaction.category) ?? 0) + transaction.amount,
        );

        return accumulator;
      },
      new Map<string, number>(),
    );

    return Array.from(grouped.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((left, right) => right.amount - left.amount)
      .slice(0, 5);
  }, [filteredTransactions]);

  const highlightMetrics = useMemo(() => {
    const totalAmount = filteredTransactions.reduce(
      (sum, transaction) => sum + transaction.amount,
      0,
    );
    const averageAmount =
      filteredTransactions.length > 0 ? totalAmount / filteredTransactions.length : 0;
    const largestTransaction = filteredTransactions.reduce<TransactionView | null>(
      (currentLargest, transaction) => {
        if (!currentLargest || transaction.amount > currentLargest.amount) {
          return transaction;
        }

        return currentLargest;
      },
      null,
    );

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
    let currentMonthIncome = 0;
    let currentMonthExpense = 0;
    let recentTransactions = 0;

    for (const transaction of filteredTransactions) {
      const occurredAt = new Date(transaction.occurredAt);
      const transactionMonthKey = `${occurredAt.getFullYear()}-${occurredAt.getMonth()}`;
      const diffInDays =
        (now.getTime() - occurredAt.getTime()) / (1000 * 60 * 60 * 24);

      if (diffInDays <= 30) {
        recentTransactions += 1;
      }

      if (transactionMonthKey === currentMonthKey) {
        if (transaction.type === "INCOME") {
          currentMonthIncome += transaction.amount;
        } else {
          currentMonthExpense += transaction.amount;
        }
      }
    }

    const savingsRate =
      currentMonthIncome > 0
        ? Math.max(
            0,
            Math.round(
              ((currentMonthIncome - currentMonthExpense) / currentMonthIncome) * 100,
            ),
          )
        : 0;

    return {
      averageAmount,
      currentMonthIncome,
      currentMonthExpense,
      largestTransaction,
      recentTransactions,
      savingsRate,
    };
  }, [filteredTransactions]);

  function handleReceiptImport() {
    const parsedReceipt = parseReceiptImport(receiptImportText);

    if (!parsedReceipt) {
      setReceiptImportState(
        "Detail belum terbaca. Tempel teks hasil copy atau OCR yang memuat merchant, jumlah, dan waktu transaksi.",
      );
      return;
    }

    setType("EXPENSE");
    setTitleInput(parsedReceipt.title);
    setAmountInput(parsedReceipt.amount);
    setNoteInput(parsedReceipt.note);
    setOccurredAtInput(parsedReceipt.occurredAt || new Date().toISOString().slice(0, 10));
    setFormCategory(parsedReceipt.category);
    setReceiptImportState(
      "Detail transaksi berhasil dibaca dan sudah diisi ke form pengeluaran.",
    );
  }

  async function handleReceiptImageChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setReceiptImageName(file.name);
    setIsProcessingReceiptImage(true);
    setReceiptImportState("Membaca gambar transaksi dari file yang dipilih...");

    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, {
        logger(message) {
          if (message.status === "recognizing text") {
            setReceiptImportState(
              `OCR berjalan ${Math.round(message.progress * 100)}%...`,
            );
          }
        },
      });

      const {
        data: { text },
      } = await worker.recognize(file);

      await worker.terminate();

      setReceiptImportText(text);
      setReceiptImportState(
        "Teks dari gambar berhasil dibaca. Klik tombol isi otomatis untuk memasukkan ke pengeluaran.",
      );
    } catch {
      setReceiptImportState(
        "Gambar belum bisa dibaca otomatis. Coba gunakan screenshot yang lebih jelas atau tempel teks OCR secara manual.",
      );
    } finally {
      setIsProcessingReceiptImage(false);
      event.target.value = "";
    }
  }

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
              <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Import dari detail transaksi
                  </h3>
                  <p className="text-sm leading-6 text-slate-500">
                    Tempel teks hasil copy atau OCR dari screenshot QRIS/banking seperti
                    rincian merchant, jumlah, dan waktu transaksi. Form akan otomatis
                    diarahkan ke pengeluaran.
                  </p>
                </div>

                <div className="grid gap-3 pt-4">
                  <label className="grid gap-2 text-sm text-slate-600">
                    <span>Upload screenshot dari perangkat</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReceiptImageChange}
                      className="block w-full rounded-xl border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-slate-900 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700"
                    />
                    <p className="text-xs leading-5 text-slate-500">
                      Pilih gambar dari sistem, lalu app akan mencoba membaca teks
                      merchant, nominal, dan waktu transaksi otomatis.
                    </p>
                    {receiptImageName ? (
                      <p className="text-xs font-medium text-slate-600">
                        File dipilih: {receiptImageName}
                      </p>
                    ) : null}
                  </label>

                  <textarea
                    value={receiptImportText}
                    onChange={(event) => setReceiptImportText(event.target.value)}
                    rows={6}
                    placeholder={`Contoh:\nKe\nKFC TRAGIA NUSA DUA\nJumlah\nRp 22.000\nMetode Transaksi\nQRIS\nWaktu Transaksi\n29 Mar 2026, 12:22`}
                    className="w-full rounded-xl border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400"
                  />

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={handleReceiptImport}
                      disabled={isProcessingReceiptImage}
                      className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-300 sm:w-auto"
                    >
                      {isProcessingReceiptImage
                        ? "Memproses gambar..."
                        : "Isi otomatis ke pengeluaran"}
                    </button>

                    {receiptImportState ? (
                      <p className="text-sm text-slate-500">{receiptImportState}</p>
                    ) : null}
                  </div>
                </div>
              </div>

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
                        onChange={() => {
                          setType(option.value);
                          const nextCategoryOptions =
                            option.value === "INCOME"
                              ? incomeCategories
                              : expenseCategories;

                          if (!nextCategoryOptions.includes(formCategory)) {
                            setFormCategory(nextCategoryOptions[0]);
                          }
                        }}
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
                  value={titleInput}
                  onChange={(event) => setTitleInput(event.target.value)}
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
                    value={occurredAtInput}
                    onChange={(event) => setOccurredAtInput(event.target.value)}
                    className="rounded-xl border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                    required
                  />
                </label>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <label className="grid gap-2 text-sm text-slate-600">
                  <span>Kategori</span>
                  <select
                    name="category"
                    value={formCategory}
                    onChange={(event) => setFormCategory(event.target.value)}
                    className="rounded-xl border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                  >
                    {formCategoryOptions.map((option) => (
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
                    value={noteInput}
                    onChange={(event) => setNoteInput(event.target.value)}
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

              <div className="grid w-full gap-3 lg:w-auto lg:min-w-72">
                <label className="grid gap-2 text-sm text-slate-500">
                  <span>Cari transaksi</span>
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Cari judul, kategori, atau catatan"
                    className="w-full rounded-xl border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400"
                  />
                </label>

                <label className="grid gap-2 text-sm text-slate-500">
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
            </div>

            <div className="mt-4 grid gap-3 rounded-xl bg-[var(--surface-soft)] p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Ringkasan filter
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-[var(--border-soft)] bg-white px-3 py-1 text-xs text-slate-600">
                    {activeCategoryLabel}
                  </span>
                  <span className="rounded-full border border-[var(--border-soft)] bg-white px-3 py-1 text-xs text-slate-600">
                    {activeTypeLabel}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Semua", value: "ALL" as const },
                  { label: "Pemasukan", value: "INCOME" as const },
                  { label: "Pengeluaran", value: "EXPENSE" as const },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedTypeFilter(option.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      selectedTypeFilter === option.value
                        ? "bg-slate-900 text-white"
                        : "border border-[var(--border-soft)] bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
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

        <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-4 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Chart arus kas</h2>
              <p className="pt-1 text-sm leading-6 text-slate-500">
                Perbandingan pemasukan, pengeluaran, dan balance per bulan untuk 6
                periode terbaru.
              </p>
            </div>
            <span className="inline-flex w-fit rounded-full border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Chart.js
            </span>
          </div>

          <div className="pt-5">
            <TransactionsChart transactions={transactions} />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-4 sm:p-5">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-slate-900">Insight cepat</h2>
              <p className="text-sm leading-6 text-slate-500">
                Ringkasan otomatis dari transaksi yang sedang tampil di dashboard.
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <article className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Rata-rata transaksi
                </p>
                <p className="pt-2 text-lg font-semibold text-slate-900">
                  {formatCurrency(highlightMetrics.averageAmount)}
                </p>
              </article>

              <article className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Aktivitas 30 hari
                </p>
                <p className="pt-2 text-lg font-semibold text-slate-900">
                  {highlightMetrics.recentTransactions} transaksi
                </p>
              </article>

              <article className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Saving rate bulan ini
                </p>
                <p className="pt-2 text-lg font-semibold text-emerald-600">
                  {highlightMetrics.savingsRate}%
                </p>
                <p className="pt-1 text-sm text-slate-500">
                  Income {formatCurrency(highlightMetrics.currentMonthIncome)}
                </p>
              </article>

              <article className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Transaksi terbesar
                </p>
                <p className="pt-2 text-lg font-semibold text-slate-900">
                  {highlightMetrics.largestTransaction
                    ? formatCurrency(highlightMetrics.largestTransaction.amount)
                    : "Belum ada data"}
                </p>
                <p className="pt-1 text-sm text-slate-500">
                  {highlightMetrics.largestTransaction
                    ? `${highlightMetrics.largestTransaction.title} • ${formatShortDate(
                        highlightMetrics.largestTransaction.occurredAt,
                      )}`
                    : "Tambahkan transaksi pertama untuk melihat insight ini."}
                </p>
              </article>
            </div>
          </article>

          <article className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-4 sm:p-5">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-slate-900">Kategori pengeluaran</h2>
              <p className="text-sm leading-6 text-slate-500">
                Kategori paling dominan dari transaksi yang sedang difilter.
              </p>
            </div>

            <div className="mt-5 grid gap-3">
              {expenseByCategory.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
                  Belum ada pengeluaran pada filter ini.
                </div>
              ) : (
                expenseByCategory.map((item, index) => {
                  const maxAmount = expenseByCategory[0]?.amount ?? 1;
                  const widthPercentage = Math.max(
                    18,
                    Math.round((item.amount / maxAmount) * 100),
                  );

                  return (
                    <div
                      key={item.category}
                      className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">
                            {index + 1}. {item.category}
                          </p>
                          <p className="pt-1 text-sm text-slate-500">
                            {formatCurrency(item.amount)}
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                          Dominan
                        </span>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                        <div
                          className="h-full rounded-full bg-rose-500"
                          style={{ width: `${widthPercentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
