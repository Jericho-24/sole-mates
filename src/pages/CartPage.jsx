import { ArrowRight, ArrowUpRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart, useProducts } from "../context/StoreContext";
import ProductImage from "../components/ProductImage";
import { EmptyState, LoadingState } from "../components/Feedback";
import { formatPrice } from "../utils/format";

const FREE_SHIPPING = 5000;
const SHIPPING_FEE = 150;

export default function CartPage() {
  const { products, loading } = useProducts();
  const { items, lines, count, subtotal, setQuantity, remove } = useCart();
  const missing = Object.entries(items).filter(([id]) => !products.some((product) => product.id === id));
  const shipping = subtotal >= FREE_SHIPPING || subtotal === 0 ? 0 : SHIPPING_FEE;

  if (loading) return <div className="container page-wrap"><LoadingState label="Loading your cart..." /></div>;
  if (count === 0) return <div className="container page-wrap"><div className="page-title"><span className="eyebrow">YOUR PICKS</span><h1>Your cart</h1></div><EmptyState title="Your cart is waiting for a pair" message="Browse the collection and find a style that feels like you." /><Link to="/shop" className="button button-primary mx-auto mt-5 w-fit"><ShoppingBag size={17} /> Browse the shoes</Link></div>;

  return (
    <div className="container page-wrap">
      <div className="page-title"><span className="eyebrow">YOUR PICKS</span><h1>Your cart <small>({count} {count === 1 ? "item" : "items"})</small></h1></div>
      <div className="cart-layout">
        <div className="cart-list">
          {lines.map(({ product, quantity }) => (
            <article key={product.id} className="cart-line">
              <Link to={`/product/${product.slug}`} className="cart-thumb"><ProductImage id={product.id} src={product.image} alt={product.name} /></Link>
              <div className="cart-line-info"><span className="eyebrow">{product.brand} / {product.category}</span><Link to={`/product/${product.slug}`} className="cart-line-name">{product.name}</Link><span className="cart-sku">SKU {product.sku}</span><span className={`cart-availability ${quantity > product.stock ? "text-red-400" : ""}`}>{product.stock ? `${product.stock} in stock` : "Unavailable"}</span></div>
              <div className="quantity-control"><button aria-label="Decrease quantity" onClick={() => setQuantity(product.id, quantity - 1)}><Minus size={13} /></button><span>{quantity}</span><button aria-label="Increase quantity" disabled={quantity >= product.stock || quantity >= 10} onClick={() => setQuantity(product.id, quantity + 1)}><Plus size={13} /></button></div>
              <div className="cart-line-price"><b>{formatPrice(product.price * quantity)}</b><small>{formatPrice(product.price)} each</small></div>
              <button className="remove-button" onClick={() => remove(product.id)} aria-label={`Remove ${product.name}`}><Trash2 size={17} /></button>
            </article>
          ))}
          {missing.map(([id]) => (
            <article key={id} className="cart-line cart-line-unavailable"><div className="cart-thumb cart-missing"><ShoppingBag size={23} /></div><div className="cart-line-info"><b>Product unavailable</b><span className="cart-sku">This item was removed from the catalog.</span></div><button className="remove-button" onClick={() => remove(id)} aria-label="Remove unavailable product"><Trash2 size={17} /></button></article>
          ))}
          <div className="cart-continue"><Link to="/shop"><ArrowRight className="rotate-180" size={15} /> Continue shopping</Link><span>Sample prices · PHP</span></div>
        </div>
        <aside className="order-summary">
          <div className="summary-head"><span className="eyebrow">ORDER SUMMARY</span><h2>Almost yours.</h2></div>
          <div className="shipping-meter"><span>{subtotal >= FREE_SHIPPING ? "You've unlocked free shipping" : `Add ${formatPrice(FREE_SHIPPING - subtotal)} for free shipping`}</span><div><i style={{ width: `${Math.min(100, subtotal / FREE_SHIPPING * 100)}%` }} /></div></div>
          <div className="summary-row"><span>Subtotal <small>({count} items)</small></span><b>{formatPrice(subtotal)}</b></div>
          <div className="summary-row"><span>Shipping</span><b>{shipping ? formatPrice(shipping) : <em>FREE</em>}</b></div>
          <div className="summary-total"><span>Estimated total</span><b>{formatPrice(subtotal + shipping)}</b></div>
          <p className="summary-note">Final prices and inventory are rechecked securely at checkout.</p>
          <Link to="/checkout" className="button button-primary checkout-button" aria-disabled={!lines.length}><span>Continue to checkout</span><ArrowUpRight size={17} /></Link>
          <div className="payment-note">Cash on delivery and GCash manual demo available at checkout.</div>
        </aside>
      </div>
    </div>
  );
}
