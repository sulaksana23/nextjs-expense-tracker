import type { TransactionType } from "@/app/generated/prisma/enums";

export type CategoryConfig = {
  icon: string;
  name: string;
  slug: string;
  type: TransactionType | "BOTH";
};

export const CATEGORY_OPTIONS: CategoryConfig[] = [
  { name: "Food", slug: "food", icon: "🍔", type: "EXPENSE" },
  { name: "Transport", slug: "transport", icon: "🛵", type: "EXPENSE" },
  { name: "Shopping", slug: "shopping", icon: "🛍️", type: "EXPENSE" },
  { name: "Bills", slug: "bills", icon: "💡", type: "EXPENSE" },
  { name: "Health", slug: "health", icon: "💊", type: "EXPENSE" },
  { name: "Entertainment", slug: "entertainment", icon: "🎬", type: "EXPENSE" },
  { name: "Education", slug: "education", icon: "📚", type: "EXPENSE" },
  { name: "Travel", slug: "travel", icon: "✈️", type: "EXPENSE" },
  { name: "Salary", slug: "salary", icon: "💼", type: "INCOME" },
  { name: "Freelance", slug: "freelance", icon: "🧑‍💻", type: "INCOME" },
  { name: "Bonus", slug: "bonus", icon: "🎁", type: "INCOME" },
  { name: "Investment", slug: "investment", icon: "📈", type: "INCOME" },
  { name: "Business", slug: "business", icon: "🏪", type: "INCOME" },
  { name: "Subscription", slug: "subscription", icon: "🔁", type: "BOTH" },
  { name: "Other", slug: "other", icon: "🧾", type: "BOTH" },
];

type CategoryMatch = {
  icon: string;
  name: string;
  slug: string;
  type: TransactionType | "BOTH";
};

const CATEGORY_MAP = new Map(
  CATEGORY_OPTIONS.map((option) => [option.name.toLowerCase(), option]),
);

const FALLBACK_CATEGORY = CATEGORY_OPTIONS[CATEGORY_OPTIONS.length - 1]!;

const ALIAS_MAP: Record<string, CategoryMatch> = {
  makan: CATEGORY_OPTIONS[0]!,
  kuliner: CATEGORY_OPTIONS[0]!,
  restaurant: CATEGORY_OPTIONS[0]!,
  resto: CATEGORY_OPTIONS[0]!,
  cafe: CATEGORY_OPTIONS[0]!,
  kopi: CATEGORY_OPTIONS[0]!,
  gojek: CATEGORY_OPTIONS[1]!,
  grab: CATEGORY_OPTIONS[1]!,
  parkir: CATEGORY_OPTIONS[1]!,
  bensin: CATEGORY_OPTIONS[1]!,
  belanja: CATEGORY_OPTIONS[2]!,
  store: CATEGORY_OPTIONS[2]!,
  mart: CATEGORY_OPTIONS[2]!,
  tagihan: CATEGORY_OPTIONS[3]!,
  listrik: CATEGORY_OPTIONS[3]!,
  air: CATEGORY_OPTIONS[3]!,
  internet: CATEGORY_OPTIONS[3]!,
  kesehatan: CATEGORY_OPTIONS[4]!,
  apotek: CATEGORY_OPTIONS[4]!,
  klinik: CATEGORY_OPTIONS[4]!,
  hiburan: CATEGORY_OPTIONS[5]!,
  bioskop: CATEGORY_OPTIONS[5]!,
  game: CATEGORY_OPTIONS[5]!,
  netflix: CATEGORY_OPTIONS[5]!,
  gaji: CATEGORY_OPTIONS[8]!,
  payroll: CATEGORY_OPTIONS[8]!,
};

export function resolveCategoryConfig(category: string): CategoryConfig {
  const normalized = category.trim().toLowerCase();
  return CATEGORY_MAP.get(normalized) ?? ALIAS_MAP[normalized] ?? FALLBACK_CATEGORY;
}

export function normalizeCategoryInput(category: string) {
  const resolved = resolveCategoryConfig(category);
  return {
    icon: resolved.icon,
    name: resolved.name,
    slug: resolved.slug,
    type: resolved.type === "BOTH" ? null : resolved.type,
  };
}
