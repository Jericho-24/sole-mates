const admin = require("firebase-admin");
const products = require("../../data/products.json");

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "sole-mates-ee962",
});

async function seedProducts() {
  const db = admin.firestore();
  let created = 0;
  let skipped = 0;

  for (const product of products) {
    const ref = db.collection("products").doc(product.id);
    try {
      await ref.create({
        ...product,
        soldCount: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      created += 1;
    } catch (error) {
      if (error.code === 6 || error.code === "already-exists") {
        skipped += 1;
        continue;
      }
      throw error;
    }
  }

  console.log(`Seed complete: ${created} created, ${skipped} already existed.`);
}

seedProducts().catch((error) => {
  console.error("Product seeding failed:", error);
  process.exitCode = 1;
});
