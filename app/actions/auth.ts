"use server";

import { redirect } from "next/navigation";
import { clearSession, createSession, hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type AuthState = {
  error?: string;
};

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function registerAction(
  _prevState: AuthState | undefined,
  formData: FormData,
): Promise<AuthState> {
  const name = readText(formData, "name");
  const email = readText(formData, "email").toLowerCase();
  const password = readText(formData, "password");
  const confirmPassword = readText(formData, "confirmPassword");

  if (name.length < 2) {
    return { error: "Nama minimal 2 karakter." };
  }

  if (!email.includes("@")) {
    return { error: "Email belum valid." };
  }

  if (password.length < 8) {
    return { error: "Password minimal 8 karakter." };
  }

  if (password !== confirmPassword) {
    return { error: "Konfirmasi password tidak sama." };
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    return { error: "Email ini sudah terdaftar." };
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
    },
  });

  await createSession(user.id);
  redirect("/");
}

export async function loginAction(
  _prevState: AuthState | undefined,
  formData: FormData,
): Promise<AuthState> {
  const email = readText(formData, "email").toLowerCase();
  const password = readText(formData, "password");

  if (!email || !password) {
    return { error: "Email dan password wajib diisi." };
  }

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    return { error: "Akun tidak ditemukan." };
  }

  const validPassword = await verifyPassword(password, user.passwordHash);

  if (!validPassword) {
    return { error: "Password salah." };
  }

  await createSession(user.id);
  redirect("/");
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}
