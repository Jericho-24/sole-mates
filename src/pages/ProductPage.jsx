import { useMemo } from "react";
import { ArrowRight, Check, ChevronRight, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useProducts, useCart, useToast } from "../context/StoreContext";
import { EmptyState, LoadingState } from "../components/Feedback";
import ProductImage from "../components/ProductImage";
import ProductGrid from "../components/ProductGrid";
import { formatPrice } from "../utils/format";

export default function ProductPage() {
  const { slug } = useParams();
  const { products, loading, error, catalogNotice } = useProducts();
  const { add } = useCart();
  const toast = useToast();
  const product = products.find((entry) => entry.slug === slug);
  const related = useMemo(() => product ? products.filter((entry) => entry.category === product.category && entry.id !== product.id).slice(0, 4) : [], [products, product]);

  if (loading) return <div className="container page-wrap"><LoadingState label="Loading product details..." /></div>;
  if (error) return <div className="container page-wrap"><EmptyState title="Product details unavailable" message={error} /></div>;
  if (!product) return <div className="container page-wrap"><EmptyState title="We couldn't find that pair" message="It may have moved or sold out." /><Link className="button button-primary mx-auto mt-5 w-fit" to="/shop">Back to the shop</Link></div>;

  const onAdd = () => {
    try { add(product); toast("Added to your cart."); } catch (issue) { toast(issue.message, "error"); }
  };

  return (
    <>
      <div className="container page-wrap product-page">
        {catalogNotice && <div className="catalog-notice" role="status">{catalogNotice}</div>}
        <div className="breadcrumbs"><Link to="/">Home</Link><ChevronRight size={14} /><Link to={`/shop?category=${encodeURIComponent(product.category)}`}>{product.category}</Link><ChevronRight size={14} /><span>{product.name}</span></div>
        <div className="product-detail-layout">
          <div className="product-detail-image">
            {product.featured && <span className="product-badge">FEATURED</span>}
            <ProductImage id={product.id} src={product.image} alt={product.name} />
            <span className="image-caption">SOLE MATES / EVERYDAY SERIES</span>
          </div>
          <div className="product-detail-copy">
            <span className="eyebrow">{product.brand} <span className="eyebrow-divider">/</span> {product.category}</span>
            <h1>{product.name}</h1>
            <div className="product-sku">SKU <b>{product.sku}</b></div>
            <div className="detail-price">{formatPrice(product.price)} <span>PHP · Sample price</span></div>
            <p className="detail-description">{product.description}</p>
            <div className="availability"><i className={product.stock ? "availability-dot" : "availability-dot sold-out"} />{product.stock ? `${product.stock} available` : "Currently out of stock"}</div>
            <button onClick={onAdd} disabled={!product.stock} className="button button-primary detail-add"><ShoppingBag size={18} /> Add to cart <ArrowRight size={17} /></button>
            <div className="detail-trust"><span><Truck size={17} /> Nationwide shipping</span><span><ShieldCheck size={17} /> Fit and material details</span></div>
            <div className="specs-panel"><div className="specs-heading"><h3>Product details</h3><span>FIT / FEEL / MATERIAL</span></div>{Object.entries(product.specifications || {}).map(([key, value]) => <div key={key} className="spec-row"><span>{key}</span><b>{value}</b></div>)}</div>
          </div>
        </div>
        <div className="detail-disclaimer"><Check size={16} /> Prices and stock are sample data. Please check the product details and size information before ordering.</div>
      </div>
      <section className="section section-muted"><div className="container"><div className="section-heading"><div><span className="eyebrow">KEEP EXPLORING</span><h2>More to love</h2></div><Link to="/shop" className="text-link">View all shoes <ArrowRight size={15} /></Link></div><ProductGrid products={related} loading={false} error="" compact emptyTitle="No similar styles yet" emptyMessage="Explore the full collection to find your next favorite pair." /></div></section>
    </>
  );
}
