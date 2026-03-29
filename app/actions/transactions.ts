"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { TransactionType } from "@/app/generated/prisma/enums";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logRuntimeError } from "@/lib/runtime-error";

export type TransactionState = {
  createdTransaction?: {
    amount: number;
    category: string;
    id: string;
    note: string | null;
    occurredAt: string;
    title: string;
    type: TransactionType;
  };
  error?: string;
  success?: boolean;
};

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createTransactionAction(
  _prevState: TransactionState | undefined,
  formData: FormData,
): Promise<TransactionState> {
  try {
    const user = await requireUser();
    const title = readText(formData, "title");
    const category = readText(formData, "category");
    const note = readText(formData, "note");
    const occurredAt = readText(formData, "occurredAt");
    const type = readText(formData, "type");
    const amount = Number(readText(formData, "amount"));

    if (!title) {
      return { error: "Judul transaksi wajib diisi." };
    }

    if (!category) {
      return { error: "Kategori wajib dipilih." };
    }

    if (!occurredAt) {
      return { error: "Tanggal transaksi wajib diisi." };
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return { error: "Nominal harus lebih besar dari 0." };
    }

    if (type !== TransactionType.INCOME && type !== TransactionType.EXPENSE) {
      return { error: "Tipe transaksi tidak valid." };
    }

    const transaction = await prisma.transaction.create({
      data: {
        title,
        category,
        note: note || null,
        amount,
        type,
        occurredAt: new Date(occurredAt),
        userId: user.id,
      },
    });

    revalidatePath("/");

    return {
      createdTransaction: {
        amount: Number(transaction.amount),
        category: transaction.category,
        id: transaction.id,
        note: transaction.note,
        occurredAt: transaction.occurredAt.toISOString(),
        title: transaction.title,
        type: transaction.type,
      },
      success: true,
    };
  } catch (error) {
    unstable_rethrow(error);
    logRuntimeError({ area: "create-transaction-action" }, error);

    return {
      error:
        "Transaksi belum bisa disimpan. Periksa koneksi database atau migration production di Vercel.",
    };
  }
}
