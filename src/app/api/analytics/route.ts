import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const totalOrders = await prisma.order.count();
  const rev = await prisma.order.aggregate({ _sum: { total: true }, where: { status: { not: "cancelled" } } });
  const pendingOrders = await prisma.order.count({ where: { status: "pending" } });
  const totalCustomers = await prisma.user.count({ where: { role: "customer" } });

  return NextResponse.json({
    totalOrders,
    totalRevenue: rev._sum.total || 0,
    pendingOrders,
    totalCustomers,
  });
}
