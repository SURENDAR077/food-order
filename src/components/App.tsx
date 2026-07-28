"use client";
import { useState, useEffect, useCallback, FormEvent } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { Search, Menu, X, Minus, Plus, Trash2, LogOut, Package, MapPin, Clock, DollarSign, User, ShoppingCart } from "lucide-react";

const cn = (...c: (string | boolean | undefined)[]) => c.filter(Boolean).join(" ");
const fmt = (n: number) => "$" + n.toFixed(2);
const sc = (s: string) => ({ pending: "bg-yellow-100 text-yellow-800", confirmed: "bg-blue-100 text-blue-800", preparing: "bg-purple-100 text-purple-800", out_for_delivery: "bg-orange-100 text-orange-800", delivered: "bg-green-100 text-green-800", cancelled: "bg-red-100 text-red-800" }[s] || "bg-gray-100 text-gray-800");
const sl = (s: string) => ({ pending: "Pending", confirmed: "Confirmed", preparing: "Preparing", out_for_delivery: "Out for Delivery", delivered: "Delivered", cancelled: "Cancelled" }[s] || s);
const ic = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none";
const bo = "bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 transition";

type User_ = { name: string; email: string; role: string; phone: string };
type Category = { id: string; name: string; slug: string; _count: { menuItems: number } };
type MenuItem = { id: string; name: string; slug: string; price: number; description: string; isAvailable: boolean; isFeatured: boolean; categoryId: string; category: { name: string } };
type CartItem = { id: string; menuItemId: string; name: string; price: number; quantity: number; notes: string };
type Address = { id: string; label: string; streetAddress: string; city: string; state: string; zipCode: string; phone: string };
type OrderItem = { id: string; name: string; price: number; quantity: number };
type Order = { id: string; status: string; subtotal: number; tax: number; deliveryFee: number; total: number; paymentMethod: string; createdAt: string; notes: string; items: OrderItem[]; user?: { name: string; email: string } };
type Analytics = { totalOrders: number; totalRevenue: number; pendingOrders: number; totalCustomers: number };
type Page = "home" | "menu" | "auth" | "cart" | "checkout" | "orders" | "order-detail" | "account" | "admin";

export default function App() {
  const { data: session, status } = useSession();
  const user = session?.user ? { name: session.user.name || "", email: session.user.email || "", role: (session.user as any).role || "customer", phone: (session.user as any).phone || "" } : null;
  const [page, setPage] = useState<Page>("home");
  const [mobNav, setMobNav] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const nav = (p: Page, id?: string) => { setPage(p); if (id) setOrderId(id); setMobNav(false); window.scrollTo(0, 0); };

  const links = [
    { l: "Home", p: "home" as Page }, { l: "Menu", p: "menu" as Page },
    ...(user ? [{ l: "Orders", p: "orders" as Page }] : []),
    ...(user?.role === "admin" ? [{ l: "Admin", p: "admin" as Page }] : []),
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <button onClick={() => nav("home")} className="flex items-center gap-2 text-xl font-bold text-orange-600"><ShoppingCart className="w-6 h-6" />FoodOrder</button>
          <div className="hidden md:flex items-center gap-6">
            {links.map(x => <button key={x.p} onClick={() => nav(x.p)} className={cn("text-sm font-medium hover:text-orange-600", page === x.p ? "text-orange-600" : "text-gray-600")}>{x.l}</button>)}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => nav("cart")} className="p-2 text-gray-600 hover:text-orange-600"><ShoppingCart className="w-5 h-5" /></button>
            {user ? <button onClick={() => nav("account")} className="flex items-center gap-1 text-sm text-gray-600 hover:text-orange-600"><User className="w-4 h-4" />{user.name || user.phone}</button>
              : <button onClick={() => nav("auth")} className={bo}>Sign In</button>}
          </div>
          <button onClick={() => setMobNav(!mobNav)} className="md:hidden p-2 text-gray-600">{mobNav ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
        </div>
        {mobNav && <div className="md:hidden border-t border-gray-200 bg-white px-4 pb-4">
          {links.map(x => <button key={x.p} onClick={() => nav(x.p)} className={cn("block w-full text-left py-2 text-sm font-medium", page === x.p ? "text-orange-600" : "text-gray-600")}>{x.l}</button>)}
          <button onClick={() => nav("cart")} className="block w-full text-left py-2 text-sm font-medium text-gray-600">Cart</button>
          {user ? <button onClick={() => nav("account")} className="block w-full text-left py-2 text-sm font-medium text-gray-600">Account</button>
            : <button onClick={() => nav("auth")} className="block w-full text-left py-2 text-sm font-medium text-orange-600">Sign In</button>}
        </div>}
      </nav>
      <main className="flex-1">
        {page === "home" && <HomePage nav={nav} />}
        {page === "menu" && <MenuPage nav={nav} />}
        {page === "auth" && <AuthPage nav={nav} />}
        {page === "cart" && <CartPage nav={nav} user={user} />}
        {page === "checkout" && <CheckoutPage nav={nav} />}
        {page === "orders" && <OrdersPage nav={nav} />}
        {page === "order-detail" && orderId && <OrderDetailPage orderId={orderId} nav={nav} />}
        {page === "account" && <AccountPage user={user} />}
        {page === "admin" && <AdminPage />}
      </main>
      <footer className="bg-white border-t border-gray-200 py-6 text-center text-sm text-gray-500">&copy; {new Date().getFullYear()} FoodOrder. All rights reserved.</footer>
    </div>
  );
}

// ── Home ────────────────────────────────────────────────────────────────────
function HomePage({ nav }: { nav: (p: Page) => void }) {
  const [cats, setCats] = useState<Category[]>([]);
  const [feat, setFeat] = useState<MenuItem[]>([]);
  useEffect(() => {
    fetch("/api/categories").then(r => r.json()).then(setCats).catch(() => {});
    fetch("/api/menu?featured=true").then(r => r.json()).then(setFeat).catch(() => {});
  }, []);
  return (<>
    <section className="bg-gradient-to-r from-orange-600 to-orange-500 text-white py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">Delicious Food, Delivered Fast</h1>
        <p className="text-orange-100 text-lg mb-8">Order your favorite meals from the best restaurants in town.</p>
        <button onClick={() => nav("menu")} className="bg-white text-orange-600 px-8 py-3 rounded-lg font-semibold hover:bg-orange-50 transition">Browse Menu</button>
      </div>
    </section>
    <section className="max-w-7xl mx-auto px-4 py-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Categories</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {cats.map(c => <button key={c.id} onClick={() => nav("menu")} className="bg-white rounded-xl border border-gray-200 p-6 text-center hover:shadow-md transition">
          <p className="font-semibold text-gray-900">{c.name}</p><p className="text-sm text-gray-500 mt-1">{c._count.menuItems} items</p>
        </button>)}
      </div>
    </section>
    {feat.length > 0 && <section className="max-w-7xl mx-auto px-4 pb-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Featured Items</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {feat.map(i => <div key={i.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition">
          <p className="text-xs text-orange-600 font-medium">{i.category.name}</p>
          <h3 className="font-semibold text-gray-900 mt-1">{i.name}</h3>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{i.description}</p>
          <span className="text-lg font-bold text-orange-600 mt-3 inline-block">{fmt(i.price)}</span>
        </div>)}
      </div>
    </section>}
  </>);
}

// ── Menu ────────────────────────────────────────────────────────────────────
function MenuPage({ nav }: { nav: (p: Page) => void }) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [cat, setCat] = useState("");
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => { fetch("/api/categories").then(r => r.json()).then(setCats).catch(() => {}); }, []);
  useEffect(() => {
    const p = new URLSearchParams();
    if (cat) p.set("category", cat);
    if (q) p.set("search", q);
    fetch(`/api/menu?${p}`).then(r => r.json()).then(setItems).catch(() => {});
  }, [cat, q]);

  const add = async (id: string) => { setAdding(id); await fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ menuItemId: id, quantity: 1 }) }); setAdding(null); };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Menu</h1>
      <div className="relative mb-6"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Search menu..." value={q} onChange={e => setQ(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none" />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
        <button onClick={() => setCat("")} className={cn("px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap", !cat ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>All</button>
        {cats.map(c => <button key={c.id} onClick={() => setCat(c.slug)} className={cn("px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap", cat === c.slug ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>{c.name}</button>)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map(i => <div key={i.id} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col">
          <div className="flex-1"><p className="text-xs text-orange-600 font-medium">{i.category.name}</p><h3 className="font-semibold text-gray-900 mt-1">{i.name}</h3><p className="text-sm text-gray-500 mt-1 line-clamp-2">{i.description}</p></div>
          <div className="flex items-center justify-between mt-4">
            <span className="text-lg font-bold text-orange-600">{fmt(i.price)}</span>
            <button onClick={() => add(i.id)} disabled={adding === i.id || !i.isAvailable} className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 transition">{adding === i.id ? "Adding..." : i.isAvailable ? "Add to Cart" : "Unavailable"}</button>
          </div>
        </div>)}
        {items.length === 0 && <p className="text-gray-500 col-span-full text-center py-12">No items found.</p>}
      </div>
    </div>
  );
}

// ── Auth ────────────────────────────────────────────────────────────────────
function AuthPage({ nav }: { nav: (p: Page) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");
  const [load, setLoad] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(""); setLoad(true);
    try {
      if (isLogin) {
        const res = await signIn("credentials", { phone, name: "User", redirect: false });
        if (res?.error) throw new Error("Phone number not found. Please register first.");
        nav("home");
      } else {
        const r = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, phone }) });
        if (!r.ok) { const d = await r.json(); throw new Error(d.error || "Registration failed"); }
        const res = await signIn("credentials", { phone, name, redirect: false });
        if (res?.error) { throw new Error("Account created but login failed. Try signing in."); }
        nav("home");
      }
    } catch (e: any) { setErr(e.message); }
    setLoad(false);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">{isLogin ? "Sign In with Phone" : "Register with Phone"}</h2>
        {err && <p className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-2 mb-4">{err}</p>}
        <form onSubmit={submit} className="space-y-4">
          {!isLogin && <div><label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label><input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" className={ic} /></div>}
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label><input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 234 567 890" className={ic} /></div>
          <button type="submit" disabled={load} className="w-full bg-orange-600 text-white py-2.5 rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 transition">{load ? "Please wait..." : isLogin ? "Sign In" : "Register"}</button>
        </form>
        <p className="text-sm text-gray-500 text-center mt-4">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button onClick={() => { setIsLogin(!isLogin); setErr(""); }} className="text-orange-600 font-medium ml-1 hover:underline">{isLogin ? "Register" : "Sign In"}</button>
        </p>
        <p className="text-xs text-gray-400 text-center mt-3">No password needed. Just enter your phone number.</p>
      </div>
    </div>
  );
}

// ── Cart ────────────────────────────────────────────────────────────────────
function CartPage({ nav, user }: { nav: (p: Page) => void; user: User_ | null }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => { fetch("/api/cart").then(r => r.json()).then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load]);

  const update = async (id: string, qty: number) => {
    if (qty < 1) await fetch("/api/cart", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cartItemId: id }) });
    else await fetch("/api/cart", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cartItemId: id, quantity: qty }) });
    load();
  };
  const sub = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const tax = sub * 0.08;
  const del = items.length > 0 ? 4.99 : 0;
  const tot = sub + tax + del;

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-12 text-center text-gray-500">Loading cart...</div>;
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Your Cart</h1>
      {items.length === 0 ? (
        <div className="text-center py-12"><ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" /><p className="text-gray-500 mb-4">Your cart is empty</p><button onClick={() => nav("menu")} className="bg-orange-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-700 transition">Browse Menu</button></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-end"><button onClick={async () => { await fetch("/api/cart/clear", { method: "DELETE" }); load(); }} className="text-sm text-red-600 hover:text-red-700 font-medium">Clear Cart</button></div>
            {items.map(i => <div key={i.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
              <div className="flex-1"><h3 className="font-semibold text-gray-900">{i.name}</h3><p className="text-sm text-gray-500">{fmt(i.price)} each</p>{i.notes && <p className="text-xs text-gray-400 mt-1">Note: {i.notes}</p>}</div>
              <div className="flex items-center gap-2">
                <button onClick={() => update(i.id, i.quantity - 1)} className="p-1 rounded-lg border border-gray-300 hover:bg-gray-100"><Minus className="w-4 h-4" /></button>
                <span className="w-8 text-center font-medium">{i.quantity}</span>
                <button onClick={() => update(i.id, i.quantity + 1)} className="p-1 rounded-lg border border-gray-300 hover:bg-gray-100"><Plus className="w-4 h-4" /></button>
              </div>
              <span className="font-bold text-gray-900 w-20 text-right">{fmt(i.price * i.quantity)}</span>
              <button onClick={() => update(i.id, 0)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
            </div>)}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 h-fit sticky top-24">
            <h3 className="font-bold text-gray-900 text-lg mb-4">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{fmt(sub)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>{fmt(tax)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Delivery</span><span>{fmt(del)}</span></div>
              <hr className="my-2" /><div className="flex justify-between font-bold text-lg"><span>Total</span><span className="text-orange-600">{fmt(tot)}</span></div>
            </div>
            <button onClick={() => user ? nav("checkout") : nav("auth")} className="w-full bg-orange-600 text-white py-3 rounded-lg font-medium mt-6 hover:bg-orange-700 transition">{user ? "Proceed to Checkout" : "Sign In to Checkout"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Checkout ────────────────────────────────────────────────────────────────
function CheckoutPage({ nav }: { nav: (p: Page) => void }) {
  const [addrs, setAddrs] = useState<Address[]>([]);
  const [selAddr, setSelAddr] = useState("");
  const [pay, setPay] = useState("cash");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetch("/api/addresses").then(r => r.json()).then(d => { setAddrs(Array.isArray(d) ? d : []); if (d.length) setSelAddr(d[0].id); }).catch(() => {}); }, []);

  const place = async () => {
    if (!selAddr) return; setLoading(true);
    try {
      const r = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ addressId: selAddr, paymentMethod: pay, notes }) });
      if (r.ok) { await fetch("/api/cart/clear", { method: "DELETE" }); nav("orders"); }
    } catch {} setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Checkout</h1>
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><MapPin className="w-4 h-4" /> Delivery Address</h3>
          {addrs.length === 0 ? <p className="text-gray-500 text-sm">No addresses found. <button onClick={() => nav("account")} className="text-orange-600 hover:underline">Add one</button></p> : (
            <div className="space-y-2">{addrs.map(a => (
              <label key={a.id} className={cn("flex items-start gap-3 p-3 rounded-lg border cursor-pointer", selAddr === a.id ? "border-orange-600 bg-orange-50" : "border-gray-200")}>
                <input type="radio" name="addr" checked={selAddr === a.id} onChange={() => setSelAddr(a.id)} className="mt-1 accent-orange-600" />
                <div><p className="font-medium text-sm text-gray-900">{a.label}</p><p className="text-xs text-gray-500">{a.streetAddress}, {a.city}, {a.state} {a.zipCode}</p><p className="text-xs text-gray-500">{a.phone}</p></div>
              </label>
            ))}</div>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4" /> Payment Method</h3>
          <div className="flex gap-3">
            {(["cash", "card"] as const).map(m => <button key={m} onClick={() => setPay(m)} className={cn("flex-1 py-2.5 rounded-lg text-sm font-medium border transition", pay === m ? "bg-orange-600 text-white border-orange-600" : "border-gray-300 text-gray-600 hover:bg-gray-50")}>{m === "cash" ? "Cash on Delivery" : "Credit Card"}</button>)}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Order Notes</h3>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Special instructions..." rows={3} className={ic} />
        </div>
        <button onClick={place} disabled={loading || !selAddr} className="w-full bg-orange-600 text-white py-3 rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 transition">{loading ? "Placing Order..." : "Place Order"}</button>
      </div>
    </div>
  );
}

// ── Orders ──────────────────────────────────────────────────────────────────
function OrdersPage({ nav }: { nav: (p: Page, id?: string) => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/orders").then(r => r.json()).then(d => { setOrders(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false)); }, []);
  if (loading) return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-gray-500">Loading orders...</div>;
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Your Orders</h1>
      {orders.length === 0 ? <div className="text-center py-12"><Package className="w-16 h-16 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">No orders yet</p></div> : (
        <div className="space-y-4">{orders.map(o => (
          <button key={o.id} onClick={() => nav("order-detail", o.id)} className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(o.createdAt).toLocaleDateString()}</span>
              <span className={cn("inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium", sc(o.status))}>{sl(o.status)}</span>
            </div>
            <p className="font-semibold text-gray-900">Order #{o.id.slice(0, 8)}</p>
            <p className="text-sm text-gray-500 mt-1">{o.items.length} item{o.items.length !== 1 ? "s" : ""} &middot; {fmt(o.total)}</p>
          </button>
        ))}</div>
      )}
    </div>
  );
}

// ── Order Detail ────────────────────────────────────────────────────────────
function OrderDetailPage({ orderId, nav }: { orderId: string; nav: (p: Page) => void }) {
  const [order, setOrder] = useState<Order | null>(null);
  useEffect(() => { fetch("/api/orders").then(r => r.json()).then((d: Order[]) => setOrder(d.find(o => o.id === orderId) ?? null)).catch(() => {}); }, [orderId]);
  if (!order) return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-gray-500">Loading order...</div>;
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button onClick={() => nav("orders")} className="text-sm text-orange-600 hover:underline mb-4 inline-block">&larr; Back to Orders</button>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Order #{order.id.slice(0, 8)}</h1>
          <span className={cn("inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium", sc(order.status))}>{sl(order.status)}</span>
        </div>
        <p className="text-sm text-gray-500 mb-4 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(order.createdAt).toLocaleString()}</p>
        <div className="divide-y border-t">{order.items.map(i => (
          <div key={i.id} className="flex justify-between py-3">
            <span className="font-medium text-gray-900">{i.name} <span className="text-gray-500 font-normal">x{i.quantity}</span></span>
            <span className="font-medium">{fmt(i.price * i.quantity)}</span>
          </div>
        ))}</div>
        <hr className="my-4" />
        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{fmt(order.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>{fmt(order.tax)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Delivery</span><span>{fmt(order.deliveryFee)}</span></div>
          <div className="flex justify-between font-bold text-lg pt-2"><span>Total</span><span className="text-orange-600">{fmt(order.total)}</span></div>
        </div>
        {order.notes && <p className="mt-4 text-sm text-gray-500 bg-gray-50 rounded-lg p-3">Note: {order.notes}</p>}
        <p className="mt-4 text-sm text-gray-500 flex items-center gap-1"><DollarSign className="w-3 h-3" />{order.paymentMethod === "cash" ? "Cash on Delivery" : "Credit Card"}</p>
      </div>
    </div>
  );
}

// ── Account ─────────────────────────────────────────────────────────────────
function AccountPage({ user }: { user: User_ | null }) {
  const [addrs, setAddrs] = useState<Address[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [a, setA] = useState({ label: "Home", streetAddress: "", city: "", state: "", zipCode: "", phone: "" });

  const loadA = useCallback(() => { fetch("/api/addresses").then(r => r.json()).then(d => setAddrs(Array.isArray(d) ? d : [])).catch(() => {}); }, []);
  useEffect(() => { loadA(); }, [loadA]);

  const addAddr = async (e: FormEvent) => {
    e.preventDefault();
    await fetch("/api/addresses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(a) });
    setA({ label: "Home", streetAddress: "", city: "", state: "", zipCode: "", phone: "" });
    setShowForm(false); loadA();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">My Account</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Profile</h3>
        <div className="space-y-3">
          <div><label className="block text-sm text-gray-500">Name</label><input type="text" defaultValue={user?.name ?? ""} className={ic} /></div>
          <div><label className="block text-sm text-gray-500">Phone</label><input type="tel" value={user?.phone ?? ""} disabled className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" /></div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Addresses</h3>
          <button onClick={() => setShowForm(!showForm)} className="text-sm text-orange-600 font-medium hover:underline">{showForm ? "Cancel" : "+ Add Address"}</button>
        </div>
        {showForm && <form onSubmit={addAddr} className="space-y-3 mb-4 p-4 bg-gray-50 rounded-lg">
          <input type="text" placeholder="Label (e.g. Home)" value={a.label} onChange={e => setA({ ...a, label: e.target.value })} className={ic} />
          <input type="text" placeholder="Street Address" required value={a.streetAddress} onChange={e => setA({ ...a, streetAddress: e.target.value })} className={ic} />
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="City" required value={a.city} onChange={e => setA({ ...a, city: e.target.value })} className={ic} />
            <input type="text" placeholder="State" required value={a.state} onChange={e => setA({ ...a, state: e.target.value })} className={ic} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="Zip Code" required value={a.zipCode} onChange={e => setA({ ...a, zipCode: e.target.value })} className={ic} />
            <input type="tel" placeholder="Phone" required value={a.phone} onChange={e => setA({ ...a, phone: e.target.value })} className={ic} />
          </div>
          <button type="submit" className={bo}>Save Address</button>
        </form>}
        {addrs.length === 0 ? <p className="text-gray-500 text-sm">No addresses yet.</p> : (
          <div className="space-y-2">{addrs.map(a => (
            <div key={a.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div><p className="font-medium text-sm text-gray-900">{a.label}</p><p className="text-xs text-gray-500">{a.streetAddress}, {a.city}, {a.state} {a.zipCode}</p></div>
              <button onClick={async () => { await fetch(`/api/addresses/${a.id}`, { method: "DELETE" }); loadA(); }} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}</div>
        )}
      </div>
      <button onClick={async () => { await signOut({ redirect: false }); window.location.href = "/"; }} className="flex items-center gap-2 text-red-600 font-medium hover:text-red-700"><LogOut className="w-4 h-4" /> Sign Out</button>
    </div>
  );
}

// ── Admin ───────────────────────────────────────────────────────────────────
function AdminPage() {
  const [tab, setTab] = useState<"dashboard" | "menu" | "orders">("dashboard");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [edit, setEdit] = useState<Partial<MenuItem> | null>(null);
  const [f, setF] = useState({ name: "", price: "", description: "", categoryId: "", isAvailable: true, isFeatured: false });

  const loadM = useCallback(() => { fetch("/api/menu").then(r => r.json()).then(setMenuItems).catch(() => {}); }, []);
  const loadO = useCallback(() => { fetch("/api/orders").then(r => r.json()).then(d => setOrders(Array.isArray(d) ? d : [])).catch(() => {}); }, []);

  useEffect(() => {
    fetch("/api/analytics").then(r => r.json()).then(setAnalytics).catch(() => {});
    fetch("/api/categories").then(r => r.json()).then(setCats).catch(() => {});
    loadM(); loadO();
  }, [loadM, loadO]);

  const updStatus = async (id: string, status: string) => { await fetch(`/api/orders/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); loadO(); };

  const saveItem = async (e: FormEvent) => {
    e.preventDefault();
    if (edit?.id) await fetch(`/api/menu/${edit.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, price: parseFloat(f.price) }) });
    setEdit(null); loadM();
  };

  const startEdit = (i: MenuItem) => { setEdit(i); setF({ name: i.name, price: String(i.price), description: i.description, categoryId: i.categoryId, isAvailable: i.isAvailable, isFeatured: i.isFeatured }); };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {(["dashboard", "menu", "orders"] as const).map(t => <button key={t} onClick={() => setTab(t)} className={cn("px-4 py-2 rounded-lg text-sm font-medium capitalize whitespace-nowrap", tab === t ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>{t}</button>)}
      </div>
      {tab === "dashboard" && analytics && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { l: "Total Orders", v: String(analytics.totalOrders), i: Package },
          { l: "Revenue", v: fmt(analytics.totalRevenue), i: DollarSign },
          { l: "Pending", v: String(analytics.pendingOrders), i: Clock },
          { l: "Customers", v: String(analytics.totalCustomers), i: User },
        ].map(s => <div key={s.l} className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3"><div className="p-2 bg-orange-100 rounded-lg"><s.i className="w-5 h-5 text-orange-600" /></div><div><p className="text-sm text-gray-500">{s.l}</p><p className="text-2xl font-bold text-gray-900">{s.v}</p></div></div>
        </div>)}
      </div>}
      {tab === "menu" && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold text-gray-900 mb-4">Menu Items ({menuItems.length})</h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">{menuItems.map(i => (
            <div key={i.id} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center justify-between">
              <div><p className="font-medium text-sm text-gray-900">{i.name}</p><p className="text-xs text-gray-500">{i.category.name} &middot; {fmt(i.price)}</p></div>
              <button onClick={() => startEdit(i)} className="text-xs text-orange-600 hover:underline">Edit</button>
            </div>
          ))}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">{edit ? "Edit Item" : "Select an item to edit"}</h3>
          {edit && <form onSubmit={saveItem} className="space-y-3">
            <input type="text" placeholder="Name" required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} className={ic} />
            <input type="number" step="0.01" placeholder="Price" required value={f.price} onChange={e => setF({ ...f, price: e.target.value })} className={ic} />
            <textarea placeholder="Description" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} className={ic} rows={3} />
            <select value={f.categoryId} onChange={e => setF({ ...f, categoryId: e.target.value })} className={ic}><option value="">Select category</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isAvailable} onChange={e => setF({ ...f, isAvailable: e.target.checked })} className="accent-orange-600" />Available</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isFeatured} onChange={e => setF({ ...f, isFeatured: e.target.checked })} className="accent-orange-600" />Featured</label>
            <div className="flex gap-2"><button type="submit" className={bo}>Save</button><button type="button" onClick={() => setEdit(null)} className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50 transition">Cancel</button></div>
          </form>}
        </div>
      </div>}
      {tab === "orders" && <div className="space-y-3">
        {orders.length === 0 && <p className="text-gray-500 text-center py-8">No orders found.</p>}
        {orders.map(o => <div key={o.id} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div><p className="font-semibold text-gray-900">Order #{o.id.slice(0, 8)}</p>{o.user && <p className="text-xs text-gray-500">{o.user.name} ({o.user.email})</p>}<p className="text-xs text-gray-500 mt-1">{o.items.length} items &middot; {fmt(o.total)} &middot; {new Date(o.createdAt).toLocaleString()}</p></div>
          <div className="flex items-center gap-2">
            <span className={cn("inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium", sc(o.status))}>{sl(o.status)}</span>
            <select value={o.status} onChange={e => updStatus(o.id, e.target.value)} className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-orange-500 focus:outline-none">
              {["pending", "confirmed", "preparing", "out_for_delivery", "delivered", "cancelled"].map(s => <option key={s} value={s}>{sl(s)}</option>)}
            </select>
          </div>
        </div>)}
      </div>}
    </div>
  );
}
