import { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck, Truck } from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart, useToast } from "../context/StoreContext";
import { db } from "../firebase/client";
import { formatPrice, errorMessage } from "../utils/format";

const FREE_SHIPPING = 5000;
const SHIPPING_FEE = 150;

export default function CheckoutPage() {
  const { user, profile } = useAuth();
  const { lines, subtotal, clear } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    customerName: profile?.name || user?.displayName || "",
    phone: profile?.phone || "",
    address: "",
    city: "",
    province: "",
    postalCode: "",
    paymentMethod: "Cash on Delivery",
  });
  const shipping = subtotal >= FREE_SHIPPING ? 0 : SHIPPING_FEE;

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    if (!lines.length) {
      toast("Add an available product before checkout.", "error");
      return;
    }
    if (!db) {
      toast("Firebase is not configured.", "error");
      return;
    }
    setBusy(true);
    try {
      const request = await addDoc(collection(db, "orderRequests"), {
        uid: user.uid,
        customer: {
          name: form.customerName.trim(),
          email: user.email || "",
          phone: form.phone.trim(),
        },
        shippingAddress: {
          address: form.address.trim(),
          city: form.city.trim(),
          province: form.province.trim(),
          postalCode: form.postalCode.trim(),
          country: "Philippines",
        },
        paymentMethod: form.paymentMethod,
        items: lines.map(({ product, quantity }) => ({
          productId: product.id,
          name: product.name,
          quantity,
        })),
        status: "Pending approval",
        createdAt: serverTimestamp(),
      });
      clear();
      navigate(`/order-success/${request.id}`, { replace: true });
    } catch (issue) {
      toast(errorMessage(issue), "error");
    } finally {
      setBusy(false);
    }
  };

  if (!lines.length) {
    return <div className="container page-wrap"><div className="page-title"><span className="eyebrow">SECURE CHECKOUT</span><h1>Checkout</h1></div><div className="notice-box">Your cart has no available products.</div><Link to="/shop" className="button button-primary mt-5 w-fit">Return to the shop</Link></div>;
  }

  return (
    <div className="container page-wrap">
      <div className="checkout-top"><Link to="/cart"><ArrowLeft size={15} /> Back to cart</Link><span><LockKeyhole size={14} /> SECURE CHECKOUT</span></div>
      <div className="page-title"><span className="eyebrow">ONE LAST STEP</span><h1>Good choice.</h1><p>Where should we send your new favorites?</p></div>
      <form className="checkout-layout" onSubmit={submit}>
        <div className="checkout-form">
          <section className="checkout-card">
            <div className="checkout-section-heading"><span>01</span><div><h2>Contact details</h2><p>We'll use these details for order updates.</p></div></div>
            <div className="form-grid">
              <label className="field-label">Full name<input name="customerName" value={form.customerName} onChange={update} required maxLength={100} autoComplete="name" /></label>
              <label className="field-label">Email address<input type="email" value={user?.email || ""} readOnly /></label>
              <label className="field-label form-full">Contact number<input name="phone" type="tel" value={form.phone} onChange={update} required maxLength={30} autoComplete="tel" placeholder="+63 9XX XXX XXXX" /></label>
            </div>
          </section>
          <section className="checkout-card">
            <div className="checkout-section-heading"><span>02</span><div><h2>Shipping address</h2><p>Currently shipping within the Philippines.</p></div></div>
            <div className="form-grid">
              <label className="field-label form-full">House / street / barangay<input name="address" value={form.address} onChange={update} required maxLength={240} autoComplete="street-address" /></label>
              <label className="field-label">City / municipality<input name="city" value={form.city} onChange={update} required maxLength={100} autoComplete="address-level2" /></label>
              <label className="field-label">Province<input name="province" value={form.province} onChange={update} required maxLength={100} autoComplete="address-level1" /></label>
              <label className="field-label">Postal code<input name="postalCode" value={form.postalCode} onChange={update} required maxLength={20} autoComplete="postal-code" /></label>
              <div className="form-full shipping-confirm"><Truck size={16} /> Nationwide shipping estimate is shown in your order summary.</div>
            </div>
          </section>
          <section className="checkout-card">
            <div className="checkout-section-heading"><span>03</span><div><h2>Payment method</h2><p>Choose how you'd like to complete payment.</p></div></div>
            <label className={`payment-option ${form.paymentMethod === "Cash on Delivery" ? "payment-selected" : ""}`}><input type="radio" name="paymentMethod" value="Cash on Delivery" checked={form.paymentMethod === "Cash on Delivery"} onChange={update} /><span><b>Cash on Delivery</b><small>Pay when your order arrives.</small></span><span className="payment-icon"><Truck size={18} /></span></label>
            <label className={`payment-option ${form.paymentMethod === "GCash (manual demo)" ? "payment-selected" : ""}`}><input type="radio" name="paymentMethod" value="GCash (manual demo)" checked={form.paymentMethod === "GCash (manual demo)"} onChange={update} /><span><b>GCash · manual demo</b><small>No payment gateway is connected. No payment is processed.</small></span><span className="payment-icon gcash-icon">G</span></label>
          </section>
        </div>
        <aside className="order-summary checkout-summary">
          <div className="summary-head"><span className="eyebrow">YOUR ORDER</span><h2>Order summary</h2></div>
          <div className="checkout-items">{lines.map(({ product, quantity }) => <div key={product.id} className="checkout-item"><span className="checkout-item-qty">{quantity}</span><span>{product.name}</span><b>{formatPrice(product.price * quantity)}</b></div>)}</div>
          <div className="summary-row"><span>Subtotal</span><b>{formatPrice(subtotal)}</b></div>
          <div className="summary-row"><span>Shipping</span><b>{shipping ? formatPrice(shipping) : <em>FREE</em>}</b></div>
          <div className="summary-total"><span>Total</span><b>{formatPrice(subtotal + shipping)}</b></div>
          <p className="summary-note">This submits an order request. The admin confirms current prices and stock before approving it; inventory is not reserved yet. The prices above are estimates.</p>
          <button type="submit" className="button button-primary checkout-button" disabled={busy}>{busy ? "Submitting request…" : "Submit order request"}{!busy && <ArrowRight size={17} />}</button>
          <div className="checkout-assurance"><ShieldCheck size={16} /> Your order is finalized after admin approval.</div>
          <div className="checkout-assurance"><CheckCircle2 size={16} /> Sample catalog prices. No GCash gateway connected.</div>
        </aside>
      </form>
    </div>
  );
}
