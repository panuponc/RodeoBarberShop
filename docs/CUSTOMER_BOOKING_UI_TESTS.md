# Customer Booking UI Verification

## Scope

- Branch: `feature/customer-booking-ui`, based on the accepted cancellation increment `8efc251`.
- Customer-only charcoal/gold booking workspace. Existing staff/barber screens and payment APIs are unchanged.
- Flow: services -> barber/date/available start -> review -> explicit confirmation -> success -> appointments/history.
- Existing cancellation component and receipt renderer are reused. Fixed one-hour cancellation remains pending replacement by S05-01 settings.
- No profile editing, guest OTP, shop settings, new payment flow or database migration is included.

## Automated Checks

- `npm run build` and `npm run lint` in `frontend`.
- `frontend/tests/customer-booking.ui.cjs` uses Playwright with installed Chrome and an already running Vite server. All API calls, including login, creation, cancellation and receipts, are intercepted with mock data. It makes no live appointment changes and reads no local credentials.
- Run from the repository root. Playwright must be available to Node, or set `PLAYWRIGHT_MODULE` to the absolute path of an existing Playwright installation. `UI_TEST_URL` optionally overrides `http://127.0.0.1:5173`.

```powershell
node frontend/tests/customer-booking.ui.cjs
```

Screenshots are written to the existing ignored `.tmp` directory. These are browser emulation, not physical-device evidence.

## Covered Cases

- Initial load failure/retry, no selection guard, service totals, large-catalogue search and no search matches.
- Service/barber/date changes invalidate selection; aborted/stale availability responses cannot replace the current context.
- Past and unavailable starts are not selectable; expiry disables proceeding; no arbitrary first-18-slots truncation.
- Tapping a time never writes a booking; review shows services, duration, barber, customer, date/time and estimated amount before explicit confirmation.
- Conflict response stays actionable, clears selected time and reloads availability; retry succeeds.
- Successful appointment is immediately visible, cancellation requires a reason and retains history, receipt opens/closes, refresh retains the selected history filter.
- Layout and primary-action bounds during transitions through 320, 390, 759, 760, 820 and 1440 pixels; selected and unselected text inspected in screenshots.

## Remaining Acceptance

- Real customer/Owner end-to-end verification of the redesigned flow is still needed. Earlier acceptance applies to the previous cancellation UI, not automatically this redesign.
- Physical touch devices, virtual keyboard and mobile Safari have not been tested.
- Backend collision/status guards are retained, not replaced by UI validation. This browser suite is not a database concurrency test.
- Shop-configured cancellation deadlines, catalogue administration, profile/password editing and guest OTP remain separate tracked work.
