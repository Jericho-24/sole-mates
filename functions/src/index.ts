import { initializeApp } from "firebase-admin/app";
import { DocumentSnapshot, FieldValue, getFirestore } from "firebase-admin/firestore";
import { setGlobalOptions } from "firebase-functions";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { createHash, randomBytes } from "node:crypto";

initializeApp();
setGlobalOptions({ maxInstances: 10 });

const db = getFirestore();
const SHIPPING_FEE = 150;
const FREE_SHIPPING_THRESHOLD = 5000;
const PAYMENT_METHODS = ["Cash on Delivery", "GCash (manual demo)"];
const ORDER_STATUSES = [
  "Pending",
  "Confirmed",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
] as const;
type OrderStatus = (typeof ORDER_STATUSES)[number];
const ADMIN_UID = "9GK7BzAsUiX5Ogn5VGzzkUQm2oy2";

function isAdmin(request: {
  auth?: { uid: string; token: Record<string, unknown> } | null;
}): boolean {
  return request.auth?.uid === ADMIN_UID;
}

interface RequestedItem {
  productId: string;
  quantity: number;
}

interface CheckoutPayload {
  items?: unknown;
  customerName?: unknown;
  phone?: unknown;
  address?: unknown;
  city?: unknown;
  province?: unknown;
  postalCode?: unknown;
  paymentMethod?: unknown;
}

function requiredText(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw new HttpsError("invalid-argument", `Enter a valid ${label}.`);
  }
  return value.trim();
}

function parseItems(input: unknown): RequestedItem[] {
  if (!Array.isArray(input) || input.length === 0 || input.length > 30) {
    throw new HttpsError("invalid-argument", "Your cart is empty or contains too many products.");
  }
  const seen = new Set<string>();
  return input.map((item) => {
    if (!item || typeof item !== "object") {
      throw new HttpsError("invalid-argument", "The cart contains an invalid product.");
    }
    const candidate = item as Record<string, unknown>;
    const productId = requiredText(candidate.productId, "product", 120);
    if (!/^[a-zA-Z0-9_-]+$/.test(productId) || seen.has(productId)) {
      throw new HttpsError("invalid-argument", "The cart contains a duplicate or invalid product.");
    }
    if (!Number.isInteger(candidate.quantity) || Number(candidate.quantity) < 1 || Number(candidate.quantity) > 10) {
      throw new HttpsError("invalid-argument", "Product quantities must be between 1 and 10.");
    }
    seen.add(productId);
    return { productId, quantity: Number(candidate.quantity) };
  });
}

export const createOrder = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Sign in before placing your order.");
  }

  const rawPayload = request.data as unknown;
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
    throw new HttpsError("invalid-argument", "Checkout details are missing.");
  }
  const payload = rawPayload as CheckoutPayload;
  const items = parseItems(payload?.items);
  const customerName = requiredText(payload.customerName, "name", 100);
  const phone = requiredText(payload.phone, "contact number", 30);
  const address = requiredText(payload.address, "street address", 240);
  const city = requiredText(payload.city, "city or municipality", 100);
  const province = requiredText(payload.province, "province", 100);
  const postalCode = requiredText(payload.postalCode, "postal code", 20);
  if (typeof payload.paymentMethod !== "string" || !PAYMENT_METHODS.includes(payload.paymentMethod)) {
    throw new HttpsError("invalid-argument", "Choose a supported payment method.");
  }

  const productRefs = items.map((item) => db.collection("products").doc(item.productId));
  const orderRef = db.collection("orders").doc();
  const orderNumber = `SM-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;

  return db.runTransaction(async (transaction) => {
    const snapshots: DocumentSnapshot[] = [];
    for (const productRef of productRefs) {
      snapshots.push(await transaction.get(productRef));
    }
    let subtotal = 0;
    const orderItems = items.map((item, index) => {
      const product = snapshots[index].data();
      if (!snapshots[index].exists || !product || product.published !== true) {
        throw new HttpsError("not-found", "One of the products in your cart is no longer available.");
      }
      if (!Number.isInteger(product.stock) || product.stock < item.quantity) {
        throw new HttpsError("failed-precondition", `${product.name} does not have enough stock.`);
      }
      if (!Number.isSafeInteger(product.price) || product.price < 0) {
        throw new HttpsError("failed-precondition", `${product.name} has an invalid catalog price.`);
      }
      const lineTotal = product.price * item.quantity;
      if (!Number.isSafeInteger(lineTotal) || !Number.isSafeInteger(subtotal + lineTotal)) {
        throw new HttpsError("failed-precondition", "The order amount is outside the supported range.");
      }
      subtotal += lineTotal;
      return {
        productId: item.productId,
        name: String(product.name),
        slug: String(product.slug),
        image: String(product.image || ""),
        unitPrice: product.price,
        quantity: item.quantity,
        lineTotal,
      };
    });

    const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    const total = subtotal + shippingFee;
    productRefs.forEach((ref, index) => {
      transaction.update(ref, {
        stock: snapshots[index].data()!.stock - items[index].quantity,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    transaction.create(orderRef, {
      uid,
      orderNumber,
      customer: {
        name: customerName,
        email: typeof request.auth?.token.email === "string" ? request.auth.token.email : "",
        phone,
      },
      shippingAddress: { address, city, province, postalCode, country: "Philippines" },
      paymentMethod: payload.paymentMethod,
      paymentNotice: payload.paymentMethod === "GCash (manual demo)"
        ? "Manual demo option only. No GCash payment was processed."
        : "",
      items: orderItems,
      subtotal,
      shippingFee,
      total,
      currency: "PHP",
      status: "Pending" satisfies OrderStatus,
      statusHistory: [{ status: "Pending", at: new Date().toISOString() }],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { orderId: orderRef.id, orderNumber, subtotal, shippingFee, total };
  });
});

export const updateOrderStatus = onCall(async (request) => {
  if (!isAdmin(request)) {
    throw new HttpsError("permission-denied", "Administrator access is required.");
  }
  const data = request.data as { orderId?: unknown; status?: unknown };
  const orderId = requiredText(data?.orderId, "order ID", 120);
  if (typeof data.status !== "string" || !ORDER_STATUSES.includes(data.status as OrderStatus)) {
    throw new HttpsError("invalid-argument", "Choose a valid order status.");
  }
  const status = data.status as OrderStatus;
  const orderRef = db.collection("orders").doc(orderId);

  await db.runTransaction(async (transaction) => {
    const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists) {
      throw new HttpsError("not-found", "The order could not be found.");
    }
    const order = orderSnapshot.data()!;
    const currentStatus = order.status as OrderStatus;
    const nextStatuses: Record<OrderStatus, OrderStatus[]> = {
      Pending: ["Confirmed", "Cancelled"],
      Confirmed: ["Processing", "Cancelled"],
      Processing: ["Shipped", "Cancelled"],
      Shipped: ["Delivered"],
      Delivered: [],
      Cancelled: [],
    };
    if (!nextStatuses[currentStatus]?.includes(status)) {
      throw new HttpsError("failed-precondition", `Cannot change an order from ${currentStatus} to ${status}.`);
    }

    const orderItems = Array.isArray(order.items) ? order.items : [];
    if (status === "Cancelled" || status === "Delivered") {
      const refs = orderItems.map((item: { productId: string }) =>
        db.collection("products").doc(item.productId));
      const productSnapshots: DocumentSnapshot[] = [];
      for (const ref of refs) {
        productSnapshots.push(await transaction.get(ref));
      }
      refs.forEach((ref, index) => {
        const quantity = Number(orderItems[index].quantity);
        if (productSnapshots[index].exists && Number.isInteger(quantity) && quantity > 0) {
          transaction.update(ref, status === "Cancelled"
            ? {
              stock: FieldValue.increment(quantity),
              updatedAt: FieldValue.serverTimestamp(),
            }
            : {
              soldCount: FieldValue.increment(quantity),
              updatedAt: FieldValue.serverTimestamp(),
            });
        }
      });
    }
    transaction.update(orderRef, {
      status,
      statusHistory: FieldValue.arrayUnion({ status, at: new Date().toISOString() }),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { orderId, status };
});

export const subscribeNewsletter = onCall(async (request) => {
  const email = requiredText(request.data?.email, "email address", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError("invalid-argument", "Enter a valid email address.");
  }
  const subscriberId = createHash("sha256").update(email).digest("hex");
  await db.collection("newsletterSubscribers").doc(subscriberId).set({
    email,
    subscribedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return { subscribed: true };
});
