import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (session.user.role !== "admin") where.userId = session.user.id;
  if (status) where.status = status;

  const orders = await prisma.order.findMany({
    where,
    include: { items: true, user: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(orders);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { addressId, paymentMethod, notes } = await req.json();
  const cartItems = await prisma.cartItem.findMany({
    where: { userId: session.user.id },
    include: { menuItem: true },
  });

  if (cartItems.length === 0) return NextResponse.json({ error: "Cart empty" }, { status: 400 });

  let addressSnapshot = null;
  if (addressId) {
    const addr = await prisma.address.findUnique({ where: { id: addressId } });
    if (addr) addressSnapshot = JSON.stringify(addr);
  }

  const subtotal = cartItems.reduce((s, ci) => s + ci.menuItem.price * ci.quantity, 0);
  const tax = Math.round(subtotal * 0.08 * 100) / 100;
  const deliveryFee = 3.99;
  const total = Math.round((subtotal + tax + deliveryFee) * 100) / 100;

  const order = await prisma.order.create({
    data: {
      userId: session.user.id,
      subtotal, tax, deliveryFee, total,
      paymentMethod: paymentMethod || "cash",
      addressId, addressSnapshot, notes,
      items: {
        create: cartItems.map((ci) => ({
          menuItemId: ci.menuItemId, name: ci.menuItem.name,
          price: ci.menuItem.price, quantity: ci.quantity, notes: ci.notes,
        })),
      },
    },
    include: { items: true },
  });

  await prisma.cartItem.deleteMany({ where: { userId: session.user.id } });
  return NextResponse.json(order, { status: 201 });
}
