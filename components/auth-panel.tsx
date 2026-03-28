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
      className="inline-flex w-full items-center justify-center rounded-2xl bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
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
    <label className="grid gap-2 text-sm text-[var(--muted-foreground)]">
      <span>{label}</span>
      <input
        className="rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[var(--accent)]"
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
  const [registerState, registerFormAction] = useActionState(registerAction, initialState);

  const state = mode === "login" ? loginState : registerState;

  return (
    <div className="grid min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,174,92,0.24),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(37,99,235,0.24),_transparent_28%),linear-gradient(135deg,_#07111f_0%,_#10213a_55%,_#18273d_100%)] px-4 py-10 text-white md:px-8">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="flex flex-col justify-between rounded-[32px] border border-white/10 bg-white/7 p-7 shadow-[0_35px_120px_rgba(2,6,23,0.45)] backdrop-blur md:p-10">
          <div className="space-y-6">
            <span className="inline-flex w-fit rounded-full border border-white/14 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
              Expense Tracker
            </span>
            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight md:text-6xl">
                Catat uang masuk dan keluar tanpa setup yang ribet.
              </h1>
              <p className="max-w-xl text-base leading-8 text-white/72 md:text-lg">
                Register sekali, lalu langsung pakai dashboard transaksi, total balance,
                total income, total expense, dan filter kategori dalam satu halaman.
              </p>
            </div>
          </div>

          <div className="grid gap-4 pt-8 sm:grid-cols-3">
            {[
              ["Realtime", "Ringkasan balance langsung berubah setelah transaksi ditambah."],
              ["Aman", "Password di-hash dan sesi login disimpan di cookie httpOnly."],
              ["Praktis", "Income dan expense dikelola dari dashboard yang sama."],
            ].map(([title, description]) => (
              <article
                key={title}
                className="rounded-3xl border border-white/10 bg-black/18 p-4"
              >
                <h2 className="text-sm font-semibold text-white">{title}</h2>
                <p className="pt-2 text-sm leading-6 text-white/64">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[32px] border border-white/12 bg-[#0d1728]/92 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.38)] backdrop-blur md:p-8">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white/6 p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                mode === "login"
                  ? "bg-white text-slate-950"
                  : "text-white/70 hover:bg-white/7 hover:text-white"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                mode === "register"
                  ? "bg-white text-slate-950"
                  : "text-white/70 hover:bg-white/7 hover:text-white"
              }`}
            >
              Register
            </button>
          </div>

          <div className="space-y-6 pt-6">
            <div>
              <h2 className="text-2xl font-semibold">
                {mode === "login" ? "Masuk ke akun kamu" : "Buat akun baru"}
              </h2>
              <p className="pt-2 text-sm leading-6 text-white/58">
                {mode === "login"
                  ? "Gunakan email dan password yang sudah terdaftar."
                  : "Setelah register berhasil, kamu akan langsung masuk ke dashboard."}
              </p>
            </div>

            {state?.error ? (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/12 px-4 py-3 text-sm text-rose-100">
                {state.error}
              </div>
            ) : null}

            {mode === "login" ? (
              <form action={loginFormAction} className="grid gap-4">
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
              <form action={registerFormAction} className="grid gap-4">
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
