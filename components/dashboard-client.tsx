"use client";
import { useDeferredValue, useMemo, useRef, useState, useCallback } from "react";
import { useFormStatus } from "react-dom";
import { logoutAction } from "@/app/actions/auth";
import {
  createTransactionAction,
  type TransactionState,
} from "@/app/actions/transactions";
import type { TransactionType } from "@/app/generated/prisma/enums";
import CategoryBreakdownChart from "@/components/category-breakdown-chart";
import MonthlyOverviewChart from "@/components/monthly-overview-chart";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS: CategoryOption[] = [
  { value: "Food",          label: "Food",          icon: "🍔", type: "EXPENSE" },
  { value: "Transport",     label: "Transport",     icon: "🛵", type: "EXPENSE" },
  { value: "Shopping",      label: "Shopping",      icon: "🛍️", type: "EXPENSE" },
  { value: "Bills",         label: "Bills",         icon: "💡", type: "EXPENSE" },
  { value: "Health",        label: "Health",        icon: "💊", type: "EXPENSE" },
  { value: "Entertainment", label: "Entertainment", icon: "🎬", type: "EXPENSE" },
  { value: "Education",     label: "Education",     icon: "📚", type: "EXPENSE" },
  { value: "Travel",        label: "Travel",        icon: "✈️", type: "EXPENSE" },
  { value: "Salary",        label: "Salary",        icon: "💼", type: "INCOME"  },
  { value: "Freelance",     label: "Freelance",     icon: "🧑‍💻", type: "INCOME"  },
  { value: "Bonus",         label: "Bonus",         icon: "🎁", type: "INCOME"  },
  { value: "Investment",    label: "Investment",    icon: "📈", type: "INCOME"  },
  { value: "Business",      label: "Business",      icon: "🏪", type: "INCOME"  },
  { value: "Subscription",  label: "Subscription",  icon: "🔁", type: "BOTH"    },
  { value: "Other",         label: "Other",         icon: "🧾", type: "BOTH"    },
];

// Pre-built lookup map — O(1) instead of O(n) find on every render
const CATEGORY_MAP = new Map(
  CATEGORY_OPTIONS.map((o) => [o.value.toLowerCase(), o])
);

const MONTH_MAP = new Map([
  ["jan","01"],["feb","02"],["mar","03"],["apr","04"],["mei","05"],["jun","06"],
  ["jul","07"],["agu","08"],["sep","09"],["okt","10"],["nov","11"],["des","12"],
]);

const FALLBACK_CATEGORY = CATEGORY_OPTIONS[CATEGORY_OPTIONS.length - 1]!;
const INITIAL_TX_STATE: TransactionState = {};

// ─── Pure utilities ───────────────────────────────────────────────────────────

const idr = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);

const fmtDate = (v: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(v));

const fmtMonthYear = (v: Date) =>
  new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(v);

function getCategoryMeta(category: string): CategoryOption {
  const key = category.trim().toLowerCase();
  if (CATEGORY_MAP.has(key)) return CATEGORY_MAP.get(key)!;
  // Alias fallbacks
  const aliases: Record<string, CategoryOption> = {
    makan: CATEGORY_OPTIONS[0]!, kuliner: CATEGORY_OPTIONS[0]!, restaurant: CATEGORY_OPTIONS[0]!, resto: CATEGORY_OPTIONS[0]!, cafe: CATEGORY_OPTIONS[0]!, kopi: CATEGORY_OPTIONS[0]!,
    gojek: CATEGORY_OPTIONS[1]!, grab: CATEGORY_OPTIONS[1]!, parkir: CATEGORY_OPTIONS[1]!, bensin: CATEGORY_OPTIONS[1]!,
    belanja: CATEGORY_OPTIONS[2]!, store: CATEGORY_OPTIONS[2]!, mart: CATEGORY_OPTIONS[2]!,
    tagihan: CATEGORY_OPTIONS[3]!, listrik: CATEGORY_OPTIONS[3]!, air: CATEGORY_OPTIONS[3]!, internet: CATEGORY_OPTIONS[3]!,
    kesehatan: CATEGORY_OPTIONS[4]!, apotek: CATEGORY_OPTIONS[4]!, klinik: CATEGORY_OPTIONS[4]!,
    hiburan: CATEGORY_OPTIONS[5]!, bioskop: CATEGORY_OPTIONS[5]!, game: CATEGORY_OPTIONS[5]!, netflix: CATEGORY_OPTIONS[5]!,
    gaji: CATEGORY_OPTIONS[8]!, salary: CATEGORY_OPTIONS[8]!, payroll: CATEGORY_OPTIONS[8]!,
  };
  return aliases[key] ?? FALLBACK_CATEGORY;
}

function guessCategory(title: string): string {
  const t = title.toLowerCase();
  if (/kfc|makan|resto|cafe|kopi/.test(t)) return "Food";
  if (/gojek|grab|transport|parkir/.test(t)) return "Transport";
  if (/listrik|air|internet|tagihan/.test(t)) return "Bills";
  if (/apotek|klinik|rumah sakit/.test(t)) return "Health";
  if (/bioskop|game|netflix/.test(t)) return "Entertainment";
  if (/belanja|mart|store|shop/.test(t)) return "Shopping";
  return "Other";
}

function toIsoDate(v: string): string {
  const m = v.trim().toLowerCase().match(/(\d{1,2})\s+([a-z]{3})\s+(\d{4})/);
  if (!m) return "";
  const month = MONTH_MAP.get(m[2]!);
  return month ? `${m[3]}-${month}-${m[1]!.padStart(2, "0")}` : "";
}

function parseReceipt(raw: string) {
  const joined = raw.split("\n").map((l) => l.trim()).filter(Boolean).join("\n");
  const merchant = joined.match(/Ke\s*\n?(.+)/i)?.[1]?.trim() ?? joined.match(/merchant\s*[:\-]?\s*(.+)/i)?.[1]?.trim() ?? "";
  const amountRaw = joined.match(/Jumlah\s*\n?Rp\s*([\d.]+)/i)?.[1] ?? joined.match(/Rp\s*([\d.]+)/i)?.[1] ?? "";
  const amount = amountRaw.replace(/\D/g, "");
  if (!amount) return null;
  const dateText = joined.match(/Waktu\s+Transaksi\s*\n?([^\n,]+(?:,\s*\d{2}:\d{2})?)/i)?.[1] ?? "";
  const method   = joined.match(/Metode\s+Transaksi\s*\n?([^\n]+)/i)?.[1]?.trim() ?? "";
  const acquirer = joined.match(/Nama\s+Acquirer\s*\n?([^\n]+)/i)?.[1]?.trim() ?? "";
  const ref      = joined.match(/No\.\s*Referensi\s*\n?([^\n]+)/i)?.[1]?.trim() ?? "";
  const title    = merchant || "Pengeluaran QRIS";
  return {
    amount,
    title,
    category: guessCategory(title),
    occurredAt: toIsoDate(dateText),
    note: [method, acquirer, ref && `Ref ${ref}`].filter(Boolean).join(" • "),
  };
}

const esc = (v: string) => `"${v.replaceAll('"', '""')}"`;

function buildCsv(txs: TransactionView[]) {
  return [
    ["Tanggal","Tipe","Kategori","Judul","Catatan","Nominal"],
    ...txs.map((t) => [fmtDate(t.occurredAt), t.type === "INCOME" ? "Income" : "Expense", t.category, t.title, t.note ?? "", String(t.amount)]),
  ].map((row) => row.map(esc).join(",")).join("\n");
}

function buildPdfHtml(userName: string, txs: TransactionView[], totals: { income: number; expense: number }) {
  const bal = totals.income - totals.expense;
  const gen = new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeStyle: "short" }).format(new Date());
  const rows = txs.map((t) => {
    const sign = t.type === "INCOME" ? "+" : "-";
    return `<tr><td>${fmtDate(t.occurredAt)}</td><td>${t.type === "INCOME" ? "Income" : "Expense"}</td><td>${getCategoryMeta(t.category).icon} ${t.category}</td><td>${t.title}</td><td>${t.note ?? "-"}</td><td style="text-align:right">${sign}${idr(t.amount)}</td></tr>`;
  }).join("");
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"/><title>Laporan</title><style>
    body{font-family:Arial,sans-serif;color:#0f172a;padding:24px}h1{margin:0 0 8px;font-size:24px}p{margin:0 0 8px;color:#475569}
    .s{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px 0}.c{border:1px solid #cbd5e1;border-radius:12px;padding:12px;background:#f8fafc}
    .l{font-size:12px;text-transform:uppercase;color:#64748b;margin-bottom:6px}.v{font-size:18px;font-weight:700}
    table{width:100%;border-collapse:collapse;margin-top:18px;font-size:12px}th,td{border:1px solid #dbe2ea;padding:8px;vertical-align:top}th{background:#eff6ff;text-align:left}
    @media print{body{padding:0}}
  </style></head><body>
    <h1>Laporan Keuangan ${userName}</h1><p>Dibuat pada ${gen}</p><p>${txs.length} transaksi</p>
    <div class="s"><div class="c"><div class="l">Income</div><div class="v">${idr(totals.income)}</div></div><div class="c"><div class="l">Expense</div><div class="v">${idr(totals.expense)}</div></div><div class="c"><div class="l">Balance</div><div class="v">${idr(bal)}</div></div></div>
    <table><thead><tr><th>Tanggal</th><th>Tipe</th><th>Kategori</th><th>Judul</th><th>Catatan</th><th>Nominal</th></tr></thead><tbody>${rows}</tbody></table>
  </body></html>`;
}

function dl(content: BlobPart, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
      {pending ? "Menyimpan…" : label}
    </button>
  );
}

function StatCard({ label, value, tone, sub }: { label: string; value: string; tone: string; sub: string }) {
  return (
    <article className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${tone}`}>{value}</p>
      <p className="mt-1 text-[11px] leading-4 text-slate-400">{sub}</p>
    </article>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:border-slate-400 transition-colors";
const selectCls = "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400 transition-colors";

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardClient({ userName, transactions }: DashboardClientProps) {
  const formRef = useRef<HTMLFormElement | null>(null);

  // Transaction state
  const [clientTxs, setClientTxs] = useState(transactions);

  // Form state
  const [type, setType]               = useState<TransactionType>("EXPENSE");
  const [amount, setAmount]           = useState("");
  const [title, setTitle]             = useState("");
  const [note, setNote]               = useState("");
  const [date, setDate]               = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory]       = useState("Food");
  const [txState, setTxState]         = useState<TransactionState>({});

  // Filter state
  const [filterCat, setFilterCat]     = useState("Semua");
  const [filterType, setFilterType]   = useState<TransactionTypeFilter>("ALL");
  const [sort, setSort]               = useState<SortOption>("newest");
  const [dateFrom, setDateFrom]       = useState("");
  const [dateTo, setDateTo]           = useState("");
  const [search, setSearch]           = useState("");

  // Receipt import state
  const [receiptText, setReceiptText]         = useState("");
  const [receiptStatus, setReceiptStatus]     = useState("");
  const [receiptFile, setReceiptFile]         = useState("");
  const [receiptLoading, setReceiptLoading]   = useState(false);

  const deferredCat    = useDeferredValue(filterCat);
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  // ── Derived data ─────────────────────────────────────────────────────────────

  const formCategoryOptions = useMemo(
    () => CATEGORY_OPTIONS.filter((o) => o.type === "BOTH" || o.type === type),
    [type]
  );

  const categories = useMemo(() => {
    const s = new Set<string>(["Semua"]);
    for (const t of clientTxs) s.add(t.category);
    return Array.from(s).sort((a, b) => a === "Semua" ? -1 : b === "Semua" ? 1 : a.localeCompare(b));
  }, [clientTxs]);

  const filteredTxs = useMemo(() => clientTxs.filter((t) => {
    if (deferredCat !== "Semua" && t.category !== deferredCat) return false;
    if (filterType !== "ALL" && t.type !== filterType) return false;
    if (dateFrom && t.occurredAt.slice(0, 10) < dateFrom) return false;
    if (dateTo   && t.occurredAt.slice(0, 10) > dateTo)   return false;
    if (!deferredSearch) return true;
    return [t.title, t.category, t.note ?? ""].join(" ").toLowerCase().includes(deferredSearch);
  }), [clientTxs, deferredCat, filterType, dateFrom, dateTo, deferredSearch]);

  const sortedTxs = useMemo(() => {
    const copy = [...filteredTxs];
    copy.sort((a, b) => {
      if (sort === "largest")  return b.amount - a.amount;
      if (sort === "smallest") return a.amount - b.amount;
      const ta = new Date(a.occurredAt).getTime(), tb = new Date(b.occurredAt).getTime();
      return sort === "oldest" ? ta - tb : tb - ta;
    });
    return copy;
  }, [filteredTxs, sort]);

  const totals = useMemo(() => clientTxs.reduce(
    (acc, t) => { t.type === "INCOME" ? (acc.income += t.amount) : (acc.expense += t.amount); return acc; },
    { income: 0, expense: 0 }
  ), [clientTxs]);

  const filteredTotals = useMemo(() => filteredTxs.reduce(
    (acc, t) => { t.type === "INCOME" ? (acc.income += t.amount) : (acc.expense += t.amount); return acc; },
    { income: 0, expense: 0 }
  ), [filteredTxs]);

  const monthlyBig = useMemo(() => {
    const now = new Date(), m = now.getMonth(), y = now.getFullYear();
    const expenses = clientTxs.filter((t) => {
      if (t.type !== "EXPENSE") return false;
      const d = new Date(t.occurredAt);
      return d.getMonth() === m && d.getFullYear() === y;
    });
    const largest = expenses.reduce<TransactionView | null>((max, t) => (!max || t.amount > max.amount ? t : max), null);
    return { label: fmtMonthYear(new Date(y, m, 1)), largest };
  }, [clientTxs]);

  const catAnalytics = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of filteredTxs) {
      if (t.type === "EXPENSE") map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
    }
    const ordered = Array.from(map.entries()).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
    return { byCategory: ordered, top: ordered[0] ?? null };
  }, [filteredTxs]);

  const balance = totals.income - totals.expense;

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    setType("EXPENSE"); setAmount(""); setTitle(""); setNote("");
    setDate(new Date().toISOString().slice(0, 10)); setCategory("Food");
    setReceiptText(""); setReceiptFile("");
  }, []);

  const resetFilters = useCallback(() => {
    setFilterCat("Semua"); setFilterType("ALL"); setSort("newest");
    setDateFrom(""); setDateTo(""); setSearch("");
  }, []);

  const handleExportCsv = useCallback(() => dl(buildCsv(sortedTxs), "export.csv", "text/csv;charset=utf-8"), [sortedTxs]);

  const handleExportPdf = useCallback(() => {
    const w = window.open("", "_blank", "noopener,noreferrer,width=1080,height=820");
    if (!w) { setReceiptStatus("Popup diblokir browser."); return; }
    w.document.write(buildPdfHtml(userName, sortedTxs, filteredTotals));
    w.document.close(); w.focus(); w.print();
  }, [userName, sortedTxs, filteredTotals]);

  const handleReceiptImport = useCallback(() => {
    const parsed = parseReceipt(receiptText);
    if (!parsed) { setReceiptStatus("Detail belum terbaca. Pastikan ada merchant, jumlah, dan waktu."); return; }
    setType("EXPENSE"); setTitle(parsed.title); setAmount(parsed.amount);
    setNote(parsed.note); setDate(parsed.occurredAt || new Date().toISOString().slice(0, 10));
    setCategory(parsed.category); setReceiptStatus("✓ Form terisi otomatis.");
  }, [receiptText]);

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setReceiptFile(file.name); setReceiptLoading(true); setReceiptStatus("Membaca gambar…");
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, { logger: (msg) => {
        if (msg.status === "recognizing text") setReceiptStatus(`OCR ${Math.round(msg.progress * 100)}%…`);
      }});
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();
      setReceiptText(text); setReceiptStatus("Teks terbaca. Klik isi otomatis.");
    } catch { setReceiptStatus("Gagal baca gambar. Coba tempel teks OCR manual."); }
    finally { setReceiptLoading(false); e.target.value = ""; }
  }

  async function handleCreateTx(formData: FormData) {
    const result = await createTransactionAction(INITIAL_TX_STATE, formData);
    setTxState(result);
    if (!result.success || !result.createdTransaction) return;
    setClientTxs((prev) =>
      [result.createdTransaction!, ...prev].sort(
        (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
      )
    );
    resetForm(); setReceiptStatus("✓ Transaksi tersimpan."); formRef.current?.reset();
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 p-3 text-slate-900 md:p-4">
      <div className="mx-auto grid max-w-7xl gap-3">

        {/* ── Header ── */}
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">Expense Tracker</span>
              <span className="text-[11px] text-slate-400">Data privat per akun</span>
            </div>
            <h1 className="mt-1.5 text-lg font-bold tracking-tight">Halo, {userName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-lg bg-slate-50 px-3 py-1.5 text-[11px] text-slate-500 sm:block">
              {deferredCat === "Semua" ? "Semua kategori" : deferredCat} · {filterType === "ALL" ? "Semua" : filterType === "INCOME" ? "Income" : "Expense"} · {sort}
            </span>
            <form action={logoutAction}>
              <button type="submit" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50">
                Logout
              </button>
            </form>
          </div>
        </header>

        {/* ── Stat cards ── */}
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Balance"    value={idr(balance)}                  tone={balance >= 0 ? "text-emerald-600" : "text-rose-600"} sub="Selisih income − expense" />
          <StatCard label="Total Income"     value={idr(totals.income)}            tone="text-emerald-600" sub="Akumulasi semua pemasukan" />
          <StatCard label="Total Expense"    value={idr(totals.expense)}           tone="text-rose-600"    sub="Akumulasi semua pengeluaran" />
          <StatCard label="Filtered Result"  value={`${sortedTxs.length} transaksi`} tone="text-sky-600"  sub="Hasil filter aktif" />
        </section>

        {/* ── Charts ── */}
        <section className="grid gap-3 xl:grid-cols-[1.4fr_1fr]">
          <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold">Arus Kas Bulanan</h2>
                <p className="mt-0.5 text-[11px] text-slate-400">Income, expense &amp; balance 6 bulan terakhir</p>
              </div>
              <span className="rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Recharts</span>
            </div>
            <div className="mt-4"><MonthlyOverviewChart transactions={clientTxs} /></div>
          </article>

          <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold">Analytics Cepat</h2>
            <p className="mt-0.5 text-[11px] text-slate-400">Insight otomatis dari data aktif</p>
            <div className="mt-3 grid gap-2">
              {/* Biggest expense */}
              <div className="rounded-xl bg-rose-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-rose-400">Terbesar bulan ini</p>
                {monthlyBig.largest ? (
                  <>
                    <p className="mt-1 text-sm font-semibold">{monthlyBig.largest.title}</p>
                    <p className="text-[11px] text-slate-500">{getCategoryMeta(monthlyBig.largest.category).icon} {monthlyBig.largest.category} · {monthlyBig.label}</p>
                    <p className="mt-1 text-base font-bold text-rose-600">{idr(monthlyBig.largest.amount)}</p>
                  </>
                ) : (
                  <p className="mt-1 text-xs text-slate-400">Belum ada pengeluaran di {monthlyBig.label}.</p>
                )}
              </div>
              {/* Top category */}
              <div className="rounded-xl bg-amber-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Kategori terboros</p>
                {catAnalytics.top ? (
                  <>
                    <p className="mt-1 text-sm font-semibold">{getCategoryMeta(catAnalytics.top.category).icon} {catAnalytics.top.category}</p>
                    <p className="mt-1 text-base font-bold text-amber-600">{idr(catAnalytics.top.amount)}</p>
                  </>
                ) : <p className="mt-1 text-xs text-slate-400">Belum ada data pengeluaran.</p>}
              </div>
              {/* Balance filtered */}
              <div className="rounded-xl bg-emerald-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Balance aktif</p>
                <p className="mt-1 text-base font-bold text-emerald-700">{idr(filteredTotals.income - filteredTotals.expense)}</p>
                <p className="text-[11px] text-slate-400">Berdasarkan filter yang aktif</p>
              </div>
            </div>
          </article>
        </section>

        {/* ── Add transaction + Filters ── */}
        <section className="grid gap-3 xl:grid-cols-2">

          {/* Add transaction */}
          <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold">Tambah Transaksi</h2>
                <p className="mt-0.5 text-[11px] text-slate-400">Manual atau import dari struk/screenshot</p>
              </div>
              <span className="rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Multi-user</span>
            </div>

            {txState?.error && (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">{txState.error}</div>
            )}

            {/* Receipt import */}
            <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Import Struk</p>
              <div className="mt-2 grid gap-2">
                <input type="file" accept="image/*" onChange={handleImageChange}
                  className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-[11px] file:font-semibold" />
                {receiptFile && <p className="text-[11px] text-slate-500">📎 {receiptFile}</p>}
                <textarea value={receiptText} onChange={(e) => setReceiptText(e.target.value)} rows={3}
                  placeholder={"Ke\nKFC TRAGIA NUSA DUA\nJumlah\nRp 22.000\nWaktu Transaksi\n29 Mar 2026, 12:22"}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none placeholder:text-slate-300 focus:border-slate-400" />
                <div className="flex items-center gap-2">
                  <button type="button" onClick={handleReceiptImport} disabled={receiptLoading}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50">
                    {receiptLoading ? "Memproses…" : "Isi otomatis"}
                  </button>
                  {receiptStatus && <p className="text-[11px] text-slate-500">{receiptStatus}</p>}
                </div>
              </div>
            </div>

            <form ref={formRef} action={handleCreateTx} className="mt-3 grid gap-2.5">
              {/* Type toggle */}
              <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-100 bg-slate-50 p-1">
                {(["EXPENSE", "INCOME"] as const).map((v) => (
                  <label key={v} className={`cursor-pointer rounded-lg py-1.5 text-center text-xs font-semibold transition-all ${type === v ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                    <input type="radio" name="type" value={v} checked={type === v}
                      onChange={() => { setType(v); if (!formCategoryOptions.some((o) => o.value === category)) setCategory(v === "INCOME" ? "Salary" : "Food"); }}
                      className="sr-only" />
                    {v === "EXPENSE" ? "Pengeluaran" : "Pemasukan"}
                  </label>
                ))}
              </div>

              <Field label="Judul">
                <input name="title" value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder={type === "INCOME" ? "Gaji bulanan" : "Makan siang"} className={inputCls} />
              </Field>

              <div className="grid grid-cols-2 gap-2">
                <Field label="Nominal">
                  <input name="amount" inputMode="numeric" value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                    placeholder="50000" className={inputCls} />
                  {amount && <span className="text-[10px] text-slate-400">{idr(Number(amount))}</span>}
                </Field>
                <Field label="Tanggal">
                  <input name="occurredAt" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Field label="Kategori">
                  <select name="category" value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls}>
                    {formCategoryOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.icon} {o.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Catatan">
                  <input name="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opsional" className={inputCls} />
                </Field>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <SubmitBtn label="Simpan" />
                <button type="button" onClick={() => { resetForm(); setReceiptStatus(""); formRef.current?.reset(); }}
                  className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-50">
                  Reset
                </button>
              </div>
            </form>
          </article>

          {/* Filters */}
          <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold">Filter &amp; Export</h2>
                <p className="mt-0.5 text-[11px] text-slate-400">Saring data lalu export sesuai kebutuhan</p>
              </div>
              <div className="flex gap-1.5">
                <button type="button" onClick={handleExportCsv}
                  className="h-8 rounded-lg border border-slate-200 px-3 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50">CSV</button>
                <button type="button" onClick={handleExportPdf}
                  className="h-8 rounded-lg bg-slate-900 px-3 text-[11px] font-semibold text-white transition-colors hover:bg-slate-700">PDF</button>
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              <Field label="Cari">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Judul, kategori, catatan…" className={inputCls} />
              </Field>
              <Field label="Kategori">
                <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className={selectCls}>
                  {categories.map((c) => {
                    const m = getCategoryMeta(c);
                    return <option key={c} value={c}>{c === "Semua" ? c : `${m.icon} ${c}`}</option>;
                  })}
                </select>
              </Field>
              <Field label="Urutan">
                <select value={sort} onChange={(e) => setSort(e.target.value as SortOption)} className={selectCls}>
                  <option value="newest">Terbaru</option>
                  <option value="oldest">Terlama</option>
                  <option value="largest">Terbesar</option>
                  <option value="smallest">Terkecil</option>
                </select>
              </Field>
              <Field label="Dari">
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Sampai">
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputCls} />
              </Field>
              <div className="grid gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tipe</span>
                <div className="flex gap-1.5">
                  {([["ALL","Semua"],["INCOME","Income"],["EXPENSE","Expense"]] as const).map(([v, l]) => (
                    <button key={v} type="button" onClick={() => setFilterType(v)}
                      className={`h-9 flex-1 rounded-lg text-xs font-semibold transition-colors ${filterType === v ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Filtered totals */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { label: "Income", value: filteredTotals.income,  tone: "text-emerald-600" },
                { label: "Expense", value: filteredTotals.expense, tone: "text-rose-600" },
                { label: "Balance", value: filteredTotals.income - filteredTotals.expense, tone: "text-slate-900" },
              ].map(({ label, value, tone }) => (
                <div key={label} className="rounded-xl bg-slate-50 px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
                  <p className={`mt-0.5 text-xs font-bold tabular-nums ${tone}`}>{idr(value)}</p>
                </div>
              ))}
            </div>

            <button type="button" onClick={resetFilters}
              className="mt-2 h-8 w-full rounded-lg border border-slate-200 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-50">
              Reset semua filter
            </button>
          </article>
        </section>

        {/* ── Category chart + Transaction list ── */}
        <section className="grid gap-3 xl:grid-cols-[1fr_1.1fr]">
          <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold">Breakdown Kategori</h2>
                <p className="mt-0.5 text-[11px] text-slate-400">Pengeluaran per kategori dari data terfilter</p>
              </div>
              <span className="text-[11px] text-slate-400">Top {Math.min(catAnalytics.byCategory.length, 6)}</span>
            </div>
            <div className="mt-4"><CategoryBreakdownChart items={catAnalytics.byCategory} /></div>
          </article>

          <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold">Transaksi</h2>
                <p className="mt-0.5 text-[11px] text-slate-400">{sortedTxs.length} item ditampilkan</p>
              </div>
              <button type="button" onClick={resetFilters}
                className="h-8 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-50">
                Reset filter
              </button>
            </div>

            <div className="mt-3 grid gap-1.5 max-h-[600px] overflow-y-auto pr-0.5">
              {sortedTxs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-xs text-slate-400">
                  Belum ada transaksi untuk filter ini.
                </div>
              ) : sortedTxs.map((t) => {
                const meta = getCategoryMeta(t.category);
                const isIncome = t.type === "INCOME";
                return (
                  <article key={t.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3.5 py-2.5 transition-colors hover:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-semibold text-slate-900 truncate">{t.title}</span>
                        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isIncome ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600"}`}>
                          {isIncome ? "IN" : "OUT"}
                        </span>
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                          {meta.icon} {t.category}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
                        <span>{fmtDate(t.occurredAt)}</span>
                        {t.note && <span className="truncate">· {t.note}</span>}
                      </div>
                    </div>
                    <span className={`shrink-0 text-sm font-bold tabular-nums ${isIncome ? "text-emerald-600" : "text-rose-600"}`}>
                      {isIncome ? "+" : "−"}{idr(t.amount)}
                    </span>
                  </article>
                );
              })}
            </div>
          </article>
        </section>

      </div>
    </div>
  );
}