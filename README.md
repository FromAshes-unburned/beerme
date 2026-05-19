# 🍺 Beer Me — Local Craft Beer Delivery

> Uber Eats for local breweries. Order beer from your favorite local spot and have it delivered to your door with full age verification.

---

## Project Structure

```
beerme/
├── backend/          # Node.js + Express API
│   ├── src/
│   │   ├── index.js              # Server entry point
│   │   ├── routes/
│   │   │   ├── auth.js           # Register, login, ID verification
│   │   │   ├── breweries.js      # Brewery listing, menus, admin
│   │   │   ├── orders.js         # Place, track, update orders
│   │   │   ├── drivers.js        # Driver dispatch, ID scan, earnings
│   │   │   └── webhooks.js       # Stripe payment + ID verify webhooks
│   │   ├── middleware/
│   │   │   └── auth.js           # JWT + role + ID-verify guards
│   │   └── models/
│   │       └── migrate.js        # Database schema
│   └── .env.example
│
└── mobile/           # React Native app (iOS + Android)
    └── src/
        ├── screens/
        │   ├── HomeScreen.js     # Browse breweries
        │   └── TrackingScreen.js # Live order tracking
        └── services/
            └── api.js            # All API calls + Socket.io
```

---

## Quick Start

### Backend

```bash
cd backend
npm install

# Set up environment
cp .env.example .env
# Edit .env with your Stripe keys, DB URL, etc.

# Create database
createdb beerme

# Run migrations
npm run migrate

# Start dev server
npm run dev
```

### Mobile App

```bash
cd mobile
npx create-expo-app . --template blank
npm install

# Key dependencies to install
npm install @react-native-async-storage/async-storage \
            expo-location \
            react-native-maps \
            socket.io-client \
            @stripe/stripe-react-native

npx expo start
```

---

## Third-Party Services Setup

### 1. Stripe (Payments + ID Verification)
1. Create account at stripe.com
2. Enable Stripe Identity for ID verification
3. Set up Connect for brewery payouts
4. Add keys to `.env`
5. Set up webhook endpoint: `POST /webhooks/stripe`
   - Events to listen for:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `identity.verification_session.verified`
     - `identity.verification_session.requires_input`

### 2. PostgreSQL
- Local: `brew install postgresql && createdb beerme`
- Production: Use Railway, Supabase, or AWS RDS

### 3. Google Maps (for tracking + geocoding)
- Enable Maps SDK for iOS, Android in Google Cloud Console
- Add `GOOGLE_MAPS_API_KEY` to `.env`

### 4. Twilio (SMS notifications)
- Used for order confirmations and delivery updates
- Sign up at twilio.com, add credentials to `.env`

---

## API Reference

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Register customer or driver |
| POST | /api/auth/login | Login, get JWT token |
| GET  | /api/auth/me | Get current user |
| POST | /api/auth/start-id-verification | Begin Stripe Identity flow |

### Breweries
| Method | Path | Description |
|--------|------|-------------|
| GET  | /api/breweries | List breweries (with optional lat/lng for distance) |
| GET  | /api/breweries/:id | Single brewery + menu |
| GET  | /api/breweries/:id/orders | Brewery's orders (admin only) |
| POST | /api/breweries/:id/menu | Add menu item (admin only) |
| GET  | /api/breweries/:id/analytics | Revenue stats (admin only) |

### Orders
| Method | Path | Description |
|--------|------|-------------|
| POST  | /api/orders | Place order (requires ID verification) |
| GET   | /api/orders | List my orders |
| GET   | /api/orders/:id | Get order details |
| PATCH | /api/orders/:id/status | Update status (role-gated) |

### Drivers
| Method | Path | Description |
|--------|------|-------------|
| PATCH | /api/drivers/online | Go online/offline |
| PATCH | /api/drivers/location | Update GPS location |
| GET   | /api/drivers/available-orders | Jobs available near driver |
| POST  | /api/drivers/accept-order/:id | Claim a delivery |
| POST  | /api/drivers/verify-id/:id | Scan customer ID at door |
| GET   | /api/drivers/earnings | Earnings summary |

---

## Order Status Flow

```
pending → accepted → preparing → ready → driver_assigned → en_route → delivered
                                                                   ↘ failed_id
```

| Status | Changed by | Meaning |
|--------|-----------|---------|
| pending | System | Order placed, awaiting brewery |
| accepted | Brewery | Brewery confirmed |
| preparing | Brewery | Packing order |
| ready | Brewery | Ready for driver pickup |
| driver_assigned | Driver | Driver accepted job |
| en_route | Driver | Beer picked up, heading to customer |
| delivered | Driver | ID checked, beer handed over |
| failed_id | Driver | Customer failed ID check |

---

## Revenue Model

| Revenue Stream | Amount |
|---------------|--------|
| Platform service fee | 12% of order subtotal |
| Delivery fee (pass-through to driver) | $4–6 per order |
| Brewery subscription (future) | $49/mo for analytics + featured placement |
| Surge pricing (future) | 1.2–1.5× on busy Fri/Sat nights |

---

## Kentucky ABC Compliance Checklist

Before launching in Louisville:

- [ ] Consult Kentucky ABC attorney
- [ ] Verify each brewery partner has a valid KY Retail Malt Beverage license
- [ ] Determine if you need a third-party delivery license (check KRS 243)
- [ ] Confirm delivery hours comply with KY law (typically until 2am)
- [ ] Driver training on responsible service and ID checking
- [ ] No delivery to visibly intoxicated persons (build into driver training)
- [ ] All deliveries logged (compliance_log table handles this)
- [ ] Stripe Identity verifies age at account creation
- [ ] Driver ID scan at door for every order (logged)
- [ ] Failed ID checks result in return to brewery (no beer left)

---

## Go-to-Market: Louisville Launch Plan

### Phase 1 — Soft Launch (Month 1–2)
- 3–5 brewery partners (reach out to Against the Grain, Gravely, Akasha)
- 1–2 zip codes only (NuLu / Highlands)
- 5 drivers you hire and train directly
- iOS TestFlight beta only

### Phase 2 — Expand (Month 3–6)
- 10+ brewery partners
- All Louisville zip codes
- App Store + Play Store launch
- Add driver referral program

### Phase 3 — Scale (Month 6+)
- Add scheduled delivery
- Brewery subscription tiers
- Expand to Lexington, Cincinnati

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Backend API | Node.js + Express |
| Database | PostgreSQL |
| Real-time | Socket.io |
| Auth | JWT + bcrypt |
| Payments | Stripe Connect |
| ID Verification | Stripe Identity |
| SMS | Twilio |
| Maps | Google Maps Platform |
| Mobile | React Native + Expo |
| Hosting (suggested) | Railway (backend) + Expo EAS (mobile) |

---

Built with ❤️ for Louisville's craft beer scene.
