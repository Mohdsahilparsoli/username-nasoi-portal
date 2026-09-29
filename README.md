# NASOI – School Data Entry Portal (Demo)

A front-end demo of a data entry workflow built with plain **HTML, CSS and JavaScript** (separate files, no framework, no build step).

> Demo only: all data is stored in the browser's `localStorage`. There is no server, no payment and no real organisation behind it.

## Flow

1. **Registration** (`register.html`): operator fills personal, contact, bank and qualification details and instantly gets a Registration ID (`DEO128`, `DEO129`, …) and password.
2. **Login** (`login.html`): three roles: DEO, Verifier (VR) and Super Admin. Login works with Registration ID, mobile number or email.
3. **Super Admin** (`admin.html`): sees all operators, **assigns work** (area, task type, target, rate, deadline), tracks assignments, all entries and month-wise payouts, sets the default rate.
4. **DEO dashboard** (`deo.html`): profile & bank details, work status (assigned area, new assignments), total / pending / approved / rejected entries, rejection reason with edit & resubmit, new entry form, total earnings and monthly history.
5. **Verifier** (`verifier.html`): queue of pending entries, approve or reject with reason, approved / rejected history.

## Demo logins

| Role | ID | Password |
|------|----|----------|
| DEO | `DEO126` (or `9717323761`) | `Abcd@2026` |
| Verifier | `VR101` | `Abcd@2026` |
| Super Admin | `ADMIN` | `Admin@2026` |

Earnings = approved entries × rate (default ₹10 per entry).

## Structure

```
index.html  about.html  services.html  terms.html
register.html  login.html  deo.html  verifier.html  admin.html
assets/         logo, favicon
css/style.css   theme based on the logo (blue, saffron, green)
js/icons.js     SVG line-icon set (no emoji icons)
js/store.js     data layer (localStorage + seed data)
js/common.js    shared helpers (formatting, modals, validation, dashboard nav)
js/register.js  js/login.js  js/deo.js  js/verifier.js  js/admin.js
```

## Run locally

Open `index.html` in a browser, or run `npx serve .`

## Deploy

Static site: import the repo on Vercel with framework preset **Other**, no build command, output directory `.`
