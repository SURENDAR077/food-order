import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const cats = await prisma.category.findMany({
    where: { isActive: true },
    include: { _count: { select: { menuItems: true } } },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(cats);
}
