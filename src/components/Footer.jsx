import { ArrowRight, Footprints, Github, Instagram, Mail, ShieldCheck, Truck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-benefits">
          <div><Truck size={20} /><span><b>Delivered nationwide</b><small>Carefully packed, right to your door</small></span></div>
          <div><ShieldCheck size={20} /><span><b>Shop with confidence</b><small>Product details at every step</small></span></div>
          <div><Sparkles size={20} /><span><b>Fresh picks, always</b><small>Styles for wherever life takes you</small></span></div>
        </div>
        <div className="footer-main">
          <div className="footer-brand">
            <Link to="/" className="brand-lockup">
              <span className="brand-mark"><Footprints size={19} /></span>
              <span className="brand-name">SOLE<span>MATES</span><small>FIND YOUR NEXT PAIR</small></span>
            </Link>
            <p>Good shoes take you places. Find a pair that feels like you.</p>
            <div className="social-links"><a href="mailto:hello@solemates.example" aria-label="Email us"><Mail size={17} /></a><a href="https://instagram.com" aria-label="Instagram"><Instagram size={17} /></a><a href="https://github.com" aria-label="GitHub"><Github size={17} /></a></div>
          </div>
          <div><h4>Explore</h4><Link to="/shop">Shop all shoes</Link><Link to="/shop?featured=true">New arrivals</Link><Link to="/cart">Your cart</Link></div>
          <div><h4>Account</h4><Link to="/account">My profile</Link><Link to="/account/orders">Order history</Link><Link to="/login">Sign in</Link></div>
          <div className="footer-news"><h4>Go your own way</h4><p>Find a pair for everyday plans and wherever they take you.</p><Link to="/shop">Explore the collection <ArrowRight size={13} /></Link><small>Check each product for sizing and material details before purchase.</small></div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Sole Mates. Made to move with you.</span>
          <span>Sample catalog pricing · Philippine pesos</span>
        </div>
      </div>
    </footer>
  );
}
