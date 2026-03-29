"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, registerAction, type AuthState } from "@/app/actions/auth";

function AuthSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Memproses..." : label}
    </button>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder: string;
}) {
  return (
    <label className="grid gap-2 text-sm text-slate-600">
      <span>{label}</span>
      <input
        className="rounded-xl border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
        name={name}
        type={type}
        placeholder={placeholder}
        required
      />
    </label>
  );
}

const initialState: AuthState = {};

export default function AuthPanel() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginState, loginFormAction] = useActionState(loginAction, initialState);
  const [registerState, registerFormAction] = useActionState(
    registerAction,
    initialState,
  );

  const state = mode === "login" ? loginState : registerState;

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 py-4 text-slate-900 sm:px-6 sm:py-6">
      <div className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="order-2 flex flex-col justify-between rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-6 lg:order-1">
          <div className="space-y-6">
            <span className="inline-flex w-fit rounded-full border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-700">
              Expense Tracker
            </span>
            <div className="space-y-3">
              <h1 className="max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Catatan keuangan pribadi yang ringkas dan langsung pakai.
              </h1>
              <p className="max-w-lg text-sm leading-6 text-slate-600 sm:text-base">
                Login atau register sekali, lalu kelola pemasukan, pengeluaran, balance,
                dan filter kategori dalam dashboard yang bersih.
              </p>
            </div>
          </div>

          <div className="grid gap-3 pt-6 sm:grid-cols-3">
            {[
              ["Cepat", "Form, ringkasan, dan list transaksi ada dalam satu alur."],
              ["Aman", "Password di-hash dan sesi disimpan di cookie httpOnly."],
              ["Rapi", "Tampilan dibuat compact supaya fokus ke data penting."],
            ].map(([title, description]) => (
              <article
                key={title}
                className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4"
              >
                <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
                <p className="pt-2 text-sm leading-5 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="order-1 w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-5 lg:order-2 lg:self-center">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-[var(--surface-soft)] p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              aria-pressed={mode === "login"}
              className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition sm:px-4 ${
                mode === "login"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              aria-pressed={mode === "register"}
              className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                mode === "register"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Register
            </button>
          </div>

          <div className="space-y-5 pt-5">
            <div>
              <h2 className="text-xl font-semibold sm:text-2xl">
                {mode === "login" ? "Masuk ke akun kamu" : "Buat akun baru"}
              </h2>
              <p className="pt-2 text-sm leading-6 text-slate-600">
                {mode === "login"
                  ? "Gunakan email dan password yang sudah terdaftar."
                  : "Setelah register berhasil, kamu akan langsung masuk ke dashboard."}
              </p>
            </div>

            {state?.error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {state.error}
              </div>
            ) : null}

            {mode === "login" ? (
              <form key="login-form" action={loginFormAction} className="grid gap-4">
                <Field label="Email" name="email" type="email" placeholder="bayu@email.com" />
                <Field
                  label="Password"
                  name="password"
                  type="password"
                  placeholder="Minimal 8 karakter"
                />
                <AuthSubmitButton label="Login" />
              </form>
            ) : (
              <form key="register-form" action={registerFormAction} className="grid gap-4">
                <Field label="Nama" name="name" placeholder="Bayu" />
                <Field label="Email" name="email" type="email" placeholder="bayu@email.com" />
                <Field
                  label="Password"
                  name="password"
                  type="password"
                  placeholder="Minimal 8 karakter"
                />
                <Field
                  label="Konfirmasi password"
                  name="confirmPassword"
                  type="password"
                  placeholder="Ulangi password"
                />
                <AuthSubmitButton label="Register" />
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
