import { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Box,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  FileImage,
  LayoutDashboard,
  Package,
  Plus,
  Search,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  Users,
  UserRound,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/StoreContext";
import { db, storage } from "../firebase/client";
import { EmptyState, ErrorState, LoadingState } from "../components/Feedback";
import ProductImage from "../components/ProductImage";
import { errorMessage, formatDate, formatPrice } from "../utils/format";
import catalogProducts from "../../data/products.json";

const STATUSES = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"];
const STATUS_NEXT = {
  Pending: ["Confirmed", "Cancelled"],
  Confirmed: ["Processing", "Cancelled"],
  Processing: ["Shipped", "Cancelled"],
  Shipped: ["Delivered"],
  Delivered: [],
  Cancelled: [],
};
const CHART_COLORS = ["#4859e8", "#d9ec55", "#8261d5", "#3ca879", "#f0a24f", "#e36a63"];
const fallbackProducts = new Map(catalogProducts.map((product) => [product.id, product]));
const fallbackProductIds = new Set(fallbackProducts.keys());
const bundledProductImages = new Map(catalogProducts.map((product) => [product.id, product.image]));

export function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const current = location.pathname.split("/").pop();
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Link to="/" className="brand-lockup admin-brand"><span className="brand-mark">S</span><span className="brand-name">SOLE<span>MATES</span><small>ADMIN CONSOLE</small></span></Link>
        <div className="admin-workspace"><span className="workspace-avatar">S</span><span><b>Sole Mates</b><small>Footwear store</small></span><ChevronDown size={14} /></div>
        <span className="admin-nav-label">WORKSPACE</span>
        <NavLink end to="/admin" className="admin-nav-link"><LayoutDashboard size={17} /> Overview</NavLink>
        <NavLink to="/admin/products" className="admin-nav-link"><Package size={17} /> Products</NavLink>
        <NavLink to="/admin/orders" className="admin-nav-link"><ClipboardList size={17} /> Orders</NavLink>
        <NavLink to="/admin/analytics" className="admin-nav-link"><BarChart3 size={17} /> Analytics</NavLink>
        <div className="admin-sidebar-bottom"><ShieldCheck size={17} /><span><b>Admin access</b><small>Authorized administrator UID</small></span></div>
        <button className="admin-user" onClick={logout}><span className="admin-user-avatar">{(user?.displayName || user?.email || "A").slice(0, 1).toUpperCase()}</span><span><b>{user?.displayName || "Administrator"}</b><small>{user?.email}</small></span><X size={15} /></button>
      </aside>
      <div className="admin-content-wrap">
        <header className="admin-topbar">
          <div className="admin-topbar-title">
            <span className="admin-console-chip"><ShieldCheck size={13} /> ADMIN CONSOLE</span>
            <span className="admin-topbar-separator">/</span>
            <b>{current === "admin" ? "Overview" : current[0]?.toUpperCase() + current.slice(1)}</b>
          </div>
          <div className="admin-topbar-actions">
            <Link to="/account"><UserRound size={14} /> Personal account</Link>
            <Link to="/" target="_blank">View storefront <ArrowUpRight size={14} /></Link>
            <span className="admin-online"><i /> Store active</span>
          </div>
        </header>
        <main className="admin-main"><Outlet /></main>
      </div>
    </div>
  );
}

export function AdminDashboardPage() {
  const { orders, products, users, loading, error, reload } = useAdminData();
  if (loading) return <LoadingState label="Loading store analytics..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const activeOrders = orders.filter((order) => order.status !== "Cancelled");
  const revenue = activeOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
  const lowStock = products.filter((product) => Number(product.stock) < 6).sort((a, b) => a.stock - b.stock);
  const recentOrders = [...orders].sort((a, b) => dateValue(b.createdAt) - dateValue(a.createdAt)).slice(0, 5);
  const monthlySales = getMonthlySales(activeOrders);
  const metrics = [
    { title: "Gross revenue", value: formatPrice(revenue), icon: CircleDollarSign, note: "Non-cancelled order totals" },
    { title: "Orders", value: orders.length.toLocaleString(), icon: ShoppingCart, note: `${orders.filter((order) => order.status === "Pending").length} awaiting confirmation` },
    { title: "Products", value: products.length.toLocaleString(), icon: Package, note: `${lowStock.length} low-stock alerts` },
    { title: "Registered users", value: users.length.toLocaleString(), icon: Users, note: "Firebase Auth profiles" },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-heading"><div><span className="eyebrow">STORE PERFORMANCE</span><h1>Overview</h1><p>Real-time operations and a quick read on your store.</p></div><span className="admin-date-pill"><Activity size={14} /> Live Firestore data</span></div>
      <div className="metric-grid">{metrics.map(({ title, value, icon: Icon, note }) => <div className="metric-card" key={title}><div className="metric-card-top"><span>{title}</span><Icon size={18} /></div><strong>{value}</strong><small>{note}</small></div>)}</div>
      <div className="admin-dashboard-grid">
        <section className="admin-panel sales-panel"><div className="panel-heading"><div><span className="eyebrow">LAST 6 MONTHS</span><h2>Sales overview</h2></div><span className="chart-legend"><i /> Gross order total</span></div><div className="sales-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthlySales} margin={{ left: -18, right: 8, top: 14, bottom: 0 }}><defs><linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#33d6f2" stopOpacity={0.3} /><stop offset="95%" stopColor="#33d6f2" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#202b37" vertical={false} /><XAxis dataKey="month" stroke="#718094" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} /><YAxis stroke="#718094" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} tickFormatter={(value) => value >= 1000 ? `₱${(value / 1000).toFixed(0)}k` : `₱${value}`} /><Tooltip content={<SalesTooltip />} /><Area type="monotone" dataKey="revenue" stroke="#33d6f2" strokeWidth={2} fill="url(#salesFill)" activeDot={{ r: 5, fill: "#33d6f2" }} /></AreaChart></ResponsiveContainer></div><p className="chart-definition">Revenue is gross order total (including shipping) from all non-cancelled orders, based on the server-calculated order total.</p></section>
        <section className="admin-panel"><div className="panel-heading"><div><span className="eyebrow">NEEDS ATTENTION</span><h2>Low stock</h2></div><Link to="/admin/products">Manage <ArrowUpRight size={14} /></Link></div>{lowStock.length ? <div className="low-stock-list">{lowStock.slice(0, 5).map((product) => <Link key={product.id} to="/admin/products" className="low-stock-row"><ProductImage id={product.id} src={product.image} alt="" /><span><b>{product.name}</b><small>{product.brand}</small></span><em>{product.stock} left</em></Link>)}</div> : <div className="admin-empty-small"><Check size={17} /> No low-stock products</div>}</section>
      </div>
      <section className="admin-panel recent-orders-panel"><div className="panel-heading"><div><span className="eyebrow">LATEST ACTIVITY</span><h2>Recent orders</h2></div><Link to="/admin/orders">All orders <ArrowUpRight size={14} /></Link></div>{recentOrders.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>DATE</th><th>STATUS</th><th className="text-right">TOTAL</th></tr></thead><tbody>{recentOrders.map((order) => <tr key={order.id}><td><b>{order.orderNumber}</b></td><td>{order.customer?.name || "—"}</td><td>{formatDate(order.createdAt)}</td><td><span className={`status-pill status-${order.status?.toLowerCase()}`}>{order.status}</span></td><td className="text-right">{formatPrice(order.total)}</td></tr>)}</tbody></table></div> : <EmptyState title="No orders yet" message="New orders will show up here." />}</section>
    </div>
  );
}

export function AdminAnalyticsPage() {
  const { orders, products, loading, error, reload } = useAdminData();
  if (loading) return <LoadingState label="Calculating store analytics..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const validOrders = orders.filter((order) => order.status !== "Cancelled");
  const deliveredOrders = orders.filter((order) => order.status === "Delivered");
  const byProduct = new Map();
  deliveredOrders.forEach((order) => (order.items || []).forEach((item) => {
    const current = byProduct.get(item.productId) || { name: item.name, units: 0, revenue: 0 };
    current.units += Number(item.quantity) || 0;
    current.revenue += Number(item.lineTotal) || 0;
    byProduct.set(item.productId, current);
  }));
  const unitsSold = [...byProduct.values()].reduce((sum, product) => sum + product.units, 0);
  const bestProducts = [...byProduct.entries()]
    .map(([, sales]) => sales)
    .sort((a, b) => b.units - a.units)
    .slice(0, 6);
  const categorySales = new Map();
  validOrders.forEach((order) => (order.items || []).forEach((item) => {
    const category = products.find((product) => product.id === item.productId)?.category || "Other";
    categorySales.set(category, (categorySales.get(category) || 0) + (Number(item.lineTotal) || 0));
  }));
  const categoryData = [...categorySales.entries()].map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue);
  const sales = getMonthlySales(validOrders);
  const totalRevenue = validOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);

  return (
    <div className="admin-page">
      <div className="admin-page-heading"><div><span className="eyebrow">DATA, NOT GUESSES</span><h1>Analytics</h1><p>Performance calculated from actual Firestore orders and catalog data.</p></div></div>
      <div className="metric-grid analytics-metrics"><div className="metric-card"><div className="metric-card-top"><span>Gross revenue</span><CircleDollarSign size={18} /></div><strong>{formatPrice(totalRevenue)}</strong><small>Non-cancelled order totals · includes shipping</small></div><div className="metric-card"><div className="metric-card-top"><span>Orders placed</span><ClipboardList size={18} /></div><strong>{orders.length}</strong><small>{orders.filter((order) => order.status !== "Cancelled").length} non-cancelled</small></div><div className="metric-card"><div className="metric-card-top"><span>Units sold</span><Box size={18} /></div><strong>{unitsSold}</strong><small>Updated when delivered</small></div></div>
      <div className="admin-dashboard-grid analytics-charts">
        <section className="admin-panel sales-panel"><div className="panel-heading"><div><span className="eyebrow">MONTHLY GROSS SALES</span><h2>Revenue over time</h2></div></div><div className="sales-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={sales} margin={{ left: -16, right: 8, top: 14, bottom: 0 }}><defs><linearGradient id="analyticsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2788ff" stopOpacity={0.3} /><stop offset="95%" stopColor="#2788ff" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#202b37" vertical={false} /><XAxis dataKey="month" stroke="#718094" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} /><YAxis stroke="#718094" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} tickFormatter={(value) => `₱${Math.round(value / 1000)}k`} /><Tooltip content={<SalesTooltip />} /><Area type="monotone" dataKey="revenue" stroke="#2788ff" strokeWidth={2} fill="url(#analyticsFill)" /></AreaChart></ResponsiveContainer></div></section>
        <section className="admin-panel"><div className="panel-heading"><div><span className="eyebrow">ORDER ITEM REVENUE</span><h2>Category performance</h2></div></div>{categoryData.length ? <div className="category-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={categoryData} layout="vertical" margin={{ left: 3, right: 12, top: 4, bottom: 4 }}><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={104} stroke="#8491a2" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} /><Tooltip content={<SalesTooltip />} /><Bar dataKey="revenue" radius={[0, 4, 4, 0]}>{categoryData.map((item, index) => <Cell key={item.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer></div> : <EmptyState title="No category data yet" message="Completed order items will be grouped here." />}</section>
      </div>
      <section className="admin-panel analytics-best"><div className="panel-heading"><div><span className="eyebrow">DELIVERED ORDERS</span><h2>Best-selling products</h2></div></div>{bestProducts.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>PRODUCT</th><th>UNITS SOLD</th><th>ITEM REVENUE</th></tr></thead><tbody>{bestProducts.map((item) => <tr key={item.name}><td><b>{item.name}</b></td><td>{item.units}</td><td>{formatPrice(item.revenue)}</td></tr>)}</tbody></table></div> : <EmptyState title="No delivered sales yet" message="Best sellers will appear after the first order is delivered." />}</section>
      <p className="analytics-footnote"><ShieldCheck size={14} /> Units sold and best sellers count delivered orders only. Cancelled orders are excluded from revenue, units, category performance, and best-selling product calculations.</p>
    </div>
  );
}

export function AdminOrdersPage() {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [requests, setRequests] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [busyOrder, setBusyOrder] = useState("");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const reload = () => {
    setLoading(true);
    setError("");
    Promise.all([
      getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc"))),
      getDocs(query(collection(db, "orderRequests"), orderBy("createdAt", "desc"))),
      getDocs(collection(db, "products")),
    ])
      .then(([ordersSnapshot, requestsSnapshot, productsSnapshot]) => {
        setOrders(ordersSnapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
        setRequests(requestsSnapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
        setProducts(productsSnapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
      })
      .catch((issue) => setError(issue.message || "Could not load orders."))
      .finally(() => setLoading(false));
  };
  useEffect(reload, []);

  const filtered = orders.filter((order) => {
    const term = search.toLowerCase();
    return (!statusFilter || order.status === statusFilter)
      && (!dateFilter || localDateValue(order.createdAt) === dateFilter)
      && (!term || `${order.orderNumber} ${order.customer?.name} ${order.customer?.email}`.toLowerCase().includes(term));
  });

  const updateStatus = async (order, status) => {
    setBusyOrder(order.id);
    try {
      await runTransaction(db, async (transaction) => {
        const orderRef = doc(db, "orders", order.id);
        const snapshot = await transaction.get(orderRef);
        if (!snapshot.exists()) throw new Error("This order no longer exists.");
        const current = snapshot.data();
        if (!STATUS_NEXT[current.status]?.includes(status)) {
          throw new Error(`Cannot change an order from ${current.status} to ${status}.`);
        }
        const items = Array.isArray(current.items) ? current.items : [];
        const productRefs = status === "Cancelled" || status === "Delivered"
          ? items.map((item) => doc(db, "products", item.productId))
          : [];
        const productSnapshots = productRefs.length
          ? await Promise.all(productRefs.map((productRef) => transaction.get(productRef)))
          : [];
        productRefs.forEach((productRef, index) => {
          const product = productSnapshots[index].data();
          const quantity = Number(items[index].quantity);
          if (productSnapshots[index].exists && product && Number.isInteger(quantity) && quantity > 0) {
            transaction.update(productRef, status === "Cancelled"
              ? {
                stock: Number(product.stock || 0) + quantity,
                updatedAt: serverTimestamp(),
              }
              : {
                soldCount: Number(product.soldCount || 0) + quantity,
                updatedAt: serverTimestamp(),
              });
          }
        });
        transaction.update(orderRef, {
          status,
          statusHistory: [...(Array.isArray(current.statusHistory) ? current.statusHistory : []), {
            status,
            at: new Date().toISOString(),
          }],
          updatedAt: serverTimestamp(),
        });
      });
      toast(`Order ${order.orderNumber} updated to ${status}.`);
      reload();
    } catch (issue) {
      toast(errorMessage(issue), "error");
    } finally {
      setBusyOrder("");
    }
  };

  const reviewRequest = async (request, decision) => {
    setBusyOrder(request.id);
    try {
      if (decision === "Rejected") {
        await updateDoc(doc(db, "orderRequests", request.id), {
          status: "Rejected",
          reviewedAt: serverTimestamp(),
        });
        toast("Order request rejected.");
        reload();
        return;
      }

      await runTransaction(db, async (transaction) => {
        const requestRef = doc(db, "orderRequests", request.id);
        const requestSnapshot = await transaction.get(requestRef);
        if (!requestSnapshot.exists()) throw new Error("This order request no longer exists.");
        const orderRequest = requestSnapshot.data();
        if (orderRequest.status !== "Pending approval") {
          throw new Error("This request has already been reviewed.");
        }
        if (!Array.isArray(orderRequest.items) || orderRequest.items.length === 0 || orderRequest.items.length > 30) {
          throw new Error("This order request has invalid items.");
        }
        const seen = new Set();
        const requestedItems = orderRequest.items.map((item) => {
          if (!item || typeof item.productId !== "string"
            || !/^[a-zA-Z0-9_-]+$/.test(item.productId)
            || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10
            || seen.has(item.productId)) {
            throw new Error("This request contains a duplicate or invalid product quantity.");
          }
          seen.add(item.productId);
          return { productId: item.productId, quantity: item.quantity };
        });
        const productRefs = requestedItems.map((item) => doc(db, "products", item.productId));
        const productSnapshots = await Promise.all(productRefs.map((productRef) => transaction.get(productRef)));
        let subtotal = 0;
        const orderItems = requestedItems.map((item, index) => {
          const product = productSnapshots[index].exists
            ? productSnapshots[index].data()
            : fallbackProducts.get(item.productId);
          if (!product || product.published !== true) {
            throw new Error("A requested product is no longer available.");
          }
          if (!Number.isSafeInteger(product.price) || product.price < 0
            || !Number.isInteger(product.stock) || product.stock < item.quantity) {
            throw new Error(`${product.name} is out of stock or has invalid catalog data.`);
          }
          const lineTotal = product.price * item.quantity;
          if (!Number.isSafeInteger(lineTotal) || !Number.isSafeInteger(subtotal + lineTotal)) {
            throw new Error("The approved order amount is outside the supported range.");
          }
          subtotal += lineTotal;
          return {
            productId: item.productId,
            name: String(product.name),
            slug: String(product.slug || ""),
            image: String(product.image || ""),
            unitPrice: product.price,
            quantity: item.quantity,
            lineTotal,
          };
        });
        const shippingFee = subtotal >= 5000 ? 0 : 150;
        if (!Number.isSafeInteger(subtotal + shippingFee)) {
          throw new Error("The approved order total is outside the supported range.");
        }
        const orderRef = doc(collection(db, "orders"));
        const orderNumber = `SM-${request.id.slice(0, 8).toUpperCase()}`;
        const now = new Date().toISOString();
        const customer = orderRequest.customer || {};
        const shippingAddress = orderRequest.shippingAddress || {};

        productRefs.forEach((productRef, index) => {
          const quantity = requestedItems[index].quantity;
          const product = productSnapshots[index].data() || fallbackProducts.get(requestedItems[index].productId);
          if (productSnapshots[index].exists) {
            transaction.update(productRef, {
              stock: product.stock - quantity,
              updatedAt: serverTimestamp(),
            });
          } else {
            transaction.set(productRef, {
              ...product,
              stock: product.stock - quantity,
              soldCount: 0,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        });
        transaction.set(orderRef, {
          uid: orderRequest.uid,
          orderNumber,
          customer: {
            name: String(customer.name || ""),
            email: String(customer.email || ""),
            phone: String(customer.phone || ""),
          },
          shippingAddress,
          paymentMethod: orderRequest.paymentMethod,
          paymentNotice: orderRequest.paymentMethod === "GCash (manual demo)"
            ? "Manual demo option only. No GCash payment was processed."
            : "",
          items: orderItems,
          subtotal,
          shippingFee,
          total: subtotal + shippingFee,
          currency: "PHP",
          status: "Pending",
          statusHistory: [{ status: "Pending", at: now }],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        transaction.update(requestRef, {
          status: "Approved",
          orderId: orderRef.id,
          orderNumber,
          reviewedAt: serverTimestamp(),
        });
      });
      toast("Request approved. Current prices and stock were verified; the order was created.");
      reload();
    } catch (issue) {
      toast(errorMessage(issue), "error");
    } finally {
      setBusyOrder("");
    }
  };

  const pendingRequests = requests.filter((request) => request.status === "Pending approval");
  const productNames = new Map(products.map((product) => [product.id, product.name]));

  return (
    <div className="admin-page">
      <div className="admin-page-heading"><div><span className="eyebrow">FULFILMENT</span><h1>Orders</h1><p>Track customer purchases and keep order status up to date.</p></div></div>
      <div className="admin-filters"><div className="admin-search"><Search size={16} /><input placeholder="Search order or customer" value={search} onChange={(event) => setSearch(event.target.value)} /></div><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All statuses</option>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select><input aria-label="Filter by date" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} /></div>
      <section className="admin-panel admin-orders-table">
        <div className="panel-heading"><div><span className="eyebrow">CUSTOMER SUBMISSIONS</span><h2>Requests awaiting approval <span className="request-count">{pendingRequests.length}</span></h2></div></div>
        {loading ? <LoadingState label="Loading order requests..." /> : error ? <ErrorState message={error} onRetry={reload} /> : !pendingRequests.length ? <EmptyState title="No requests awaiting approval" message="New customer requests will appear here." /> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>REQUEST</th><th>CUSTOMER</th><th>ITEMS REQUESTED</th><th>SUBMITTED</th><th>REVIEW</th></tr></thead><tbody>{pendingRequests.map((request) => <tr key={request.id}><td><b>REQ-{request.id.slice(0, 8).toUpperCase()}</b></td><td><b>{request.customer?.name || "—"}</b><small className="table-subtext">{request.customer?.email}</small><small className="table-subtext">{request.customer?.phone}</small></td><td>{(Array.isArray(request.items) ? request.items : []).map((item) => item && typeof item.productId === "string" ? `${Number(item.quantity) || 0}× ${productNames.get(item.productId) || item.productId}` : "Invalid item").join(", ")}</td><td>{formatDate(request.createdAt)}</td><td><div className="status-action"><button type="button" disabled={busyOrder === request.id} onClick={() => reviewRequest(request, "Approved")}>{busyOrder === request.id ? "Working…" : "Approve"}</button><button type="button" disabled={busyOrder === request.id} onClick={() => reviewRequest(request, "Rejected")}>Reject</button></div></td></tr>)}</tbody></table></div>}
      </section>
      <section className="admin-panel admin-orders-table">
        {loading ? <LoadingState label="Loading orders..." /> : error ? <ErrorState message={error} onRetry={reload} /> : !filtered.length ? <EmptyState title="No matching orders" message="Try clearing your filters." /> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>PLACED</th><th>ITEMS</th><th>TOTAL</th><th>STATUS / ACTION</th></tr></thead><tbody>{filtered.map((order) => <tr key={order.id}><td><button className="table-order-link" onClick={() => setSelectedOrder(order)}><b>{order.orderNumber}</b></button><small className="table-subtext">{order.id.slice(0, 10)}…</small></td><td><b>{order.customer?.name || "—"}</b><small className="table-subtext">{order.customer?.email}</small></td><td>{formatDate(order.createdAt)}</td><td>{order.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0}</td><td><b>{formatPrice(order.total)}</b></td><td><div className="status-action"><span className={`status-pill status-${order.status.toLowerCase()}`}>{order.status}</span><select aria-label={`Update status for ${order.orderNumber}`} value="" disabled={busyOrder === order.id || !STATUS_NEXT[order.status]?.length} onChange={(event) => updateStatus(order, event.target.value)}><option value="">{busyOrder === order.id ? "Updating…" : "Update"}</option>{(STATUS_NEXT[order.status] || []).map((status) => <option key={status}>{status}</option>)}</select></div></td></tr>)}</tbody></table></div>}
      </section>
      <p className="analytics-footnote"><ShieldCheck size={14} /> Approvals recheck live catalog prices and stock in a Firestore transaction. Inventory is reserved only after approval; cancelling returns it to stock.</p>
      {selectedOrder && <div className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedOrder(null); }}><section className="admin-order-modal" role="dialog" aria-modal="true" aria-labelledby="admin-order-title"><div className="panel-heading"><div><span className="eyebrow">{selectedOrder.orderNumber}</span><h2 id="admin-order-title">Order details</h2></div><button className="admin-close" onClick={() => setSelectedOrder(null)} aria-label="Close order details"><X size={18} /></button></div><div className="admin-modal-columns"><div><span className="eyebrow">CUSTOMER</span><b>{selectedOrder.customer?.name}</b><span>{selectedOrder.customer?.email}</span><span>{selectedOrder.customer?.phone}</span></div><div><span className="eyebrow">SHIP TO</span><span>{selectedOrder.shippingAddress?.address}</span><span>{selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.province} {selectedOrder.shippingAddress?.postalCode}</span><span>Philippines</span></div></div><div className="admin-modal-items">{(selectedOrder.items || []).map((item) => <div key={item.productId}><span>{item.quantity} × {item.name}</span><b>{formatPrice(item.lineTotal)}</b></div>)}</div><div className="summary-row"><span>Subtotal</span><b>{formatPrice(selectedOrder.subtotal)}</b></div><div className="summary-row"><span>Shipping</span><b>{selectedOrder.shippingFee ? formatPrice(selectedOrder.shippingFee) : "FREE"}</b></div><div className="summary-total"><span>Total · {selectedOrder.paymentMethod}</span><b>{formatPrice(selectedOrder.total)}</b></div>{selectedOrder.paymentNotice && <small className="payment-warning">{selectedOrder.paymentNotice}</small>}</section></div>}
    </div>
  );
}

const EMPTY_FORM = {
  name: "", category: "Sneakers", brand: "", price: "", sku: "", stock: "",
  description: "", image: "", specifications: "{\n  \"Specification\": \"Value\"\n}",
  featured: false, published: true,
};

export function AdminProductsPage() {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [catalogNotice, setCatalogNotice] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const reload = () => {
    setLoading(true);
    setError("");
    getDocs(query(collection(db, "products"), orderBy("name", "asc")))
      .then((snapshot) => {
        const merged = new Map(catalogProducts.map((product) => [product.id, { ...product, localOnly: true }]));
        snapshot.docs.forEach((entry) => merged.set(entry.id, { id: entry.id, ...entry.data(), localOnly: false }));
        const loadedProducts = [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
        setProducts(loadedProducts);
        setCatalogNotice(snapshot.empty
          ? "Showing the bundled catalog. Product edits are saved to Firestore."
          : loadedProducts.some((product) => product.localOnly)
            ? "Bundled catalog products are shown alongside Firestore products. Edits are saved to Firestore."
            : "");
      })
      .catch((issue) => {
        console.error("Could not load Firestore products; showing the bundled catalog.", issue);
        setProducts(catalogProducts.map((product) => ({ ...product, localOnly: true })));
        setCatalogNotice("Firestore products could not be loaded. Showing the bundled catalog; edits require a working Firestore connection.");
        setError("");
      })
      .finally(() => setLoading(false));
  };
  useEffect(reload, []);
  const filtered = products.filter((product) => `${product.name} ${product.brand} ${product.sku}`.toLowerCase().includes(search.toLowerCase()));
  const startCreate = () => { setEditing(null); setImageFile(null); setForm(EMPTY_FORM); setEditorOpen(true); };
  const startEdit = (product) => {
    setEditing(product.id);
    setEditorOpen(true);
    setImageFile(null);
    setForm({
      name: product.name || "",
      category: product.category || "Sneakers",
      brand: product.brand || "",
      price: product.price ?? "",
      sku: product.sku || "",
      stock: product.stock ?? 0,
      description: product.description || "",
      image: product.image || "",
      specifications: JSON.stringify(product.specifications || {}, null, 2),
      featured: Boolean(product.featured),
      published: product.published !== false,
    });
  };
  const change = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      let image = form.image.trim();
      if (imageFile) {
        if (imageFile.size > 5 * 1024 * 1024 || !imageFile.type.startsWith("image/")) {
          throw new Error("Choose an image file smaller than 5 MB.");
        }
        const path = `product-images/${Date.now()}-${imageFile.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
        const uploaded = await uploadBytes(ref(storage, path), imageFile);
        image = await getDownloadURL(uploaded.ref);
      }
      const name = form.name.trim();
      const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const id = editing || slug;
      const specifications = JSON.parse(form.specifications);
      if (!specifications || Array.isArray(specifications) || typeof specifications !== "object") {
        throw new Error("Specifications must be a JSON object.");
      }
      if (!editing && products.some((product) => product.id === id)) {
        throw new Error("A product already uses this name. Choose a unique product name.");
      }
      const existing = products.find((product) => product.id === editing);
      const next = {
        id,
        name,
        slug,
        category: form.category,
        brand: form.brand.trim(),
        price: Number(form.price),
        sku: form.sku.trim(),
        stock: Number(form.stock),
        description: form.description.trim(),
        image,
        specifications,
        featured: form.featured,
        published: form.published,
        soldCount: Number(existing?.soldCount || 0),
        createdAt: existing?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (!Number.isSafeInteger(next.price) || next.price < 0 || !Number.isInteger(next.stock) || next.stock < 0) {
        throw new Error("Price and stock must be valid non-negative whole numbers.");
      }
      await setDoc(doc(db, "products", id), next);
      toast(editing ? "Product updated." : "Product added.");
      setEditing(null);
      setImageFile(null);
      setForm(EMPTY_FORM);
      setEditorOpen(false);
      reload();
    } catch (issue) {
      toast(errorMessage(issue), "error");
    } finally {
      setBusy(false);
    }
  };

  const removeProduct = async (product) => {
    if (fallbackProductIds.has(product.id)) {
      toast("Bundled catalog products cannot be deleted. Unpublish the product instead.", "error");
      return;
    }
    if (!window.confirm(`Delete "${product.name}" from the catalog?`)) return;
    try {
      await deleteDoc(doc(db, "products", product.id));
      toast("Product deleted.");
      reload();
    } catch (issue) {
      toast(errorMessage(issue), "error");
    }
  };

  const importBundledProducts = async () => {
    const missingProducts = products.filter((product) => product.localOnly);
    if (!missingProducts.length) return;
    setBusy(true);
    try {
      for (let start = 0; start < missingProducts.length; start += 450) {
        const batch = writeBatch(db);
        missingProducts.slice(start, start + 450).forEach((product) => {
          const { localOnly, ...catalogProduct } = product;
          batch.set(doc(db, "products", product.id), {
            ...catalogProduct,
            soldCount: Number(product.soldCount || 0),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        });
        await batch.commit();
      }
      toast(`${missingProducts.length} bundled products added to Firestore.`);
      reload();
    } catch (issue) {
      toast(errorMessage(issue), "error");
    } finally {
      setBusy(false);
    }
  };

  const updateBundledPhotos = async () => {
    const productsToUpdate = products.filter((product) => (
      !product.localOnly
      && bundledProductImages.has(product.id)
      && product.image !== bundledProductImages.get(product.id)
    ));
    if (!productsToUpdate.length) return;
    setBusy(true);
    try {
      for (let start = 0; start < productsToUpdate.length; start += 450) {
        const batch = writeBatch(db);
        productsToUpdate.slice(start, start + 450).forEach((product) => {
          batch.update(doc(db, "products", product.id), {
            image: bundledProductImages.get(product.id),
            updatedAt: serverTimestamp(),
          });
        });
        await batch.commit();
      }
      toast(`${productsToUpdate.length} catalog photos updated in Firestore.`);
      reload();
    } catch (issue) {
      toast(errorMessage(issue), "error");
    } finally {
      setBusy(false);
    }
  };

  const missingProductCount = products.filter((product) => product.localOnly).length;
  const photosNeedingUpdate = products.filter((product) => (
    !product.localOnly
    && bundledProductImages.has(product.id)
    && product.image !== bundledProductImages.get(product.id)
  )).length;

  return (
    <div className="admin-page">
      <div className="admin-page-heading"><div><span className="eyebrow">CATALOG MANAGEMENT</span><h1>Products</h1><p>Add, update, and curate the footwear in your storefront.</p></div><div className="flex flex-wrap gap-2"><button className="button button-outline" onClick={importBundledProducts} disabled={busy || !missingProductCount}>{busy ? "Working…" : `Add ${missingProductCount} bundled products to Firestore`}</button><button className="button button-outline" onClick={updateBundledPhotos} disabled={busy || !photosNeedingUpdate}>{busy ? "Working…" : `Update ${photosNeedingUpdate} product photos`}</button><button className="button button-primary" onClick={startCreate}><Plus size={16} /> Add product</button></div></div>
      <div className="admin-product-toolbar"><div className="admin-search"><Search size={16} /><input placeholder="Find a product" value={search} onChange={(event) => setSearch(event.target.value)} /></div><span>{products.length} catalog products</span></div>
      {catalogNotice && <div className="catalog-notice" role="status">{catalogNotice}</div>}
      {editorOpen ? <section className="admin-panel product-editor"><div className="panel-heading"><div><span className="eyebrow">{editing ? "EDIT CATALOG ITEM" : "NEW CATALOG ITEM"}</span><h2>{editing ? "Product details" : "Add a product"}</h2></div><button className="admin-close" onClick={() => setEditorOpen(false)} aria-label="Close editor"><X size={18} /></button></div><form onSubmit={save} className="product-editor-form">
        <label className="field-label">Product name<input name="name" value={form.name} onChange={change} required maxLength={140} /></label>
        <label className="field-label">Brand<input name="brand" value={form.brand} onChange={change} required /></label>
        <label className="field-label">Category<select name="category" value={form.category} onChange={change}>{["Sneakers", "Running", "Basketball", "Training", "Hiking", "Lifestyle", "Slides"].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="field-label">SKU<input name="sku" value={form.sku} onChange={change} required /></label>
        <label className="field-label">Price (PHP)<input name="price" type="number" min="0" step="1" value={form.price} onChange={change} required /></label>
        <label className="field-label">Stock quantity<input name="stock" type="number" min="0" step="1" value={form.stock} onChange={change} required /></label>
        <label className="field-label product-editor-full">Description<textarea name="description" rows="3" value={form.description} onChange={change} required /></label>
        <label className="field-label product-editor-full">Image URL<input name="image" type="url" value={form.image} onChange={change} placeholder="https://…" /></label>
        <label className="field-label product-editor-full upload-field"><span>Or upload a product image · max 5 MB</span><input type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0] || null)} /><small><FileImage size={14} /> {imageFile?.name || "PNG, JPG, WEBP"}</small></label>
        <label className="field-label product-editor-full">Specifications <textarea name="specifications" rows="5" value={form.specifications} onChange={change} required /></label>
        <div className="editor-checkboxes"><label><input type="checkbox" name="featured" checked={form.featured} onChange={change} /> Featured</label><label><input type="checkbox" name="published" checked={form.published} onChange={change} /> Published</label></div>
        <div className="product-editor-actions"><button type="button" className="button button-outline" onClick={() => setEditorOpen(false)}>Cancel</button><button type="submit" className="button button-primary" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Add product"} <Check size={15} /></button></div>
      </form></section> : <></>}
      <section className="admin-panel admin-products-list">
        {loading ? <LoadingState label="Loading products..." /> : error ? <ErrorState message={error} onRetry={reload} /> : !filtered.length ? <EmptyState title="No products found" message="Try another search or add your first catalog item." /> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>PRODUCT</th><th>SKU</th><th>PRICE</th><th>STOCK</th><th>VISIBILITY</th><th></th></tr></thead><tbody>{filtered.map((product) => <tr key={product.id}><td><div className="admin-product-cell"><ProductImage id={product.id} src={product.image} alt="" /><span><b>{product.name}</b><small>{product.brand} · {product.category}{product.localOnly ? " · Bundled catalog" : ""}</small></span></div></td><td>{product.sku}</td><td>{formatPrice(product.price)}</td><td><span className={product.stock < 6 ? "stock-low" : ""}>{product.stock}</span></td><td><span className={`status-pill ${product.published ? "status-published" : "status-draft"}`}>{product.published ? "Published" : "Draft"}</span></td><td><div className="table-actions"><button onClick={() => startEdit(product)}>Edit</button>{fallbackProductIds.has(product.id) ? <button disabled aria-label={`Cannot delete bundled catalog product ${product.name}`} title="Unpublish bundled products instead"><Trash2 size={15} /></button> : <button onClick={() => removeProduct(product)} aria-label={`Delete ${product.name}`}><Trash2 size={15} /></button>}</div></td></tr>)}</tbody></table></div>}
      </section>
      <p className="analytics-footnote"><ShieldCheck size={14} /> Product changes require the configured administrator account.</p>
    </div>
  );
}

function useAdminData() {
  const [state, setState] = useState({ orders: [], products: [], users: [], loading: true, error: "" });
  const reload = () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    Promise.all(["orders", "products", "users"].map(async (collectionName) => {
      try {
        return await getDocs(collection(db, collectionName));
      } catch (issue) {
        throw new Error(`Could not read the "${collectionName}" collection: ${issue.message || "Missing or insufficient permissions."}`);
      }
    })).then(([ordersSnapshot, productsSnapshot, usersSnapshot]) => {
      setState({
        orders: ordersSnapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })),
        products: productsSnapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })),
        users: usersSnapshot.docs,
        loading: false,
        error: "",
      });
    }).catch((issue) => setState((current) => ({
      ...current,
      loading: false,
      error: issue.message || "Could not load admin data.",
    })));
  };
  useEffect(reload, []);
  return { ...state, reload };
}

function dateValue(value) {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : new Date(0);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function localDateValue(value) {
  const date = dateValue(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getMonthlySales(orders) {
  const months = [];
  const now = new Date();
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    months.push({
      key,
      month: date.toLocaleDateString("en-PH", { month: "short" }),
      revenue: 0,
    });
  }
  const byMonth = new Map(months.map((month) => [month.key, month]));
  orders.forEach((order) => {
    const date = dateValue(order.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const month = byMonth.get(key);
    if (month) month.revenue += Number(order.total) || 0;
  });
  return months;
}

function SalesTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><small>{label}</small><b>{formatPrice(payload[0].value)}</b></div>;
}
