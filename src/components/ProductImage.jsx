import { useEffect, useState } from "react";
import { Footprints } from "lucide-react";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80";
export default function ProductImage({ src, alt, className = "" }) {
  const [image, setImage] = useState(src || FALLBACK_IMAGE);
  useEffect(() => {
    setImage(src || FALLBACK_IMAGE);
  }, [src]);

  return (
    image
      ? <img
          src={image}
          alt={alt}
          className={className}
          loading="lazy"
          onError={() => setImage((current) => current === FALLBACK_IMAGE ? "" : FALLBACK_IMAGE)}
        />
      : <div className={`image-placeholder ${className}`}><Footprints size={34} /></div>
  );
}
