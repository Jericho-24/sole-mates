import { Activity, ArrowRight, ArrowUpRight, BadgeCheck, Dumbbell, Footprints, Mountain, ShieldCheck, Sparkles, Sun, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { useProducts } from "../context/StoreContext";
import ProductGrid from "../components/ProductGrid";

const categoryData = [
  { name: "Sneakers", icon: Footprints, caption: "Everyday, done differently" },
  { name: "Running", icon: Activity, caption: "Find your own pace" },
  { name: "Basketball", icon: BadgeCheck, caption: "Made for the court" },
  { name: "Training", icon: Dumbbell, caption: "Show up. Move more." },
  { name: "Hiking", icon: Mountain, caption: "Take the scenic route" },
  { name: "Slides", icon: Sun, caption: "Off-duty comfort" },
];

export default function HomePage() {
  const { products, loading, error, catalogNotice } = useProducts();
  const featured = products.filter((product) => product.featured).slice(0, 4);
  const bestSellers = [...products]
    .sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0))
    .slice(0, 4);

  return (
    <>
      <section className="hero-section sole-hero">
        <div className="hero-background" />
        <div className="hero-grid-pattern" />
        <div className="container hero-content">
          <div className="hero-copy">
            <div className="hero-kicker"><span className="pulse-dot" /> YOUR STYLE. YOUR STRIDE.</div>
            <h1>Find your<br /><span>next pair.</span></h1>
            <p>Fresh kicks for early starts, long days, and all the little detours in between. Meet the pair that moves with you.</p>
            <div className="hero-actions">
              <Link to="/shop" className="button button-primary">Shop the collection <ArrowRight size={17} /></Link>
              <a href="#categories" className="button button-ghost">Find your fit</a>
            </div>
            <div className="hero-proof"><span><BadgeCheck size={16} /> Handpicked styles</span><span><Truck size={16} /> Ships across PH</span></div>
          </div>
          <div className="hero-visual">
            <div className="hero-image-wrap"><img src="https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=1200&q=90" alt="A fresh pair of sneakers ready for the day" /></div>
            <div className="hero-float hero-float-top"><span className="float-icon"><Sparkles size={17} /></span><span><b>New season energy</b><small>Good things start with a step</small></span></div>
            <div className="hero-float hero-float-bottom"><span className="float-icon"><Footprints size={18} /></span><span><b>Comfort that goes places</b><small>Made for your kind of day</small></span></div>
            <div className="hero-index">SM Nº 01 <span>— MADE TO MOVE</span></div>
          </div>
        </div>
        <div className="container hero-bottom"><span>FIND YOUR NEXT PAIR</span><span>STEP / STYLE / REPEAT</span></div>
      </section>

      <section className="section container" id="categories">
        <div className="section-heading">
          <div><span className="eyebrow">PICK YOUR PACE</span><h2>Shop by style</h2><p>Find the right pair for wherever the day takes you.</p></div>
          <Link className="text-link" to="/shop">Explore all shoes <ArrowUpRight size={16} /></Link>
        </div>
        <div className="category-grid">
          {categoryData.map(({ name, icon: Icon, caption }, index) => (
            <Link to={`/shop?category=${encodeURIComponent(name)}`} key={name} className={`category-tile category-tone-${index}`}>
              <div className="category-icon"><Icon size={22} /></div><div><h3>{name}</h3><span>{caption}</span></div><ArrowUpRight size={17} className="category-arrow" />
            </Link>
          ))}
        </div>
      </section>

      <section className="section section-muted">
        <div className="container">
          <div className="section-heading">
            <div><span className="eyebrow">THE GOOD STUFF</span><h2>Fresh arrivals</h2><p>New favorites, handpicked for your everyday rotation.</p></div>
            <Link className="text-link" to="/shop?featured=true">Shop new arrivals <ArrowUpRight size={16} /></Link>
          </div>
          <ProductGrid products={featured} loading={loading} error={error} notice={catalogNotice} emptyTitle="Fresh arrivals are on the way" emptyMessage="New styles will appear here when the collection is ready." />
        </div>
      </section>

      <section className="section container">
        <div className="section-heading">
          <div><span className="eyebrow">GOOD TASTE TRAVELS</span><h2>Most-loved pairs</h2><p>Customer favorites that are ready for a place in your rotation.</p></div>
          <Link className="text-link" to="/shop">See all styles <ArrowUpRight size={16} /></Link>
        </div>
        <ProductGrid products={bestSellers} loading={loading} error={error} compact emptyTitle="Your next favorite is waiting" emptyMessage="Popular styles will appear as the Sole Mates collection grows." />
      </section>

      <section className="container promo-banner sole-promo">
        <div className="promo-art"><img src="https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=1000&q=85" alt="A clean pair of everyday sneakers" /></div>
        <div className="promo-copy">
          <span className="eyebrow"><Sparkles size={14} /> YOUR EVERYDAY ROTATION</span>
          <h2>Make room<br /><span>for one more pair.</span></h2>
          <p>From first coffee to last call, find a style that feels good from the very first step.</p>
          <Link to="/shop" className="button button-primary">Meet your next pair <ArrowRight size={17} /></Link>
          <small>Catalog prices and availability are sample data. Check product details for sizing and materials.</small>
        </div>
        <div className="promo-mark">SOLE / MATES</div>
      </section>

      <section className="section section-muted">
        <div className="container why-grid">
          <div className="why-intro"><span className="eyebrow">THE SOLE MATES WAY</span><h2>Good shoes.<br /><span>Good days.</span></h2><p>Finding your next favorite pair should feel easy. Explore styles, compare the details, and choose what feels right for you.</p><Link className="text-link" to="/shop">Find your everyday pair <ArrowRight size={16} /></Link></div>
          <div className="why-card"><div className="why-number">01</div><Footprints size={23} /><h3>Made for your day</h3><p>From first steps to last errands, discover pairs for your own pace.</p></div>
          <div className="why-card"><div className="why-number">02</div><Truck size={23} /><h3>Ready for your doorstep</h3><p>Delivery details for shipping across the Philippines.</p></div>
          <div className="why-card"><div className="why-number">03</div><ShieldCheck size={23} /><h3>Details that matter</h3><p>Explore materials, fit notes, and features before you choose.</p></div>
        </div>
      </section>
    </>
  );
}
