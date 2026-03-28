import AuthPanel from "@/components/auth-panel";
import DashboardClient from "@/components/dashboard-client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    return <AuthPanel />;
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      occurredAt: "desc",
    },
    select: {
      id: true,
      title: true,
      category: true,
      note: true,
      amount: true,
      type: true,
      occurredAt: true,
    },
  });

  return (
    <DashboardClient
      userName={user.name}
      transactions={transactions.map((transaction) => ({
        ...transaction,
        amount: Number(transaction.amount),
        occurredAt: transaction.occurredAt.toISOString(),
      }))}
    />
  );
}
