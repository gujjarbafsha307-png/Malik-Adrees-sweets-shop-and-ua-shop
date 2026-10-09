# Malik Idrees Shop & UA Trader

Mobile-first wholesale and general-store application for Chakki Bazar, Samundri. The catalogue, authentication, inventory, customer profiles, checkout, orders, complaints, storage and chat are designed around Supabase. No sample catalogue or pretend order data is included.

## Stack

- React 19, Vite, JavaScript
- React Router, Framer Motion, Lucide React
- Supabase Auth, PostgreSQL with RLS, Storage and Realtime

## Supabase setup

1. Create a Supabase project and configure Authentication email/password sign-in. Set the site's URL and allowed redirect URLs to your local and production domains.
2. In the Supabase SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql) once on a new project. It creates the tables, order/location RPCs, RLS policies, product image bucket and Realtime table publication. Do not run it repeatedly: the enum and trigger creation is intended for an empty project.
3. Create the owner in Supabase Dashboard > Authentication > Users using an email you control and a strong, unique password. Set the display name to `Ayan` if desired. Promote that user's profile in the SQL Editor, replacing the email:

   ```sql
   update public.profiles
   set role = 'owner', full_name = 'Ayan'
   where id = (select id from auth.users where email = 'owner@example.com');
   ```

   The SQL editor is the trusted bootstrap path. Customer signup always creates a `customer` profile; no public owner registration exists. Do not use `12345` for a deployed owner password. The app never contains a default owner password or service-role key.
4. Copy `.env.example` to `.env.local`, then add the Supabase project URL and publishable/anon key from Project Settings > API. Only the public browser key belongs in this Vite app.
5. Install and run from the `my-shop` directory:

   ```powershell
   Copy-Item .env.example .env.local
   # Edit .env.local with the project URL and publishable/anon key
   npm install
   npm run dev
   ```

   Restart Vite after changing environment variables. Build and lint with `npm run build` and `npm run lint`.

The checkout RPC reads current prices and stock from PostgreSQL, locks product rows, decrements inventory in the same transaction, and uses an idempotency key so request retries do not create duplicate orders. The UI sends only product IDs, quantities, notes and a retry key; browser prices are not trusted.

## Owner and customer access

- The owner signs in at `/auth/owner` with the configured owner email/password.
- Customers register at `/register` and sign in at `/auth/customer`. If email confirmation is enabled, confirm the address before signing in.
- A customer's profile, orders, complaints, chat and location records are protected by RLS. Owner access is checked in PostgreSQL as well as in the route UI.
- Product images are public catalogue images; uploads and mutations require the owner role. The bucket limit is 5 MB per image.

## Local configuration

`.env.local` is ignored by Git. The only frontend settings are `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; Vite variables are public to visitors. Never add the Supabase service-role key to this project, a `VITE_` variable, or a browser build.

The provided contact number is formatted for the WhatsApp URL as `9231040866111`. Confirm this number is accepted by the shop's WhatsApp account before launch; the owner can edit the displayed contact number in Store settings.

## Deployment

Vercel or Netlify is recommended because the application uses client-side routes. Import the repository, set the two public Supabase environment variables in the hosting dashboard, and deploy with the Vite build command `npm run build` and output directory `dist`. Add the production domain to Supabase Auth's site and redirect URL allowlists. Serve over HTTPS for browser geolocation.

A Vercel rewrite is included so direct visits to `/shop`, `/owner`, and other React routes return the app shell. GitHub Pages needs an equivalent SPA fallback or custom 404 handling and a correct Vite base path; it is not configured here.

## Implemented application areas

- Animated welcome screen, role selection, separate owner/customer sign-in and customer registration
- Responsive storefront, live product catalogue, category/search filtering, local persistent cart, discount-aware totals
- Transactional checkout RPC, unique order numbers, customer order history and live order updates
- Owner dashboard, inventory CRUD, image upload, order status management, customer directory and store contact settings
- Realtime customer/owner chat, complaints and ratings, store policies/contact page, WhatsApp and phone links
- Explicit, one-time customer geolocation sharing after consent; no continuous tracking
- English, Urdu and Arabic language choices with RTL direction for Urdu/Arabic and reduced-motion support

## Verification and launch checklist

Build and lint pass locally. Real authentication, database operations, realtime delivery, RLS behavior, image upload and location sharing still require a configured Supabase project and must be tested against that project before taking customer orders. The language dictionaries currently cover core navigation/actions, not every dashboard sentence or policy; static policy copy and some owner/customer interactions need further localization and acceptance testing before representing the interface as fully translated.
