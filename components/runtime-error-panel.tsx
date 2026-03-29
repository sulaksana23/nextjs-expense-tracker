"use client";

type RuntimeErrorPanelProps = {
  title?: string;
  description: string;
  debugDetails?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function RuntimeErrorPanel({
  title = "Aplikasi belum bisa dimuat",
  description,
  debugDetails,
  actionLabel,
  onAction,
}: RuntimeErrorPanelProps) {
  return (
    <div className="grid min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,174,92,0.24),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(37,99,235,0.24),_transparent_28%),linear-gradient(135deg,_#07111f_0%,_#10213a_55%,_#18273d_100%)] px-4 py-4 text-white sm:px-5 sm:py-6 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-3xl items-center">
        <section className="w-full rounded-[28px] border border-white/12 bg-[#0d1728]/92 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.38)] backdrop-blur sm:rounded-[32px] sm:p-8">
          <span className="inline-flex w-fit rounded-full border border-white/14 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
            Expense Tracker
          </span>

          <div className="space-y-3 pt-5">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            <p className="text-sm leading-6 text-white/72 sm:text-base sm:leading-7">
              {description}
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/6 px-4 py-4 text-sm leading-6 text-white/68">
            Periksa environment variable database di Vercel lalu pastikan migration production
            sudah dijalankan dengan koneksi direct URL.
          </div>

          {debugDetails ? (
            <pre className="mt-4 overflow-x-auto rounded-2xl border border-amber-400/20 bg-black/30 px-4 py-4 text-xs leading-6 text-amber-100">
              {debugDetails}
            </pre>
          ) : null}

          {actionLabel && onAction ? (
            <button
              type="button"
              onClick={onAction}
              className="mt-6 inline-flex rounded-2xl bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-105"
            >
              {actionLabel}
            </button>
          ) : null}
        </section>
      </div>
    </div>
  );
}
