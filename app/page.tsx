import AuthPanel from "@/components/auth-panel";
import DashboardClient from "@/components/dashboard-client";
import RuntimeErrorPanel from "@/components/runtime-error-panel";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRuntimeDebugDetails, logRuntimeError } from "@/lib/runtime-error";

export const dynamic = "force-dynamic";

export default async function Home() {
  let user: Awaited<ReturnType<typeof getCurrentUser>> | null = null;
  let transactions:
    | {
        id: string;
        title: string;
        category: {
          name: string;
        };
        note: string | null;
        amount: unknown;
        type: "INCOME" | "EXPENSE";
        occurredAt: Date;
      }[]
    | null = null;
  let hasRuntimeFailure = false;
  let debugDetails: string | undefined;

  try {
    user = await getCurrentUser();

    if (user) {
      transactions = await prisma.transaction.findMany({
        where: {
          userId: user.id,
        },
        orderBy: {
          occurredAt: "desc",
        },
        select: {
          id: true,
          title: true,
          note: true,
          amount: true,
          type: true,
          occurredAt: true,
          category: {
            select: {
              name: true,
            },
          },
        },
      });
    }
  } catch (error) {
    logRuntimeError({ area: "home-page" }, error);
    hasRuntimeFailure = true;
    debugDetails = getRuntimeDebugDetails(error);
  }

  if (hasRuntimeFailure) {
    return (
      <RuntimeErrorPanel
        description="Halaman utama belum bisa mengambil data. Di Vercel, ini paling sering terjadi karena environment variable database belum terpasang atau migration production belum dijalankan."
        debugDetails={debugDetails}
      />
    );
  }

  if (!user) {
    return <AuthPanel />;
  }

  return (
    <DashboardClient
      userName={user.name}
      transactions={(transactions ?? []).map((transaction) => ({
        ...transaction,
        amount: Number(transaction.amount),
        category: transaction.category.name,
        occurredAt: transaction.occurredAt.toISOString(),
      }))}
    />
  );
}
