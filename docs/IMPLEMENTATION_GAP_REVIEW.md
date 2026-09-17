# Implementation Gap Review

## Review Baseline

- Review date: 2026-09-17.
- Scope: Sprint 1-12 in [05_SPRINT_PLAN.md](05_SPRINT_PLAN.md).
- Code baseline: `bbd8560` on `main` at the original review.
- Method: static inspection of controllers, frontend flows and available tests. No new application tests were run for this review.
- Earlier 103 passing backend tests include eight PostgreSQL concurrency cases. They do NOT establish coverage or acceptance of every Sprint 1-12 requirement.
- This is a tracked review snapshot, not a new scope approval or a claim that every possible defect has been found. Recheck code before implementing any item.

## How To Resume

1. Check the current branch/worktree and read this file together with the sprint plan.
2. Pick an item by ID, inspect its evidence against current code, and confirm its scope. Do not assume an old finding still applies.
3. Use a focused feature branch; follow Git ownership rules in [AGENTS.md](../AGENTS.md).
4. Update the item's status as work progresses. Record code changes, test evidence, review date and commit in the closure log.
5. Mark Done only after the stated acceptance checks pass. Record emulation versus real-device checks and any remaining limitations.
6. Keep completed IDs for traceability. Do not silently delete findings or mark other items complete just because they share a sprint.

Status values: **Not Started**, **In Progress**, **Awaiting Verification**, **Done**.

Finding types: **Missing** = no implementation found for the flow; **Partial** = some layers exist; **Verification Gap** = implementation exists but acceptance evidence is incomplete.

## Sprint Coverage

| Sprint | Review result | Tracked follow-up |
| --- | --- | --- |
| 1 Foundation | Solution, frontend, PostgreSQL/EF, JWT and role authorization present; not a security sign-off | S11-01 cross-role checks |
| 2 User/authentication | Registration, login/logout and basic current-user API present | S02-01, S02-02 |
| 3 Personnel/barbers | Core account/role/status/reset/profile/availability operations present | S11-01 verification |
| 4 Services | CRUD and barber mapping APIs present; management UI not found | S04-01, S04-02 |
| 5 Shop/schedule | Shop/holiday APIs and barber working-hours UI present | S05-01 |
| 6 Online booking | Core named-barber booking and history present; cancellation and unassigned flow incomplete | S06-01, S06-02, S06-03 |
| 7 Guest booking | OTP entity/table only; public OTP booking flow not found | S07-01 |
| 8 Front desk | Queue, status changes, staff-created bookings and reassignment present | S08-01; depends on S06-02 |
| 9 Barber service | Core service/start/add-service/complete flow present with focused tests | S11-01 broader acceptance |
| 10 Payment | Payment API and receipt/duplicate-payment protection present; UI methods differ by role | S10-01 |
| 11 Stabilization | Several fixes and tests exist; not complete while core gaps remain | S11-01, S11-02 |
| 12 Dashboard | Queue summary exists, not the complete planned dashboard | S12-01, S12-02 |

## Findings

### S06-01: Customer Cancellation Rules And UI

- Type: Partial. Status: Awaiting Verification.
- Original finding: customer history had no cancel action. The cancellation API checked ownership and status but did not enforce the planned one-hour cutoff; the request reason was nullable.
- Evidence: [BookingsController.cs](../backend/RodeoBarberShop.Api/Controllers/BookingsController.cs), `CancelBooking`; [CancelBookingRequest.cs](../backend/RodeoBarberShop.Api/Contracts/Bookings/CancelBookingRequest.cs); [App.tsx](../frontend/src/App.tsx), customer history.
- Acceptance: customer can cancel only their eligible booking; UI and API enforce the agreed one-hour boundary and required reason; cancelled bookings remain in history. Test just before/at/after the boundary, wrong owner and repeat requests.
- Agreed rule (2026-09-17): the shop confirms only on arrival. Customer cancellation is limited to PendingConfirmation, at least one hour before the appointment (exactly one hour allowed), with a nonblank reason. Keep staff rules separate.
- Approved follow-up: one hour becomes the default, not a permanent fixed rule. S05-01 owns the configurable lead-time integration for both UI and API; existing `ShopSetting.CancellationDeadlineHours` must be considered rather than introducing an unrelated setting. This branch still uses a fixed one-hour cutoff. The dynamic requirement is not complete until the integration is verified.
- Subsequent acceptance: user confirmed successful cancellation through the real customer account and matching Cancelled status in the Owner view for increment `d5e1321`. This supersedes the live happy-path acceptance gap recorded below, not the remaining dynamic-setting work. Test device was not specified; do not claim real-mobile acceptance or a live boundary/concurrency test. The focused fixed-cutoff increment is ready for integration; S06-01 remains open for S05-01 integration and its verification.
- Implemented: customer history cancellation with inline confirmation, required reason, live cutoff and inline errors; API ownership/status/time/reason guards under the booking write lock. Staff cutoff/reason rules are unchanged. PendingConfirmation displays as booked; arrival actions explicitly mark the customer as arrived. No database status migration.
- Verification: 114 backend tests passed, including 19 new cancellation cases; PostgreSQL concurrency theory skipped without its test database. Frontend production build passed. Mocked Playwright UI checks passed at 320/390/768/1440 widths, including empty reason, rejection/retry, retained history and cutoff expiry. Screenshot inspected. Real-device and live end-to-end acceptance remain pending; no production data changed by these tests.

### S02-01: Customer Profile Editing

- Type: Missing. Status: Not Started.
- Finding: basic `/auth/me` exists, but customer profile read/edit flow was not found. Customer lookup for staff is not a customer profile editor.
- Evidence: [AuthController.cs](../backend/RodeoBarberShop.Api/Controllers/AuthController.cs), `Me`; [CustomersController.cs](../backend/RodeoBarberShop.Api/Controllers/CustomersController.cs); [App.tsx](../frontend/src/App.tsx).
- Acceptance: agreed profile fields can be read/edited by their owner, validate input, persist after reload, and cannot be changed through another user's identity.

### S02-02: Self-Service Password Change

- Type: Missing. Status: Not Started.
- Finding: staff password reset exists; authenticated customer password change was not found.
- Evidence: [AuthController.cs](../backend/RodeoBarberShop.Api/Controllers/AuthController.cs); [StaffController.cs](../backend/RodeoBarberShop.Api/Controllers/StaffController.cs), `ResetPassword`; [App.tsx](../frontend/src/App.tsx).
- Acceptance: authenticated user verifies current password and changes to a validated new password; old password fails and new password succeeds; errors do not expose secrets. Decide and test existing-session behavior explicitly.

### S04-01: Service Management UI

- Type: Partial. Status: Not Started.
- Finding: create/edit/disable and active-service listing APIs exist, but the frontend service-management screen was not found.
- Evidence: [ServicesController.cs](../backend/RodeoBarberShop.Api/Controllers/ServicesController.cs); [App.tsx](../frontend/src/App.tsx), service reads and staff navigation.
- Acceptance: authorized staff can create, edit and disable services from the UI; validation and loading/error states work; disabled services cannot be newly booked and existing booking snapshots remain intact. Review how inactive services are listed before adding a reactivation control.

### S04-02: Barber Service Mapping UI

- Type: Partial. Status: Not Started.
- Finding: `UpdateBarber` accepts service IDs, but a frontend editor for this mapping was not found.
- Evidence: [BarbersController.cs](../backend/RodeoBarberShop.Api/Controllers/BarbersController.cs), `UpdateBarber`; [App.tsx](../frontend/src/App.tsx).
- Acceptance: Owner/Admin can inspect and update mappings, changes persist, and booking/rescheduling honor eligible services. Confirm the meaning of an empty mapping before changing it; current backend treats it as unrestricted.

### S05-01: Shop Settings, Operating Calendar And Cancellation Rules

- Type: Partial. Status: Not Started.
- Finding: shop information/hours and weekly/special holiday APIs exist; corresponding management UI was not found. Existing shop hours use one opening/closing pair; special holidays use a single date, not a date range or annual recurrence. `CancellationDeadlineHours` is already exposed by the shop API but is not used by the current customer-cancellation guards. Barber working-hours editing already exists and should not be rebuilt.
- Evidence: [ShopController.cs](../backend/RodeoBarberShop.Api/Controllers/ShopController.cs); [App.tsx](../frontend/src/App.tsx), working-hours requests and staff navigation.
- Approved scope (2026-09-17): Owner settings with shop information, operating calendar and booking/cancellation sections. Retain existing Owner/Admin permissions. Desktop navigation entry belongs at the end; mobile uses additional settings navigation rather than adding a permanent bottom-bar action.
- Operating calendar: weekday opening/closing hours and regular closed days; named one-off holidays for a single date or inclusive multi-day range; edit/remove ranges; support year-end crossings such as December 30 through January 2.
- Annual holidays: optional yearly recurrence for fixed dates/ranges, without manually creating every year. Moving-date holidays are configured for the specific year. No automatic closure based on public-holiday calendars. Decide explicit February 29 behavior before implementing recurrence; reject invalid/reversed ranges and define overlap handling.
- Booking effects: shop closures block all barbers in both the UI and backend, including direct booking/rescheduling requests. Timeline and status indicators read the same effective shop calendar and distinguish shop closure from barber leave. After the closure ends, normal hours resume automatically, still respecting other applicable holidays and barber restrictions. Use the shop timezone consistently.
- Existing appointments: preview affected appointments before confirmation, revalidate conflicts when saving, and require renewed review if the affected set changed. Keep existing bookings intact; no automatic cancellation/reassignment. Staff contact customers and use explicit reschedule/cancel actions.
- Cancellation configuration: default 60 minutes; reuse/evolve the existing hours setting deliberately to support minute-based choices such as 30 minutes. Preserve stored values through any unit/schema migration. UI eligibility, cutoff copy and backend validation must use the same persisted rule, including after Owner edits. Exactly the configured boundary is allowed; customer ownership, pre-arrival status and required reason remain enforced; staff restrictions are unchanged. Define zero-value behavior and how edits affect existing bookings before implementation.
- Acceptance checks: authorized save/reload and unauthorized rejection; weekday boundaries; 3-5 day closures including both endpoints; cross-year ranges; annual recurrence across years; specific-year moving holidays; edit/removal and reopening; existing-booking preview with a concurrent booking; direct API blocking and matching timeline/status; nondefault cancellation cutoff before/at/after boundary and stale settings. Verify responsive transitions, not only fixed screenshots.
- Delivery: remain Not Started until work begins on a focused shop-settings branch after review/integration of the current cancellation increment. Updating these requirements does not implement the settings system or close S06-01's dynamic follow-up.

### S06-02: Booking Without A Selected Barber

- Type: Missing. Status: Not Started.
- Finding: current booking validation requires a non-empty barber ID; a nullable entity field alone does not implement unassigned booking.
- Evidence: [BookingsController.cs](../backend/RodeoBarberShop.Api/Controllers/BookingsController.cs), `ValidateCreateBookingRequest`; [App.tsx](../frontend/src/App.tsx), customer barber selector.
- Acceptance: first confirm whether "no preference" means automatic assignment or a genuinely unassigned queue. Then implement the agreed flow with valid service duration/capacity and no double booking. Track front-desk completion under S08-01.
- Scope note: the sprint plan says "barber selection or unassigned booking"; review the original requirement before treating unassigned booking as mandatory rather than an alternative.

### S06-03: Customer Availability Becomes Stale

- Type: Partial. Status: Awaiting Verification.
- Original finding: customer availability filtered `isAvailable` but not past start times; changing service/barber/date did not immediately clear displayed old slots. Backend rejected invalid writes, but the UI could still offer stale choices.
- Evidence: [App.tsx](../frontend/src/App.tsx), `checkAvailability`, `createBooking` and customer input handlers; [BookingsController.cs](../backend/RodeoBarberShop.Api/Controllers/BookingsController.cs), `GetAvailability` and `ValidateBookingAvailability`.
- Acceptance: changing inputs invalidates or refreshes slots; past starts cannot be selected; submitted date/barber/services match the displayed slot. Retain server-side validation for concurrent changes.
- Implemented on `feature/customer-booking-ui`: customer-only workspace extracted to `CustomerBooking.tsx`; context-keyed, abortable availability; selection cleared on service/barber/date changes; future-start guard checked during rendering and submission; explicit review before writing; conflict feedback and recheck. API validators remain unchanged.
- Verification: frontend build/lint and mocked browser workflow checks passed, including responsive transitions and selected/unselected screenshot inspection. See [Customer Booking UI Verification](CUSTOMER_BOOKING_UI_TESTS.md) for repeatable checks and limitations. Redesigned live customer/Owner flow and physical-device acceptance remain pending; no full-sprint completion claim.

### S07-01: Guest Booking With Email OTP

- Type: Missing. Status: Not Started.
- Finding: `EmailOtp` schema exists; OTP delivery/verification and a public guest booking confirmation flow were not found. Staff entering guest details is a different workflow.
- Evidence: [EmailOtp.cs](../backend/RodeoBarberShop.Api/Entities/EmailOtp.cs); [ApplicationDbContext.cs](../backend/RodeoBarberShop.Api/Data/ApplicationDbContext.cs), `ConfigureEmailOtps`; controller list and customer entry in [App.tsx](../frontend/src/App.tsx).
- Acceptance: guest enters booking data, receives and verifies an expiring email OTP, then confirms one valid booking without an account. Test wrong/expired/reused codes, retry limits, delivery failure and booking conflicts. Decide email provider/configuration without committing credentials.

### S08-01: Complete Unassigned Front-Desk Flow

- Type: Partial. Status: Not Started. Dependency: S06-02 scope decision.
- Finding: staff-created bookings and reassignment exist. End-to-end creation, visibility and first assignment of genuinely unassigned bookings were not established.
- Evidence: [BookingsController.cs](../backend/RodeoBarberShop.Api/Controllers/BookingsController.cs), `CreateStaffBooking` and `Reschedule`; [App.tsx](../frontend/src/App.tsx), queue/chair rendering.
- Acceptance: if genuinely unassigned bookings are required, staff can find them, assign a qualified available barber, and see the resulting queue without creating duplicate appointments. Reuse reassignment validation where appropriate.

### S10-01: Complete Front-Desk Payment Method Selection

- Type: Partial. Status: Not Started.
- Finding: backend accepts Cash/BankTransfer/QrPayment; staff `confirmPayment` always sends QrPayment. Barber checkout offers Cash and QrPayment only.
- Evidence: [PaymentsController.cs](../backend/RodeoBarberShop.Api/Controllers/PaymentsController.cs), `CreatePayment`; [App.tsx](../frontend/src/App.tsx), `confirmPayment`; [BarberCheckout.tsx](../frontend/src/BarberCheckout.tsx).
- Acceptance: front-desk/Owner checkout exposes the planned payment methods and records the selected method, amount and receiver correctly; receipt agrees; duplicate protection remains. Decide separately whether all methods must also be offered to barbers.
- Verification limit: database duplicate-payment protection exists, but the eight PostgreSQL concurrency cases did not test concurrent payment operations.

### S11-01: Cross-Role Core-Flow Acceptance

- Type: Verification Gap. Status: Awaiting Verification.
- Finding: focused tests exist for barber service/payment, leave, rescheduling and selected concurrency cases; they do not establish complete acceptance of authentication, personnel, services, shop settings, customer booking and payment across roles.
- Evidence: [backend test project](../backend/RodeoBarberShop.Api.Tests/); [POSTGRES_CONCURRENCY_TESTS.md](POSTGRES_CONCURRENCY_TESTS.md).
- Acceptance: document and execute a role-by-workflow checklist with expected outcomes, negative permission cases, mobile/desktop checks and evidence; distinguish mocks, in-memory tests, real PostgreSQL and real devices. Track discovered defects individually.

### S11-02: Project 1 Demo Readiness

- Type: Verification Gap. Status: Awaiting Verification.
- Finding: no completed demo-readiness evidence was located in the reviewed repository; this does not prove no demonstration has occurred outside it.
- Evidence: [05_SPRINT_PLAN.md](05_SPRINT_PLAN.md), Sprint 11.
- Acceptance: record a repeatable demo script, test data/setup, working role accounts supplied securely, known limits and a successful rehearsal. Do not present missing workflows as complete.

### S12-01: Complete Owner/Staff Dashboard

- Type: Partial. Status: Not Started.
- Finding: queue/status/amount summaries exist. Full daily customer count, per-barber workload summary and service ranking were not found as a complete dashboard.
- Evidence: [App.tsx](../frontend/src/App.tsx), `queueSummary`, staff navigation and queue summary; [BarberQueue.tsx](../frontend/src/BarberQueue.tsx) for existing barber-only metrics.
- Acceptance: map each Sprint 12 metric to an agreed definition and data source; supply role-appropriate views, filters and empty/error states; verify against fixtures. Reuse existing summaries rather than duplicate controls.

### S12-02: Define And Correct Daily Revenue Metric

- Type: Partial. Status: Not Started.
- Finding: `queueSummary.revenue` sums booking totals for the selected appointment date when payment is Paid OR booking is Completed. That is not necessarily money received on the selected day.
- Evidence: [App.tsx](../frontend/src/App.tsx), `queueSummary`; [PaymentsController.cs](../backend/RodeoBarberShop.Api/Controllers/PaymentsController.cs) for payment records, corrections and voids.
- Acceptance: distinguish appointment value from actual daily receipts. Define the intended revenue basis, timezone and void/correction handling; test cross-day payments and unpaid/completed records. Label metrics to match their calculation.

### S09-01: Main Services And In-Shop Assessment

- Type: Partial. Status: Not Started. Approved follow-up spanning Sprints 4, 6, 8-10.
- Scope: [Service Assessment Scope](SERVICE_ASSESSMENT_SCOPE.md) records the seven-service catalogue, unresolved colouring prices, internal dynamic substeps and per-main-service duration calculation.
- Existing baseline: `Service` and `BookingService` use numeric prices/durations; flat added-service support is not evidence of hierarchical steps or unresolved assessment pricing. Recheck existing service-add, extension and checkout validators before implementation.
- Customer boundary: pre-booking shows only main services. After arrival, either barber or shop staff can assess, explain the work to the customer, and enter internal steps, charges and whole-hour durations. No default substep duration and no automatic addition on top of the base reservation.
- Acceptance: follow the linked checklist, preserve historical snapshots and permissions, validate extensions atomically, and prevent payment with unresolved pricing. Existing customer cancellation and service/payment workflows must remain functional.
- Delivery: keep the customer UI increment separate; review its acceptance/Git state before integrating and opening the service-assessment branch. No catalogue data has been replaced by recording this scope.

## Customer UI Acceptance Update

- User confirmed live booking through the redesigned customer UI and matching barber, date/time and services in the Owner view for `4033353`. The focused customer UI increment is ready for integration.
- This supersedes the pending live booking happy-path note under S06-03, but does not claim physical-device or live conflict/cancellation/receipt testing. Those limits remain in [Customer Booking UI Verification](CUSTOMER_BOOKING_UI_TESTS.md).
- S09-01 assessment/catalogue work and S05-01 shop settings are still not implemented; merging this UI branch does not complete them.

## Priority And Scope Decisions

- Recommended first: S06-01, because customer cancellation is a core workflow with a missing backend business rule. This is a recommendation, not permission to start edits automatically.
- Recheck S06-02/S08-01 against original scope before implementing unassigned booking.
- Do not count this list as a fresh full security audit, or treat absence of an item as proof of correctness.
- Sprint 14-17 remain visible in the sprint plan. Later work does not erase these earlier gaps.
- Latest approved direction: preserve the customer UI increment, then pursue S09-01 catalogue/assessment work. S05-01 settings are deferred, not removed. The original first-item recommendation above is historical, not an instruction to restart cancellation work.

## Closure Log

| Item ID | Status change | Verified on | Evidence / commit | Remaining limits |
| --- | --- | --- | --- | --- |
| Baseline | Review recorded; no gaps closed by this document | 2026-09-17 | Static review of `bbd8560` | Recheck before implementation |
| S06-01 | Not Started -> Awaiting Verification | 2026-09-17 | CustomerCancellationTests.cs; frontend build; mocked browser checks; commit pending | Live customer/shop acceptance and real mobile check pending; PostgreSQL races not rerun |
| S05-01 | Approved scope expanded; remains Not Started | 2026-09-17 | User-approved operating calendar, holiday ranges/recurrence and configurable cancellation; rechecked ShopController | Settings implementation and dynamic S06-01 integration pending |
| S06-01 | Fixed-cutoff increment accepted; full item remains open | User confirmation in this session | `d5e1321`: user confirmed live customer cancellation and matching Owner status | Dynamic lead time under S05-01 pending; physical device unspecified; PostgreSQL races not rerun |
| S06-03 | Not Started -> Awaiting Verification | Customer UI redesign session | CustomerBooking.tsx; frontend/tests/customer-booking.ui.cjs; commit pending | Mocked browser checks only; redesigned live/physical-device acceptance pending |
