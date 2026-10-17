# Kenangan Festival

React/Vite festival site using the existing public checkout API, payment returns,
and printable e-tickets. Branding and artwork are retained from the original site.

The landing carousel fills the viewport, automatically changes artwork every
five seconds, and has no arrows, dots or slide counter. Desktop/mobile artwork
is fitted without cropping, with the festival navigation overlaid on top.

## Local Setup

Use Node.js 22.12+ (22 LTS or 24 LTS recommended).

```sh
npm install
cp .env.example .env.local
npm run dev
```

Configure `.env.local` with the Kenangan event UUID **slug** (not its numeric ID),
the sale link ID mapped to that event, and the public Cloudflare Turnstile site key.
`VITE_API_BASE` defaults to `/api/v1`. The development `/api` proxy forwards to
`DEV_API_TARGET`, defaulting to `http://localhost:4000`; run the existing
`ticket-backend` on that address or change the target. Vite selects another port
if 3000 is already in use. Restart after changing env values.

Set `VITE_SECRET_PAYLOAD` to the existing checkout API payload-format key, matching
the backend's `SECRET_PAYLOAD`, exactly as Purplecloud does. This is not a login
credential or API authorization token. The public endpoint still requires the
AES-formatted `{ data: ... }` request body and a valid Turnstile token.

Every `VITE_*` variable is visible in the built JavaScript, including this
compatibility key. Client-side AES is obfuscation, not a security boundary;
HTTPS and backend validation remain essential. Never put JWT signing keys,
payment-provider keys, webhook credentials or the Turnstile secret in frontend
env. No Kenangan-specific backend env or checkout endpoints are required.

Missing configuration fails closed; there is no production demo or CAPTCHA bypass.

## Routes And Purchase Flow

| Route | Purpose |
| --- | --- |
| `/` | Festival, artwork carousel, countdown, live ticket availability, playlist and contact |
| `/checkout?category_id=...` | Buyer/attendee details, one category, quantity, voucher, terms and Turnstile; no login |
| `/payment-success?order_id=...` | Payment-processing return and confirmation-email guidance |
| `/payment-failed?order_id=...` | Unsuccessful payment return and safe recovery guidance |
| `/order-detail?token=...` | Validate a ticket token and render individual ticket QR codes |

The backend prices tickets, enforces limits, applies vouchers, locks inventory,
creates the Xendit invoice and verifies its webhook. The summary is an estimate;
the provider shows the final amount. `checkout_time` is in **minutes** and is a
form-completion timer, not an inventory reservation. Tickets require successful
payment. Orders use only one general-admission category; seated categories need
a separate seat-selection UI. The existing backend enforces event policies,
including any configured account limits; the frontend does not add a login gate.

Checkout calls the existing public `POST /categories/checkout` with no
Authorization header or required customer session. Cookies are included for
Queue-it compatibility, not as a login requirement. Its normal
`{ success, order_id, payment_url }` response redirects the buyer to Xendit.
No custom status tokens, sessionStorage credentials, or status endpoints are used.

The existing payment callbacks return an order ID only, so the success page
shows processing and confirmation-email guidance instead of falsely confirming
payment from the URL. Ticket links from email use the existing public
`GET /public-check/validate?token=...` endpoint. When an existing ticket token is
supplied on the return URL, that same endpoint can confirm it and enable View
tickets. A bare order ID never retrieves private order details. Check email or
contact support before placing another order if a payment may still be pending.

Purchase routes use `noindex, nofollow` and `no-referrer`. Ticket QR codes are
generated locally from server-validated codes. Markdown terms do not render raw
HTML. Legacy jQuery scripts are retained on disk but no longer loaded. The old
global Facebook Pixel is not loaded on purchase pages, preventing ticket-reference
URLs from being sent to third-party analytics.

## Verification

```sh
npm test
npm run test:coverage
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

Unit tests isolate API, clock, payment navigation and CAPTCHA. Coverage enforces
80% overall statements, lines, functions and branches. Playwright runs desktop
and mobile with API/payment/CAPTCHA doubles; test-only event values are supplied
by its web server, not the normal dev server. Screenshots are in `test-results/`.
No live payment is made. Backend tests run separately with `npm test` in
`ticket-backend` and require no running PostgreSQL/Redis/Xendit services.

## Deployment

`npm run build` writes `dist/`, including bundled images/fonts, favicon, robots
and sitemap. `npm run deploy` retains the existing SCP deployment command.
Build with the correct public env values; no additional backend checkout routes
need to be deployed.

For production, serve the React app and reverse-proxy `/api/` to `ticket-backend`
on the **same origin** to preserve queue cookies. Configure HTTPS and a SPA
fallback, for example in Nginx:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
location / {
    try_files $uri $uri/ /index.html;
}
```

Set the Kenangan event's `frontend_base_url` to the festival's HTTPS origin.
Configure the event/link mapping, active general-admission categories and their
sale windows, `link_open`, dynamic attendee fields and event purchase policies.
Configure the production domain in Turnstile and CORS/tenant settings if using
a different API origin. Retain the existing signed Xendit webhook and processing
workers. Existing `/payment-success?order_id=...` and
`/payment-failed?order_id=...` callbacks remain unchanged.

Live launch requires a configured event and a controlled Xendit sandbox checkout;
mocked tests do not verify production credentials, database migrations, email
delivery or payment-provider callback behavior.

## Changes

- Replaced static HTML/jQuery entry with React routes and controlled interactions.
- Buy now opens the festival's checkout instead of an external vendor page.
- Added payment success/failure returns and Kenangan-styled validated ticket details.
- Uses Purplecloud's existing public checkout contract without new guest routes.