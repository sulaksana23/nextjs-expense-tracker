"use client";

import { useDeferredValue, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { logoutAction } from "@/app/actions/auth";
import {
  createTransactionAction,
  type TransactionState,
} from "@/app/actions/transactions";
import type { TransactionType } from "@/app/generated/prisma/enums";
import CategoryBreakdownChart from "@/components/category-breakdown-chart";
import MonthlyOverviewChart from "@/components/monthly-overview-chart";

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
type SortOption = "newest" | "oldest" | "largest" | "smallest";

type CategoryOption = {
  icon: string;
  label: string;
  type: TransactionType | "BOTH";
  value: string;
};

const categoryOptions: CategoryOption[] = [
  { value: "Food", label: "Food", icon: "🍔", type: "EXPENSE" },
  { value: "Transport", label: "Transport", icon: "🛵", type: "EXPENSE" },
  { value: "Shopping", label: "Shopping", icon: "🛍️", type: "EXPENSE" },
  { value: "Bills", label: "Bills", icon: "💡", type: "EXPENSE" },
  { value: "Health", label: "Health", icon: "💊", type: "EXPENSE" },
  { value: "Entertainment", label: "Entertainment", icon: "🎬", type: "EXPENSE" },
  { value: "Education", label: "Education", icon: "📚", type: "EXPENSE" },
  { value: "Travel", label: "Travel", icon: "✈️", type: "EXPENSE" },
  { value: "Salary", label: "Salary", icon: "💼", type: "INCOME" },
  { value: "Freelance", label: "Freelance", icon: "🧑‍💻", type: "INCOME" },
  { value: "Bonus", label: "Bonus", icon: "🎁", type: "INCOME" },
  { value: "Investment", label: "Investment", icon: "📈", type: "INCOME" },
  { value: "Business", label: "Business", icon: "🏪", type: "INCOME" },
  { value: "Subscription", label: "Subscription", icon: "🔁", type: "BOTH" },
  { value: "Other", label: "Other", icon: "🧾", type: "BOTH" },
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

function formatMonthYear(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(value);
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

function normalizeCategory(value: string) {
  return value.trim().toLowerCase();
}

function getCategoryMeta(category: string) {
  const normalized = normalizeCategory(category);

  const exactMatch = categoryOptions.find(
    (option) => normalizeCategory(option.value) === normalized,
  );

  if (exactMatch) {
    return exactMatch;
  }

  if (
    ["makan", "kuliner", "food", "restaurant", "resto", "cafe", "kopi"].includes(
      normalized,
    )
  ) {
    return categoryOptions[0];
  }

  if (["transport", "gojek", "grab", "parkir", "bensin"].includes(normalized)) {
    return categoryOptions[1];
  }

  if (["belanja", "shopping", "store", "mart"].includes(normalized)) {
    return categoryOptions[2];
  }

  if (["tagihan", "bills", "listrik", "air", "internet"].includes(normalized)) {
    return categoryOptions[3];
  }

  if (["kesehatan", "health", "apotek", "klinik"].includes(normalized)) {
    return categoryOptions[4];
  }

  if (["hiburan", "entertainment", "bioskop", "game", "netflix"].includes(normalized)) {
    return categoryOptions[5];
  }

  if (["gaji", "salary", "payroll"].includes(normalized)) {
    return categoryOptions[8];
  }

  return categoryOptions[categoryOptions.length - 1];
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
    return "Food";
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
    return "Bills";
  }

  if (
    normalizedTitle.includes("apotek") ||
    normalizedTitle.includes("klinik") ||
    normalizedTitle.includes("rumah sakit")
  ) {
    return "Health";
  }

  if (
    normalizedTitle.includes("bioskop") ||
    normalizedTitle.includes("game") ||
    normalizedTitle.includes("netflix")
  ) {
    return "Entertainment";
  }

  if (
    normalizedTitle.includes("belanja") ||
    normalizedTitle.includes("mart") ||
    normalizedTitle.includes("store") ||
    normalizedTitle.includes("shop")
  ) {
    return "Shopping";
  }

  return "Other";
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

function escapeCsv(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function buildCsv(transactions: TransactionView[]) {
  const rows = [
    ["Tanggal", "Tipe", "Kategori", "Judul", "Catatan", "Nominal"],
    ...transactions.map((transaction) => [
      formatDate(transaction.occurredAt),
      transaction.type === "INCOME" ? "Income" : "Expense",
      transaction.category,
      transaction.title,
      transaction.note ?? "",
      String(transaction.amount),
    ]),
  ];

  return rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
}

function buildPdfHtmlReport(
  userName: string,
  transactions: TransactionView[],
  totals: { income: number; expense: number },
) {
  const balance = totals.income - totals.expense;
  const generatedAt = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date());

  const rows = transactions
    .map((transaction) => {
      const sign = transaction.type === "INCOME" ? "+" : "-";
      return `
        <tr>
          <td>${formatDate(transaction.occurredAt)}</td>
          <td>${transaction.type === "INCOME" ? "Income" : "Expense"}</td>
          <td>${getCategoryMeta(transaction.category).icon} ${transaction.category}</td>
          <td>${transaction.title}</td>
          <td>${transaction.note ?? "-"}</td>
          <td style="text-align:right;">${sign}${formatCurrency(transaction.amount)}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <!doctype html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <title>Laporan Expense Tracker</title>
        <style>
          body { font-family: Arial, sans-serif; color: #0f172a; padding: 24px; }
          h1 { margin: 0 0 8px; font-size: 24px; }
          p { margin: 0 0 8px; color: #475569; }
          .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 20px 0; }
          .card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px; background: #f8fafc; }
          .label { font-size: 12px; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
          .value { font-size: 18px; font-weight: 700; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 12px; }
          th, td { border: 1px solid #dbe2ea; padding: 8px; vertical-align: top; }
          th { background: #eff6ff; text-align: left; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Laporan Keuangan ${userName}</h1>
        <p>Dibuat pada ${generatedAt}</p>
        <p>Total data diexport: ${transactions.length} transaksi</p>
        <div class="summary">
          <div class="card">
            <div class="label">Total Income</div>
            <div class="value">${formatCurrency(totals.income)}</div>
          </div>
          <div class="card">
            <div class="label">Total Expense</div>
            <div class="value">${formatCurrency(totals.expense)}</div>
          </div>
          <div class="card">
            <div class="label">Balance</div>
            <div class="value">${formatCurrency(balance)}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Tipe</th>
              <th>Kategori</th>
              <th>Judul</th>
              <th>Catatan</th>
              <th>Nominal</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `;
}

function downloadFile(content: BlobPart, fileName: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--accent-strong)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
    >
      {pending ? "Menyimpan..." : label}
    </button>
  );
}

export default function DashboardClient({
  userName,
  transactions,
}: DashboardClientProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [clientTransactions, setClientTransactions] = useState(transactions);
  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [amountInput, setAmountInput] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [occurredAtInput, setOccurredAtInput] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [formCategory, setFormCategory] = useState("Food");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [selectedTypeFilter, setSelectedTypeFilter] =
    useState<TransactionTypeFilter>("ALL");
  const [selectedSort, setSelectedSort] = useState<SortOption>("newest");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [receiptImportText, setReceiptImportText] = useState("");
  const [receiptImportState, setReceiptImportState] = useState("");
  const [receiptImageName, setReceiptImageName] = useState("");
  const [isProcessingReceiptImage, setIsProcessingReceiptImage] = useState(false);
  const [transactionState, setTransactionState] = useState<TransactionState>({});
  const deferredCategory = useDeferredValue(selectedCategory);
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());

  const formCategoryOptions = useMemo(
    () =>
      categoryOptions.filter(
        (option) => option.type === "BOTH" || option.type === type,
      ),
    [type],
  );

  const categories = useMemo(() => {
    const source = new Set<string>(["Semua"]);

    for (const transaction of clientTransactions) {
      source.add(transaction.category);
    }

    return Array.from(source).sort((left, right) => {
      if (left === "Semua") {
        return -1;
      }

      if (right === "Semua") {
        return 1;
      }

      return left.localeCompare(right);
    });
  }, [clientTransactions]);

  const filteredTransactions = useMemo(() => {
    return clientTransactions.filter((transaction) => {
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

      if (dateFrom && transaction.occurredAt.slice(0, 10) < dateFrom) {
        return false;
      }

      if (dateTo && transaction.occurredAt.slice(0, 10) > dateTo) {
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
  }, [
    clientTransactions,
    dateFrom,
    dateTo,
    deferredCategory,
    deferredSearchQuery,
    selectedTypeFilter,
  ]);

  const sortedTransactions = useMemo(() => {
    const nextTransactions = [...filteredTransactions];

    nextTransactions.sort((left, right) => {
      if (selectedSort === "largest") {
        return right.amount - left.amount;
      }

      if (selectedSort === "smallest") {
        return left.amount - right.amount;
      }

      if (selectedSort === "oldest") {
        return (
          new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime()
        );
      }

      return (
        new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()
      );
    });

    return nextTransactions;
  }, [filteredTransactions, selectedSort]);

  const totals = useMemo(() => {
    return clientTransactions.reduce(
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
  }, [clientTransactions]);

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

  const monthlyExpenseAnalytics = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const currentMonthExpenses = clientTransactions.filter((transaction) => {
      if (transaction.type !== "EXPENSE") {
        return false;
      }

      const occurredAt = new Date(transaction.occurredAt);
      return occurredAt.getMonth() === month && occurredAt.getFullYear() === year;
    });

    const largestExpense = currentMonthExpenses.reduce<TransactionView | null>(
      (currentLargest, transaction) => {
        if (!currentLargest || transaction.amount > currentLargest.amount) {
          return transaction;
        }

        return currentLargest;
      },
      null,
    );

    return {
      label: formatMonthYear(new Date(year, month, 1)),
      largestExpense,
    };
  }, [clientTransactions]);

  const categoryAnalytics = useMemo(() => {
    const grouped = filteredTransactions.reduce((accumulator, transaction) => {
      if (transaction.type !== "EXPENSE") {
        return accumulator;
      }

      accumulator.set(
        transaction.category,
        (accumulator.get(transaction.category) ?? 0) + transaction.amount,
      );

      return accumulator;
    }, new Map<string, number>());

    const ordered = Array.from(grouped.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((left, right) => right.amount - left.amount);

    return {
      byCategory: ordered,
      topCategory: ordered[0] ?? null,
    };
  }, [filteredTransactions]);

  const balanceTrendLabel = filteredTotals.income - filteredTotals.expense;
  const activeCategoryLabel =
    deferredCategory === "Semua" ? "Semua kategori" : deferredCategory;
  const activeTypeLabel =
    selectedTypeFilter === "ALL"
      ? "Semua tipe"
      : selectedTypeFilter === "INCOME"
        ? "Pemasukan"
        : "Pengeluaran";

  function resetFormState() {
    setType("EXPENSE");
    setAmountInput("");
    setTitleInput("");
    setNoteInput("");
    setOccurredAtInput(new Date().toISOString().slice(0, 10));
    setFormCategory("Food");
    setReceiptImportText("");
    setReceiptImageName("");
  }

  function handleExportCsv() {
    const csv = buildCsv(sortedTransactions);
    downloadFile(csv, "expense-tracker-export.csv", "text/csv;charset=utf-8");
  }

  function handleExportPdf() {
    const reportWindow = window.open("", "_blank", "noopener,noreferrer,width=1080,height=820");

    if (!reportWindow) {
      setReceiptImportState(
        "Popup untuk export PDF diblokir browser. Izinkan popup lalu coba lagi.",
      );
      return;
    }

    reportWindow.document.write(
      buildPdfHtmlReport(userName, sortedTransactions, filteredTotals),
    );
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  }

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

  async function handleCreateTransaction(formData: FormData) {
    const result = await createTransactionAction(initialTransactionState, formData);
    const createdTransaction = result.createdTransaction;

    setTransactionState(result);

    if (!result.success || !createdTransaction) {
      return;
    }

    setClientTransactions((currentTransactions) =>
      [createdTransaction, ...currentTransactions].sort(
        (left, right) =>
          new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
      ),
    );

    resetFormState();
    setReceiptImportState("Transaksi berhasil ditambahkan tanpa refresh halaman.");
    formRef.current?.reset();
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-2.5 py-2.5 text-slate-900 sm:px-3 sm:py-3 md:px-4 md:py-4">
      <div className="mx-auto grid w-full max-w-7xl gap-2.5">
        <header className="grid gap-3 rounded-[28px] border border-[var(--border-soft)] bg-[var(--surface-card)] p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)] lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex w-fit rounded-full bg-[var(--surface-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-700">
                Expense Tracker v2
              </span>
              <span className="inline-flex rounded-full border border-[var(--border-soft)] bg-white px-3 py-1 text-[11px] font-medium text-slate-600">
                Data privat per akun
              </span>
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                Halo, {userName}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                Dashboard ini sekarang merangkum saldo, income, expense, analytics,
                filter, sorting, dan export. Semua transaksi yang tampil hanya milik
                user yang sedang login.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Snapshot aktif
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-600">
                  {activeCategoryLabel}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-600">
                  {activeTypeLabel}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-600">
                  Sort: {selectedSort}
                </span>
              </div>
            </div>

            <form action={logoutAction} className="flex items-start justify-start lg:justify-end">
              <button
                type="submit"
                className="w-full rounded-xl border border-slate-200 bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
              >
                Logout
              </button>
            </form>
          </div>
        </header>

        <section className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total Balance",
              value: formatCurrency(balance),
              tone: balance >= 0 ? "text-emerald-600" : "text-rose-600",
              subtitle: "Selisih income dan expense seluruh data",
            },
            {
              label: "Total Income",
              value: formatCurrency(totals.income),
              tone: "text-emerald-600",
              subtitle: "Akumulasi semua pemasukan",
            },
            {
              label: "Total Expense",
              value: formatCurrency(totals.expense),
              tone: "text-rose-600",
              subtitle: "Akumulasi semua pengeluaran",
            },
            {
              label: "Filtered Result",
              value: `${sortedTransactions.length} transaksi`,
              tone: "text-sky-700",
              subtitle: "Berdasarkan filter tanggal, kategori, tipe, dan search",
            },
          ].map((card) => (
            <article
              key={card.label}
              className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]"
            >
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{card.label}</p>
              <h2 className={`pt-1 text-lg font-semibold tracking-tight ${card.tone}`}>
                {card.value}
              </h2>
              <p className="pt-2 text-xs leading-5 text-slate-500">{card.subtitle}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-2.5 xl:grid-cols-[1.4fr_0.9fr]">
          <article className="rounded-[28px] border border-[var(--border-soft)] bg-[var(--surface-card)] p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Dashboard arus kas</h2>
                <p className="pt-1 text-sm leading-6 text-slate-500">
                  Grafik bulanan untuk memantau income, expense, dan balance dalam 6
                  periode terbaru.
                </p>
              </div>
              <span className="inline-flex w-fit rounded-full border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Recharts
              </span>
            </div>

            <div className="pt-4">
              <MonthlyOverviewChart transactions={clientTransactions} />
            </div>
          </article>

          <article className="rounded-[28px] border border-[var(--border-soft)] bg-[var(--surface-card)] p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-slate-900">Analytics cepat</h2>
              <p className="text-sm leading-6 text-slate-500">
                Insight otomatis untuk membantu baca pola pengeluaran lebih cepat.
              </p>
            </div>

            <div className="mt-4 grid gap-2.5">
              <article className="rounded-2xl border border-rose-100 bg-rose-50/80 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-rose-500">
                  Pengeluaran terbesar bulan ini
                </p>
                {monthlyExpenseAnalytics.largestExpense ? (
                  <>
                    <p className="pt-2 text-base font-semibold text-slate-900">
                      {monthlyExpenseAnalytics.largestExpense.title}
                    </p>
                    <p className="pt-1 text-sm text-slate-600">
                      {getCategoryMeta(monthlyExpenseAnalytics.largestExpense.category).icon}{" "}
                      {monthlyExpenseAnalytics.largestExpense.category} •{" "}
                      {monthlyExpenseAnalytics.label}
                    </p>
                    <p className="pt-2 text-lg font-semibold text-rose-600">
                      {formatCurrency(monthlyExpenseAnalytics.largestExpense.amount)}
                    </p>
                  </>
                ) : (
                  <p className="pt-2 text-sm text-slate-600">
                    Belum ada data pengeluaran pada {monthlyExpenseAnalytics.label}.
                  </p>
                )}
              </article>

              <article className="rounded-2xl border border-amber-100 bg-amber-50/80 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-amber-600">
                  Kategori paling boros
                </p>
                {categoryAnalytics.topCategory ? (
                  <>
                    <p className="pt-2 text-base font-semibold text-slate-900">
                      {getCategoryMeta(categoryAnalytics.topCategory.category).icon}{" "}
                      {categoryAnalytics.topCategory.category}
                    </p>
                    <p className="pt-1 text-sm text-slate-600">
                      Diambil dari data yang sedang terfilter.
                    </p>
                    <p className="pt-2 text-lg font-semibold text-amber-700">
                      {formatCurrency(categoryAnalytics.topCategory.amount)}
                    </p>
                  </>
                ) : (
                  <p className="pt-2 text-sm text-slate-600">
                    Belum ada pengeluaran untuk dihitung.
                  </p>
                )}
              </article>

              <article className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-emerald-600">
                  Balance aktif
                </p>
                <p className="pt-2 text-base font-semibold text-slate-900">
                  {formatCurrency(balanceTrendLabel)}
                </p>
                <p className="pt-1 text-sm text-slate-600">
                  Berdasarkan data yang sedang ditampilkan di dashboard.
                </p>
              </article>
            </div>
          </article>
        </section>

        <section className="grid gap-2.5 xl:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-[28px] border border-[var(--border-soft)] bg-[var(--surface-card)] p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-900">Tambah transaksi</h2>
                <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  Multi-user ready
                </span>
              </div>
              <p className="text-sm leading-6 text-slate-600">
                Input pemasukan dan pengeluaran dengan kategori yang lebih rapi, plus
                helper OCR untuk detail transaksi dari screenshot.
              </p>
            </div>

            {transactionState?.error ? (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
                {transactionState.error}
              </div>
            ) : null}

            <form ref={formRef} action={handleCreateTransaction} className="grid gap-2.5 pt-4">
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3">
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-900">
                    Import dari detail transaksi
                  </h3>
                  <p className="text-sm leading-6 text-slate-500">
                    Tempel teks hasil copy atau OCR dari screenshot QRIS atau mobile
                    banking untuk isi form lebih cepat.
                  </p>
                </div>

                <div className="grid gap-2.5 pt-3">
                  <label className="grid gap-1.5 text-sm text-slate-600">
                    <span>Upload screenshot dari perangkat</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReceiptImageChange}
                      className="block w-full rounded-xl border border-[var(--border-soft)] bg-white px-4 py-2 text-sm text-slate-900 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700"
                    />
                    {receiptImageName ? (
                      <p className="text-xs font-medium text-slate-600">
                        File dipilih: {receiptImageName}
                      </p>
                    ) : null}
                  </label>

                  <textarea
                    value={receiptImportText}
                    onChange={(event) => setReceiptImportText(event.target.value)}
                    rows={4}
                    placeholder={`Contoh:\nKe\nKFC TRAGIA NUSA DUA\nJumlah\nRp 22.000\nMetode Transaksi\nQRIS\nWaktu Transaksi\n29 Mar 2026, 12:22`}
                    className="w-full rounded-xl border border-[var(--border-soft)] bg-white px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400"
                  />

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={handleReceiptImport}
                      disabled={isProcessingReceiptImage}
                      className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-300 disabled:opacity-60 sm:w-auto"
                    >
                      {isProcessingReceiptImage
                        ? "Memproses gambar..."
                        : "Isi otomatis ke pengeluaran"}
                    </button>

                    {receiptImportState ? (
                      <p className="text-xs text-slate-500 sm:text-sm">{receiptImportState}</p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid gap-1.5">
                <span className="text-sm text-slate-600">Tipe transaksi</span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    { label: "Pengeluaran", value: "EXPENSE" as const },
                    { label: "Pemasukan", value: "INCOME" as const },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`rounded-xl border px-4 py-2 text-center text-sm font-medium transition ${
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
                          const nextDefaultCategory =
                            option.value === "INCOME" ? "Salary" : "Food";

                          if (
                            !formCategoryOptions.some(
                              (categoryOption) => categoryOption.value === formCategory,
                            )
                          ) {
                            setFormCategory(nextDefaultCategory);
                          }
                        }}
                        className="sr-only"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              <label className="grid gap-1.5 text-sm text-slate-600">
                <span>Judul transaksi</span>
                <input
                  name="title"
                  value={titleInput}
                  onChange={(event) => setTitleInput(event.target.value)}
                  placeholder={type === "INCOME" ? "Gaji bulanan" : "Makan siang"}
                  className="rounded-xl border border-[var(--border-soft)] bg-white px-4 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>

              <div className="grid gap-2.5 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm text-slate-600">
                  <span>Nominal</span>
                  <input
                    name="amount"
                    inputMode="numeric"
                    value={amountInput}
                    onChange={(event) =>
                      setAmountInput(event.target.value.replace(/[^\d]/g, ""))
                    }
                    placeholder="50000"
                    className="rounded-xl border border-[var(--border-soft)] bg-white px-4 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400"
                  />
                  <span className="text-xs text-slate-500">
                    {amountInput ? formatRupiahInput(amountInput) : "Masukkan nominal transaksi"}
                  </span>
                </label>

                <label className="grid gap-1.5 text-sm text-slate-600">
                  <span>Tanggal transaksi</span>
                  <input
                    name="occurredAt"
                    type="date"
                    value={occurredAtInput}
                    onChange={(event) => setOccurredAtInput(event.target.value)}
                    className="rounded-xl border border-[var(--border-soft)] bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                  />
                </label>
              </div>

              <label className="grid gap-1.5 text-sm text-slate-600">
                <span>Kategori transaksi</span>
                <select
                  name="category"
                  value={formCategory}
                  onChange={(event) => setFormCategory(event.target.value)}
                  className="rounded-xl border border-[var(--border-soft)] bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                >
                  {formCategoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.icon} {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5 text-sm text-slate-600">
                <span>Catatan</span>
                <textarea
                  name="note"
                  value={noteInput}
                  onChange={(event) => setNoteInput(event.target.value)}
                  rows={3}
                  placeholder="Contoh: makan bareng tim, invoice bulan Maret, atau langganan rutin"
                  className="rounded-xl border border-[var(--border-soft)] bg-white px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <SubmitButton label="Simpan transaksi" />
                <button
                  type="button"
                  onClick={() => {
                    resetFormState();
                    setReceiptImportState("");
                    formRef.current?.reset();
                  }}
                  className="inline-flex items-center justify-center rounded-xl border border-[var(--border-soft)] bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                >
                  Reset form
                </button>
              </div>
            </form>
          </article>

          <article className="rounded-[28px] border border-[var(--border-soft)] bg-[var(--surface-card)] p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold">Filter, sorting, dan export</h2>
                  <p className="pt-1 text-sm leading-6 text-slate-500">
                    Kombinasikan filter tanggal, kategori, tipe, pencarian, dan urutan
                    untuk membaca data lebih presisi.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="rounded-xl border border-[var(--border-soft)] bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                  >
                    Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Export PDF
                  </button>
                </div>
              </div>

              <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                <label className="grid gap-1.5 text-sm text-slate-500">
                  <span>Cari transaksi</span>
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Cari judul, kategori, atau catatan"
                    className="w-full rounded-xl border border-[var(--border-soft)] bg-white px-4 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400"
                  />
                </label>

                <label className="grid gap-1.5 text-sm text-slate-500">
                  <span>Filter kategori</span>
                  <select
                    value={selectedCategory}
                    onChange={(event) => setSelectedCategory(event.target.value)}
                    className="w-full rounded-xl border border-[var(--border-soft)] bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                  >
                    {categories.map((category) => {
                      const meta = getCategoryMeta(category);
                      return (
                        <option key={category} value={category}>
                          {category === "Semua" ? category : `${meta.icon} ${category}`}
                        </option>
                      );
                    })}
                  </select>
                </label>

                <label className="grid gap-1.5 text-sm text-slate-500">
                  <span>Sorting</span>
                  <select
                    value={selectedSort}
                    onChange={(event) => setSelectedSort(event.target.value as SortOption)}
                    className="w-full rounded-xl border border-[var(--border-soft)] bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                  >
                    <option value="newest">Terbaru</option>
                    <option value="oldest">Terlama</option>
                    <option value="largest">Nominal terbesar</option>
                    <option value="smallest">Nominal terkecil</option>
                  </select>
                </label>

                <label className="grid gap-1.5 text-sm text-slate-500">
                  <span>Dari tanggal</span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(event) => setDateFrom(event.target.value)}
                    className="w-full rounded-xl border border-[var(--border-soft)] bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                  />
                </label>

                <label className="grid gap-1.5 text-sm text-slate-500">
                  <span>Sampai tanggal</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(event) => setDateTo(event.target.value)}
                    className="w-full rounded-xl border border-[var(--border-soft)] bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                  />
                </label>

                <div className="grid gap-1.5 text-sm text-slate-500">
                  <span>Tipe transaksi</span>
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
                        className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                          selectedTypeFilter === option.value
                            ? "bg-slate-900 text-white"
                            : "border border-[var(--border-soft)] bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-3">
                <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3.5 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Income filtered
                  </p>
                  <p className="pt-1 text-sm font-semibold text-emerald-600 sm:text-base">
                    {formatCurrency(filteredTotals.income)}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3.5 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Expense filtered
                  </p>
                  <p className="pt-1 text-sm font-semibold text-rose-600 sm:text-base">
                    {formatCurrency(filteredTotals.expense)}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3.5 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Balance filtered
                  </p>
                  <p className="pt-1 text-sm font-semibold text-slate-900 sm:text-base">
                    {formatCurrency(filteredTotals.income - filteredTotals.expense)}
                  </p>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="grid gap-2.5 xl:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-[28px] border border-[var(--border-soft)] bg-[var(--surface-card)] p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Grafik per kategori</h2>
                <p className="pt-1 text-sm leading-6 text-slate-500">
                  Breakdown pengeluaran berdasarkan kategori dari data yang sedang
                  terfilter.
                </p>
              </div>
              <span className="text-xs text-slate-500">
                Top {Math.min(categoryAnalytics.byCategory.length, 6)} kategori
              </span>
            </div>

            <div className="pt-4">
              <CategoryBreakdownChart items={categoryAnalytics.byCategory} />
            </div>
          </article>

          <article className="rounded-[28px] border border-[var(--border-soft)] bg-[var(--surface-card)] p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">List transaksi</h2>
                <p className="pt-1 text-sm leading-6 text-slate-500">
                  Tampilan transaksi sekarang mendukung kategori, icon, filter tanggal,
                  dan sorting yang lebih fleksibel.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("Semua");
                  setSelectedTypeFilter("ALL");
                  setSelectedSort("newest");
                  setDateFrom("");
                  setDateTo("");
                  setSearchQuery("");
                }}
                className="rounded-xl border border-[var(--border-soft)] bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
              >
                Reset filter
              </button>
            </div>

            <div className="mt-4 grid gap-2.5">
              {sortedTransactions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
                  Belum ada transaksi untuk kombinasi filter ini.
                </div>
              ) : (
                sortedTransactions.map((transaction) => {
                  const categoryMeta = getCategoryMeta(transaction.category);

                  return (
                    <article
                      key={transaction.id}
                      className="grid gap-3 rounded-2xl border border-[var(--border-soft)] bg-white px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start"
                    >
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="break-words text-sm font-semibold text-slate-900 sm:text-base">
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
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {categoryMeta.icon} {transaction.category}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 sm:text-sm">
                          <span>{formatDate(transaction.occurredAt)}</span>
                          {transaction.note ? <span>{transaction.note}</span> : null}
                        </div>
                      </div>

                      <div
                        className={`text-left text-sm font-semibold tracking-tight sm:text-base md:text-right ${
                          transaction.type === "INCOME"
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }`}
                      >
                        {transaction.type === "INCOME" ? "+" : "-"}
                        {formatCurrency(transaction.amount)}
                      </div>
                    </article>
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
