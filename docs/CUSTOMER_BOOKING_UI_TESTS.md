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
- Date selection precedes barber selection. Read that date's active chair assignments, then fetch availability only for assigned barbers before displaying them. Hide unassigned, off-day/leave, fully booked and past-only fixtures; a barber assigned and working on the next date reappears. Chair/availability failures show retry rather than an unverified barber list.
- Backend availability and booking validation also require an active chair assignment when the store has configured chairs. Shared-chair overlap follows actual date-effective assignments instead of barber names. Dedicated tests cover no chair, ended/inactive assignment and shared-chair collision.
- Past and unavailable starts are not selectable; expiry disables proceeding; no arbitrary first-18-slots truncation.
- Tapping a time never writes a booking; review shows services, duration, barber, customer, date/time and estimated amount before explicit confirmation.
- Conflict response stays actionable, clears selected time and reloads availability; retry succeeds.
- Successful appointment is immediately visible, cancellation requires a reason and retains history, receipt opens/closes, refresh retains the selected history filter.
- Layout and primary-action bounds during transitions through 320, 390, 759, 760, 820 and 1440 pixels; selected and unselected text inspected in screenshots.

## Live Acceptance

- User confirmed the redesigned booking flow works and the Owner view shows matching barber, date/time and services for increment `4033353`.
- This confirms the live booking happy path only. Device type was not specified; it does not establish live conflict, cancellation, receipt or physical-mobile regression coverage.
- Subsequent unavailable-barber fix: read-only live availability checks on 2026-09-17 for the active male haircut returned zero future available starts for both ช่างนุค and ช่างนุ้ย. Mocked UI tests passed for the new date-first filtering; live end-to-end acceptance of this follow-up is still pending. No real bookings were created by this check.
- Chair follow-up verification: 117 backend tests passed; the PostgreSQL concurrency theory was skipped because its dedicated database was not started. Frontend build/lint and mocked browser flow passed. The browser check uses emulation, not physical hardware. Live acceptance of chair-filtered selection remains pending.
- Live chair-filtered acceptance passed on 2026-10-23 against the Supabase development data using the existing Customer and Owner accounts. For 2026-10-24 and the selected `ตัดผมชาย` service, the customer UI showed exactly the five barbers with a future available slot, hid ช่างเปิ้ล because no slot was available, and hid ช่างไปป์ because he had no date-effective chair assignment.
- The customer booked ช่างเค้ก at 10:00 through the rendered UI. The Owner timeline and detail sheet showed the same booking number, customer, barber, service, date and time. The test then logged back in as the customer and cancelled the appointment through the UI; the Owner API retained the record as `Cancelled`. Screenshots were inspected at a 390 x 844 emulated viewport. No active test appointment remains.
- The live data check also found 21 active services and the exact `ตัดผมชาย` entry configured as 30 minutes. This is catalogue data debt tracked separately under S09-01; it does not invalidate the barber/chair filtering acceptance.

## Remaining Acceptance

- Live booking, matching Owner visibility and customer cancellation are recorded above. Receipts and concurrent conflict recovery for this redesign remain browser-mocked or backend-test evidence.
- Physical touch devices, virtual keyboard and mobile Safari have not been tested.
- Backend collision/status guards are retained, not replaced by UI validation. This browser suite is not a database concurrency test.
- Shop-configured cancellation deadlines, catalogue administration, profile/password editing and guest OTP remain separate tracked work.
