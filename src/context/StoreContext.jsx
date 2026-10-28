import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import catalogProducts from "../../data/products.json";
import { db, firebaseConfigured } from "../firebase/client";
import { useAuth } from "./AuthContext";

const ProductContext = createContext(null);
const CartContext = createContext(null);
const ToastContext = createContext(null);
const CART_KEY = "sole-mates-cart";
const localProducts = catalogProducts.filter((product) => product.published);

function readGuestCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "{}");
  } catch {
    return {};
  }
}

export function ProductProvider({ children }) {
  const [products, setProducts] = useState(() => (
    firebaseConfigured ? [] : localProducts
  ));
  const [loading, setLoading] = useState(firebaseConfigured);
  const [error, setError] = useState("");
  const [catalogNotice, setCatalogNotice] = useState(
    firebaseConfigured ? "" : "Showing the included catalog because Firebase is not configured.",
  );

  useEffect(() => {
    if (!firebaseConfigured) return undefined;
    return onSnapshot(
      query(collection(db, "products"), where("published", "==", true)),
      (snapshot) => {
        const firestoreProducts = snapshot.docs.map((product) => ({ id: product.id, ...product.data() }));
        if (firestoreProducts.length) {
          const merged = new Map(localProducts.map((product) => [product.id, product]));
          firestoreProducts.forEach((product) => merged.set(product.id, product));
          const missingProducts = localProducts.length - firestoreProducts.filter(
            (product) => localProducts.some((bundled) => bundled.id === product.id),
          ).length;
          setProducts([...merged.values()]);
          setCatalogNotice(missingProducts
            ? `Showing ${missingProducts} bundled shoes alongside your Firebase catalog.`
            : "");
        } else {
          setProducts(localProducts);
          setCatalogNotice("Showing the included catalog because no published products were found in Firebase.");
        }
        setError("");
        setLoading(false);
      },
      (snapshotError) => {
        console.error("Could not load the Firebase product catalog.", snapshotError);
        setProducts((current) => current.length ? current : localProducts);
        setCatalogNotice("Firebase products could not be loaded. Showing the included catalog instead.");
        setError("");
        setLoading(false);
      },
    );
  }, []);

  const value = useMemo(() => ({ products, loading, error, catalogNotice }), [products, loading, error, catalogNotice]);
  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
}

export function CartProvider({ children }) {
  const { user } = useAuth();
  const { products } = useProducts();
  const [items, setItems] = useState(readGuestCart);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) {
      setItems(readGuestCart());
      setReady(true);
      return () => { active = false; };
    }
    setReady(false);
    getDoc(doc(db, "carts", user.uid)).then((snapshot) => {
      if (!active) return;
      const guest = readGuestCart();
      const cloud = snapshot.exists() ? snapshot.data().items || {} : {};
      const merged = { ...cloud };
      Object.entries(guest).forEach(([id, quantity]) => {
        merged[id] = Math.min(10, (Number(merged[id]) || 0) + (Number(quantity) || 0));
      });
      setItems(merged);
      setReady(true);
    }).catch((error) => {
      console.error("Could not load your saved cart.", error);
      if (active) {
        setItems(readGuestCart());
        setReady(true);
      }
    });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    if (!user || !db) return;
    setDoc(doc(db, "carts", user.uid), { items, updatedAt: serverTimestamp() })
      .catch((error) => console.error("Could not sync your cart.", error));
  }, [items, ready, user]);

  useEffect(() => {
    if (!ready || !products.length) return;
    setItems((current) => {
      let changed = false;
      const next = { ...current };
      Object.entries(current).forEach(([id, quantity]) => {
        const product = products.find((entry) => entry.id === id);
        if (product && product.stock > 0 && quantity > product.stock) {
          next[id] = Math.min(product.stock, 10);
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [products, ready]);

  const add = (product, quantity = 1) => {
    if (!product || product.stock < 1) throw new Error("This product is out of stock.");
    setItems((current) => ({
      ...current,
      [product.id]: Math.min(product.stock, 10, (current[product.id] || 0) + quantity),
    }));
  };
  const setQuantity = (productId, quantity) => {
    const product = products.find((entry) => entry.id === productId);
    if (!product) return;
    if (quantity <= 0) {
      setItems((current) => {
        const next = { ...current };
        delete next[productId];
        return next;
      });
      return;
    }
    setItems((current) => ({ ...current, [productId]: Math.min(product.stock, 10, quantity) }));
  };
  const remove = (productId) => setItems((current) => {
    const next = { ...current };
    delete next[productId];
    return next;
  });
  const clear = () => setItems({});
  const lines = products
    .filter((product) => items[product.id])
    .map((product) => ({ product, quantity: items[product.id] }));
  const count = Object.values(items).reduce((sum, quantity) => sum + Number(quantity || 0), 0);
  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);

  const value = useMemo(() => ({
    items, lines, count, subtotal, add, setQuantity, remove, clear,
  }), [items, products, count, subtotal]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  return (
    <ToastContext.Provider value={setToast}>
      {children}
      {toast && (
        <div className={`toast ${toast.type === "error" ? "toast-error" : ""}`} role="status">
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductContext);
  if (!context) throw new Error("useProducts must be used inside ProductProvider.");
  return context;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider.");
  return context;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider.");
  return (message, type = "success") => context({ message, type });
}
