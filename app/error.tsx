"use client";

import { useEffect } from "react";
import RuntimeErrorPanel from "@/components/runtime-error-panel";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <RuntimeErrorPanel
      title="Terjadi gangguan saat memuat halaman"
      description={`Aplikasi gagal memproses request ini.${error.digest ? ` Digest: ${error.digest}.` : ""} Jika ini terjadi di Vercel, biasanya koneksi database atau schema production belum siap.`}
      actionLabel="Coba lagi"
      onAction={() => unstable_retry()}
    />
  );
}
