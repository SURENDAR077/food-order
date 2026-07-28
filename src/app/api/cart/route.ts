import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cartItems = await prisma.cartItem.findMany({
    where: { userId: session.user.id },
    include: { menuItem: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    cartItems.map((ci) => ({
      id: ci.id,
      menuItemId: ci.menuItemId,
      name: ci.menuItem.name,
      price: ci.menuItem.price,
      quantity: ci.quantity,
      notes: ci.notes,
    }))
  );
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { menuItemId, quantity = 1, notes } = await req.json();
  const item = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.cartItem.findUnique({
    where: { userId_menuItemId: { userId: session.user.id, menuItemId } },
  });

  if (existing) {
    await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + quantity } });
  } else {
    await prisma.cartItem.create({ data: { userId: session.user.id, menuItemId, quantity, notes } });
  }

  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { cartItemId, quantity } = await req.json();
  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: cartItemId } });
  } else {
    await prisma.cartItem.update({ where: { id: cartItemId }, data: { quantity } });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { cartItemId } = await req.json();
  if (cartItemId) {
    await prisma.cartItem.delete({ where: { id: cartItemId } });
  } else {
    await prisma.cartItem.deleteMany({ where: { userId: session.user.id } });
  }
  return NextResponse.json({ ok: true });
}
