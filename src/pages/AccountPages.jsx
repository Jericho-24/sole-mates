import { useEffect, useState } from "react";
import { collection, doc, getDoc, onSnapshot, query, where } from "firebase/firestore";
import { ArrowRight, BadgeCheck, ChevronRight, CircleUserRound, Clock3, LogOut, Package, ShieldCheck, Truck } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/client";
import { EmptyState, ErrorState, LoadingState } from "../components/Feedback";
import { errorMessage, formatDate, formatPrice } from "../utils/format";
import { ADMIN_UID } from "../utils/admin";

const ORDER_STEPS = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered"];

function dateValue(value) {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : new Date(0);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function OrderProgress({ status }) {
  const activeStep = ORDER_STEPS.indexOf(status);
  if (status === "Cancelled") {
    return <p className="order-tracking-note order-tracking-cancelled">This order was cancelled.</p>;
  }
  return (
    <div className="order-progress" aria-label={`Order progress: ${status}`}>
      {ORDER_STEPS.map((step, index) => (
        <div key={step} className={`order-progress-step ${index <= activeStep ? "order-progress-step-done" : ""}`}>
          <span>{index < activeStep ? <BadgeCheck size={12} /> : index + 1}</span>
          <small>{step}</small>
        </div>
      ))}
    </div>
  );
}

export function AccountPage() {
  const { user, profile, isAdmin, updateProfile, logout } = useAuth();
  const [name, setName] = useState(profile?.name || user?.displayName || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    setName(profile?.name || user?.displayName || "");
    setPhone(profile?.phone || "");
  }, [profile, user]);

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await updateProfile({ name, phone });
      setNotice("Your profile has been updated.");
    } catch (issue) {
      setError(errorMessage(issue));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container page-wrap account-page">
      <div className="page-title"><span className="eyebrow">YOUR ACCOUNT</span><h1>Your account.</h1><p>Manage your profile and keep an eye on your orders.</p></div>
      <div className="account-layout">
        <aside className="account-nav"><div className="account-avatar"><CircleUserRound size={27} /></div><b>{profile?.name || user?.displayName || "Shoe lover"}</b><span>{user?.email}</span><div className="account-nav-label">YOUR ACCOUNT</div><Link className="account-nav-link active" to="/account"><CircleUserRound size={16} /> Profile</Link><Link className="account-nav-link" to="/account/orders"><Package size={16} /> My orders</Link>{isAdmin && <div className="account-admin-area"><span><ShieldCheck size={14} /> STORE ADMIN</span><Link className="account-nav-link account-admin-link" to="/admin">Open admin console <ArrowRight size={14} /></Link></div>}<button className="account-nav-link account-signout" onClick={async () => { await logout(); navigate("/"); }}><LogOut size={16} /> Sign out</button></aside>
        <div className="account-content"><section className="account-card"><div className="account-card-head"><span className="eyebrow">PROFILE DETAILS</span><BadgeCheck size={19} /></div><h2>About you</h2><p>Keep your contact details up to date for smoother checkout.</p>{error && <div className="form-alert">{error}</div>}{notice && <div className="form-success">{notice}</div>}
          <form onSubmit={save} className="account-form"><label className="field-label">Full name<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} /></label><label className="field-label">Email address<input value={user?.email || ""} readOnly /><small>Email is managed by Firebase Authentication.</small></label><label className="field-label">Contact number<input value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={30} placeholder="+63 9XX XXX XXXX" /></label><button className="button button-primary" disabled={busy}>{busy ? "Saving…" : "Save changes"} <ArrowRight size={15} /></button></form>
        </section><div className="account-side-note"><ShieldCheck size={18} /><div><b>{isAdmin ? "Administrator access enabled" : "Administrator access not enabled"}</b><span>Signed-in UID: {user.uid === ADMIN_UID ? "matches the configured administrator" : "does not match the configured administrator"}.</span>{user.uid !== ADMIN_UID && <span>Current UID: {user.uid}</span>}<span>Required administrator UID: {ADMIN_UID}</span>{isAdmin && <Link className="account-nav-link account-admin-link" to="/admin">Open admin console <ArrowRight size={14} /></Link>}</div></div></div>
      </div>
    </div>
  );
}

export function OrderHistoryPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let orderItems;
    let requestItems;
    const updateHistory = () => {
      if (!orderItems || !requestItems) return;
      const placedOrderIds = new Set(orderItems.map((order) => order.id));
      const activeRequests = requestItems.filter((request) => !request.orderId || !placedOrderIds.has(request.orderId));
      setOrders([...orderItems, ...activeRequests].sort((a, b) => dateValue(b.createdAt) - dateValue(a.createdAt)));
      setLoading(false);
    };
    const handleError = (issue) => {
      setError(issue.message || "Could not load your orders.");
      setLoading(false);
    };
    const unsubscribeOrders = onSnapshot(
      query(collection(db, "orders"), where("uid", "==", user.uid)),
      (snapshot) => {
        orderItems = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
        updateHistory();
      },
      handleError,
    );
    const unsubscribeRequests = onSnapshot(
      query(collection(db, "orderRequests"), where("uid", "==", user.uid)),
      (snapshot) => {
        requestItems = snapshot.docs.map((entry) => ({
          id: entry.id,
          ...entry.data(),
          isRequest: true,
        }));
        updateHistory();
      },
      handleError,
    );
    return () => {
      unsubscribeOrders();
      unsubscribeRequests();
    };
  }, [user]);

  return (
    <div className="container page-wrap">
      <div className="page-title"><span className="eyebrow">LIVE ORDER TRACKING</span><h1>Track your orders.</h1><p>See each item you requested and its current approval or delivery status.</p></div>
      {loading ? <LoadingState label="Loading your orders..." /> : error ? <ErrorState message={error} /> : !orders.length ? <EmptyState title="No orders yet" message="Your next favorite pair is waiting in the shop." /> : (
        <div className="order-tracking-list">{orders.map((order) => {
          const items = Array.isArray(order.items) ? order.items : [];
          const detailPath = order.isRequest
            ? order.orderId
              ? `/account/orders/${order.orderId}`
              : `/account/orders/${order.id}?source=request`
            : `/account/orders/${order.id}`;
          return (
            <Link key={`${order.isRequest ? "request" : "order"}-${order.id}`} to={detailPath} className="order-tracking-card">
              <div className="order-tracking-heading">
                <div className="order-history-icon"><Package size={20} /></div>
                <div className="order-tracking-title">
                  <span className="eyebrow">{order.orderNumber || `REQ-${order.id.slice(0, 8).toUpperCase()}`}</span>
                  <b>{order.isRequest ? "Order request" : "Order"} · {formatDate(order.createdAt)}</b>
                </div>
                <span className={`status-pill status-${order.status?.toLowerCase().replaceAll(" ", "-")}`}>{order.status}</span>
              </div>
              <div className="order-tracking-items">
                {items.map((item) => (
                  <div className="order-tracking-item" key={item.productId}>
                    <span className="order-item-qty">{item.quantity}×</span>
                    <b>{item.name || item.productId}</b>
                    <span className={`status-pill status-${order.status?.toLowerCase().replaceAll(" ", "-")}`}>{order.status}</span>
                    {item.unitPrice != null && <strong>{formatPrice(item.lineTotal)}</strong>}
                  </div>
                ))}
              </div>
              {order.isRequest ? (
                <p className={`order-tracking-note ${order.status === "Rejected" ? "order-tracking-cancelled" : ""}`}>
                  {order.status === "Pending approval"
                    ? "Waiting for the admin to confirm product availability and pricing."
                    : order.status === "Rejected"
                      ? "This request was not approved. Contact the store if you need more information."
                      : order.status}
                </p>
              ) : (
                <>
                  <p className="order-tracking-note">Shipment status applies to every item in this order.</p>
                  <OrderProgress status={order.status} />
                </>
              )}
              <div className="order-tracking-footer">
                <span>{order.total != null ? `Order total · ${formatPrice(order.total)}` : "Final price shown after approval"}</span>
                <span>View status details <ChevronRight size={14} /></span>
              </div>
            </Link>
          );
        })}</div>
      )}
    </div>
  );
}

export function OrderDetailPage() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const source = searchParams.get("source");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setOrder(null);

    const loadOrder = async () => {
      try {
        if (source !== "request") {
          let orderSnapshot;
          try {
            orderSnapshot = await getDoc(doc(db, "orders", orderId));
          } catch (issue) {
            if (issue.code !== "permission-denied") throw issue;
          }
          if (orderSnapshot?.exists() && orderSnapshot.data().uid === user.uid) {
            if (active) setOrder({ id: orderSnapshot.id, ...orderSnapshot.data() });
            return;
          }
        }

        const requestSnapshot = await getDoc(doc(db, "orderRequests", orderId));
        if (!requestSnapshot.exists() || requestSnapshot.data().uid !== user.uid) {
          if (active) setError("This order was not found in your account.");
        } else if (active) {
          setOrder({ id: requestSnapshot.id, ...requestSnapshot.data(), isRequest: true });
        }
      } catch (issue) {
        if (active) setError(issue.message || "Could not load this order.");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadOrder();
    return () => {
      active = false;
    };
  }, [orderId, source, user]);

  if (loading) return <div className="container page-wrap"><LoadingState label="Loading your order..." /></div>;
  if (error) return <div className="container page-wrap"><ErrorState message={error} /></div>;
  if (!order) return null;
  if (order.isRequest) {
    return (
      <div className="container page-wrap">
        <Link to="/account/orders" className="back-link"><ArrowRight className="rotate-180" size={15} /> All orders</Link>
        <div className="order-detail-heading"><div><span className="eyebrow">REQ-{order.id.slice(0, 8).toUpperCase()}</span><h1>Order request</h1><p>Submitted on {formatDate(order.createdAt)}</p></div><span className={`status-pill status-${order.status.toLowerCase().replaceAll(" ", "-")}`}>{order.status}</span></div>
        <div className="tracking-card"><div className="tracking-head"><Clock3 size={20} /><div><b>{order.status === "Pending approval" ? "Waiting for admin review" : order.status}</b><span>Current prices and stock are checked when the admin reviews this request.</span></div></div></div>
        {order.status === "Approved" && order.orderId && <Link className="button button-primary" to={`/account/orders/${order.orderId}`}>View approved order <ArrowRight size={15} /></Link>}
        <section className="account-card"><span className="eyebrow">REQUESTED ITEMS</span>{(order.items || []).map((item) => <div key={item.productId} className="order-detail-item"><span className="order-item-qty">{item.quantity}×</span><div><b>{item.name || item.productId}</b><small>Price confirmed after admin review</small></div></div>)}</section>
      </div>
    );
  }
  const activeStep = ORDER_STEPS.indexOf(order.status);

  return (
    <div className="container page-wrap">
      <Link to="/account/orders" className="back-link"><ArrowRight className="rotate-180" size={15} /> All orders</Link>
      <div className="order-detail-heading"><div><span className="eyebrow">{order.orderNumber}</span><h1>Order details</h1><p>Placed on {formatDate(order.createdAt)}</p></div><span className={`status-pill status-${order.status.toLowerCase()}`}>{order.status}</span></div>
      {order.status === "Cancelled" ? <div className="order-cancelled"><Clock3 size={18} /> This order was cancelled. Inventory was returned to stock.</div> : <div className="tracking-card"><div className="tracking-head"><Truck size={20} /><div><b>Order progress</b><span>Current status: {order.status}</span></div></div><div className="tracking-steps">{ORDER_STEPS.map((step, index) => <div key={step} className={`tracking-step ${index <= activeStep ? "tracking-step-done" : ""}`}><span>{index < activeStep ? <BadgeCheck size={15} /> : index + 1}</span><small>{step}</small></div>)}</div></div>}
      <div className="order-detail-layout"><section className="account-card"><span className="eyebrow">ITEMS IN THIS ORDER</span>{order.items?.map((item) => <div key={item.productId} className="order-detail-item"><span className="order-item-qty">{item.quantity}×</span><div><b>{item.name}</b><small>{formatPrice(item.unitPrice)} each</small></div><strong>{formatPrice(item.lineTotal)}</strong></div>)}<div className="summary-row"><span>Subtotal</span><b>{formatPrice(order.subtotal)}</b></div><div className="summary-row"><span>Shipping</span><b>{order.shippingFee ? formatPrice(order.shippingFee) : "FREE"}</b></div><div className="summary-total"><span>Total</span><b>{formatPrice(order.total)}</b></div></section><aside className="account-card order-address"><span className="eyebrow">DELIVERY & PAYMENT</span><h3>{order.customer?.name}</h3><p>{order.shippingAddress?.address}<br />{order.shippingAddress?.city}, {order.shippingAddress?.province} {order.shippingAddress?.postalCode}</p><p>{order.customer?.phone}<br />{order.customer?.email}</p><div className="payment-summary"><span>Payment method</span><b>{order.paymentMethod}</b></div>{order.paymentNotice && <small className="payment-warning">{order.paymentNotice}</small>}</aside></div>
    </div>
  );
}
