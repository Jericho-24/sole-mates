import { ArrowLeft, ArrowRight, Compass } from "lucide-react";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="container not-found-page">
      <div className="not-found-mark"><Compass size={28} /></div>
      <span className="eyebrow">ERROR / 404</span>
      <h1>This page<br /><span>is off the map.</span></h1>
      <p>The link may be outdated, or this style has moved.</p>
      <div><Link to="/" className="button button-primary"><ArrowLeft size={16} /> Back home</Link><Link to="/shop" className="button button-outline">Explore the shop <ArrowRight size={16} /></Link></div>
    </div>
  );
}
