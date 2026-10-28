import { useState } from "react";
import { ChevronDown, Footprints, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/StoreContext";

const categories = ["Sneakers", "Running", "Basketball", "Training", "Hiking", "Lifestyle", "Slides"];

export default function Header() {
  const { user, isAdmin, logout } = useAuth();
  const { count } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const submitSearch = (event) => {
    event.preventDefault();
    navigate(`/shop${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ""}`);
    setMenuOpen(false);
  };

  return (
    <>
      <header className="site-header">
        <div className="container header-main">
          <button className="mobile-menu icon-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
          <Link to="/" className="brand-lockup" aria-label="Sole Mates home">
            <span className="brand-mark"><Footprints size={21} /></span>
            <span className="brand-name">SOLE<span>MATES</span><small>FIND YOUR NEXT PAIR</small></span>
          </Link>

          <form className="header-search" onSubmit={submitSearch}>
            <Search size={18} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search sneakers, styles, or brands..." />
            <button type="submit">Search</button>
          </form>

          <div className="header-actions">
            <Link to={user ? "/account" : "/login"} className="header-action">
              <UserRound size={20} />
              <span>{user ? "Account" : "Sign in"}</span>
            </Link>
            <Link to="/cart" className="header-action cart-action">
              <span className="cart-icon-wrap"><ShoppingBag size={20} /><b>{count}</b></span>
              <span>Cart</span>
            </Link>
          </div>
        </div>
        <nav className={`category-nav ${menuOpen ? "category-nav-open" : ""}`}>
          <div className="container nav-inner">
            <NavLink to="/shop" onClick={() => setMenuOpen(false)} className="nav-all">Shop all <ChevronDown size={14} /></NavLink>
            {categories.slice(0, 7).map((category) => (
              <NavLink key={category} to={`/shop?category=${encodeURIComponent(category)}`} onClick={() => setMenuOpen(false)}>
                {category}
              </NavLink>
            ))}
            <NavLink to="/shop?featured=true" className="nav-deals" onClick={() => setMenuOpen(false)}>New arrivals <span>↗</span></NavLink>
            {user && (
              <div className="mobile-account-links">
                <NavLink to="/account/orders" onClick={() => setMenuOpen(false)}>My orders</NavLink>
                {isAdmin && <NavLink to="/admin" onClick={() => setMenuOpen(false)}>Admin dashboard</NavLink>}
                <button onClick={async () => { await logout(); setMenuOpen(false); }}>Sign out</button>
              </div>
            )}
          </div>
        </nav>
      </header>
    </>
  );
}
