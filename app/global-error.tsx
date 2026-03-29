"use client";

import { useEffect } from "react";
import RuntimeErrorPanel from "@/components/runtime-error-panel";

export default function GlobalError({
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
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full">
        <RuntimeErrorPanel
          title="Terjadi gangguan pada aplikasi"
          description={`Request ini gagal dirender.${error.digest ? ` Digest: ${error.digest}.` : ""} Cek Runtime Logs di Vercel untuk detail error server yang asli.`}
          actionLabel="Coba lagi"
          onAction={() => unstable_retry()}
        />
      </body>
    </html>
  );
}
