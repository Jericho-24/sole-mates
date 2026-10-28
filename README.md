# Sole Mates — Find Your Next Pair

Sole Mates is a footwear storefront built with React, Vite, Firebase Authentication, Cloud Firestore, and Firebase Storage. It includes a responsive shoe catalog, product details, cart, order requests, customer accounts, and an admin approval workflow.

> Product prices and starting stock are demo data in Philippine pesos, not verified retailer offers. Check product sizing and material details before ordering. GCash is a manual demo option only; no payment is processed.

## Local setup

1. Install Node.js 22 or newer and the Firebase CLI. The product seed also requires the Google Cloud CLI (`gcloud`).
2. Install the storefront and optional Cloud Functions dependencies:

   ```sh
   npm install
   npm --prefix functions install
   ```

3. Copy `.env.example` to `.env.local` if needed. The local `.env.local` is configured for the Sole Mates Firebase project and is ignored by Git. Restart Vite after changing environment values.
4. Start the storefront and create a production build:

   ```sh
   npm run dev
   npm run build
   ```

## Firebase project

The app and Firebase CLI are configured for the existing Firebase project `sole-mates-ee962`. The browser configuration is read from:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=sole-mates-ee962.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=sole-mates-ee962
VITE_FIREBASE_STORAGE_BUCKET=sole-mates-ee962.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

In Firebase Console, select **sole-mates-ee962**, enable Email/Password in Authentication, create the production Firestore database, and initialize Storage if product image uploads are needed. Analytics starts only after browser support is confirmed and errors do not prevent the store from loading.

## Catalog and seeding

The Firestore `products/{productId}` collection contains the published catalog. The bundled demo catalog has 12 footwear products across sneakers, running, basketball, training, hiking, lifestyle, and slides.

Sign in to Google Cloud with an account authorized to write to the project, then seed products that do not already exist:

```sh
gcloud auth application-default login
gcloud config set project sole-mates-ee962
npm run seed:products
```

The seed script skips existing product documents, preserving any product edits. The seed data is in `data/products.json`.

## Orders, access, and rules

Customers submit price-free requests to `orderRequests`. In **Admin → Orders**, approving a request rechecks current product prices and stock in a Firestore transaction, reserves inventory, creates the final `orders` document, and marks the request approved. Customers can follow each ordered item and its current status in their account. Order requests, approvals, and status changes use Firestore rules and transactions; they do not need Cloud Functions.

The Firebase Authentication UID `9GK7BzAsUiX5Ogn5VGzzkUQm2oy2` is the administrator identity used by the app, Firestore rules, Storage rules, and optional Cloud Functions. Review the rules and deploy them to the new project:

```sh
firebase login
firebase deploy --only firestore:rules,firestore:indexes,storage
```

Storage must be initialized in Firebase Console before deploying its rules. Email verification is not required. Keep control of the administrator account and use a strong, unique password.

Optional Cloud Functions are in `functions/src/index.ts`; deploying them requires the Firebase Blaze plan and enabled Google Cloud APIs:

```sh
npm --prefix functions run build
firebase deploy --only functions
```

Orders under ₱5,000 have a ₱150 sample shipping fee; orders at or above ₱5,000 have free sample shipping. The manual GCash demo option does not process payments.

## Vercel deployment

1. Import the repository into Vercel and set the project root to the repository root.
2. `vercel.json` configures the Vite production build, `dist` output, and SPA route fallback.
3. Add all seven `VITE_FIREBASE_*` values from `.env.example` in Vercel's Environment Variables settings for each environment you deploy. These browser Firebase config values are public; enforce access through Firebase Security Rules. Do not upload `.env.local` or service-account credentials.
4. Deploy Firestore rules and indexes separately with the Firebase CLI. Optional Cloud Functions also deploy separately to Firebase; Vercel hosts the storefront and does not deploy the `functions` directory.

`vercel.json` rewrites application routes to the Vite SPA entry point.
