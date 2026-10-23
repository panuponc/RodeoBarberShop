# Implementation Gap Review

## Current Scope Authority

As of 2026-10-24, use [V42 Scope Alignment](V42_SCOPE_ALIGNMENT.md) and the user's
`Rodeo_Barber_Shop_V42.docx` for exam scope, not historical sprint priorities.
The original findings and closure log below are retained. This update reconciles
scope at code baseline `b650b37`; it is not a new full acceptance run.

- S04-01/S04-02 implementation is integrated into main at b650b37; full live acceptance remains pending. The latest focused service test run passed 10 cases; earlier five-test and catalogue-count entries below are historical snapshots, not current database counts.
- S06-03 implementation is integrated through df9be5a (already an ancestor of main); its old integration-pending text is superseded. Existing verification limits remain.
- S05-01: split V42 8.1-8.2.3 baseline acceptance from additional holiday range/recurrence and configurable-cancellation work. Settings remain incomplete; do not require the entire expansion to claim the explicit Word baseline is met.
- S06-01: V42 4.6.3 requires a fixed one-hour minimum and cancellation reason. Fixed-rule acceptance and the later dynamic-setting follow-up must be reported separately.
- S06-02/S08-01: V42 4.2.2 and 5.5.1 explicitly require no-barber-preference booking and shop assignment. The historical question about whether this is mandatory is resolved: it is required. Reservation and assignment behavior still needs design; do not assume random automatic assignment satisfies it.
- S07-01: Guest Email OTP is mandatory Project 1 under V42 4.7.1.
- S10-01: verify all three front-desk methods under V42 7.4, including bank-account display; also check discount/net amount and summary fields under 7.3/7.6, independently of the Project 2 promotion engine.
- S09-01: hierarchical assessment is an additional shop agreement; V42 6.2 requires adding services with conflict checks, not this specific substep model.

### V42-01: Personnel Phase And Privilege Clarification

- Status: Awaiting Verification. Scope question, not approved new functionality.
- V42 1.5 lists personnel accounts, while table 1.2 schedules that module in Project 2. Keep already delivered accounts. Check exact role/field restrictions and the highest-admin reset rule (1.5.9.2) against StaffController before declaring complete; do not invent a new role from the wording alone.

### V42-02: Front-Desk Working Schedule Coverage

- Status: Awaiting Verification. V42 2.4.1-2.4.3 require days, start/end times and days off for both barbers and front-desk staff.
- Barber working-hours implementation is not proof of front-desk scheduling. Audit models/API/UI and verify each specified operation before closing this item; implement missing coverage only after scope review.

### V42-03: Cancelled-Slot Offer Workflow Conflict

- Status: Not Started; unresolved scope conflict. V42 5.4.2-5.4.4 specifies customer notifications, first-confirmation priority and queue movement. Later conversation specified shop-only rescheduling after contacting the customer.
- Staff rescheduling is not equivalent to the written requirement. General notifications are also scheduled in Project 2 table 1.2. Obtain explicit clarification/approved document revision; until then keep the Word requirement visible, not waived, closed or silently implemented.
- Acceptance after resolution: trace the agreed behavior to the exam document and test the complete flow, including concurrent first-confirmation handling if that requirement remains.

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

- Type: Partial. Status: Awaiting Verification. Implementation integrated into `main` at `b650b37`; full user acceptance pending.
- Finding: create/edit/disable and active-service listing APIs exist, but the frontend service-management screen was not found.
- Evidence: [ServicesController.cs](../backend/RodeoBarberShop.Api/Controllers/ServicesController.cs); [App.tsx](../frontend/src/App.tsx), service reads and staff navigation.
- Acceptance: authorized staff can create, edit and disable services from the UI; validation and loading/error states work; disabled services cannot be newly booked and existing booking snapshots remain intact. Review how inactive services are listed before adding a reactivation control.
- Implemented: Owner/Admin service workspace lists active and inactive services, supports create/edit/pause/reactivate, keeps the public endpoint active-only, and rejects duplicate names. Responsive loading, empty, success and error states are included.
- Verification: frontend build/lint pass; backend suite passes 122 with one infrastructure-dependent Postgres concurrency test skipped; five focused service-management tests cover public/admin visibility, duplicate names, soft disable and barber mappings. Read-only Supabase verification returned 26 managed services, 21 public active services and 5 inactive services. Playwright verified the 390 px and desktop layouts, editor and mapping tab without horizontal overflow. No live service data was mutated during this verification.

### S04-02: Barber Service Mapping UI

- Type: Partial. Status: Awaiting Verification. Implementation integrated into `main` at `b650b37`; full user acceptance pending.
- Finding: `UpdateBarber` accepts service IDs, but a frontend editor for this mapping was not found.
- Evidence: [BarbersController.cs](../backend/RodeoBarberShop.Api/Controllers/BarbersController.cs), `UpdateBarber`; [App.tsx](../frontend/src/App.tsx).
- Acceptance: Owner/Admin can inspect and update mappings, changes persist, and booking/rescheduling honor eligible services. Confirm the meaning of an empty mapping before changing it; current backend treats it as unrestricted.
- Implemented: the Owner/Admin workspace provides a barber selector and active-service checklist backed by a dedicated mapping endpoint, so profile/contact/availability fields are not rewritten as a side effect. Existing empty mappings remain unrestricted; the editor presents them as all active services and requires at least one choice before saving.
- Verification: focused backend tests cover persistence and rejection of duplicate, inactive and unknown service IDs. Existing booking and rescheduling eligibility rules remain the enforcement path; full live save acceptance is still pending user testing.

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
- Scope correction (2026-10-24): V42 4.2.2 explicitly requires booking without selecting a barber for shop assignment. The former uncertainty about whether it is required is resolved; exact reservation/assignment behavior remains to be designed.

### S06-03: Customer Availability Becomes Stale

- Type: Partial. Status: Done. Integrated into `main` through `df9be5a`; prior verification limits remain.
- Original finding: customer availability filtered `isAvailable` but not past start times; changing service/barber/date did not immediately clear displayed old slots. Backend rejected invalid writes, but the UI could still offer stale choices.
- Evidence: [App.tsx](../frontend/src/App.tsx), `checkAvailability`, `createBooking` and customer input handlers; [BookingsController.cs](../backend/RodeoBarberShop.Api/Controllers/BookingsController.cs), `GetAvailability` and `ValidateBookingAvailability`.
- Acceptance: changing inputs invalidates or refreshes slots; past starts cannot be selected; submitted date/barber/services match the displayed slot. Retain server-side validation for concurrent changes.
- Implemented on `feature/customer-booking-ui`: customer-only workspace extracted to `CustomerBooking.tsx`; context-keyed, abortable availability; selection cleared on service/barber/date changes; future-start guard checked during rendering and submission; explicit review before writing; conflict feedback and recheck. API validators remain unchanged.
- Follow-up after live UI acceptance: date now precedes barber selection; the list is filtered by each barber's service/date availability and future starts before selection. Customer-reported off-day barbers are no longer offered simply because they appear in the public barber catalogue. Mocked off-day/leave/full/past-only/next-day tests pass; read-only live API checks returned zero starts for the two reported barbers on 2026-09-17.
- Chair follow-up: customer selection now starts from date-effective active chair assignments. Backend availability/create/reschedule also reject an unassigned barber once any chair is configured, and shared resource conflicts derive from real chair assignments rather than hard-coded names. Verification: 117 backend tests passed, one PostgreSQL theory skipped without its database; frontend build/lint and mocked responsive flow passed.
- Live verification on 2026-10-23 used existing Customer and Owner accounts against Supabase development data. The rendered customer list exactly matched date/service availability, hid one assigned-but-unavailable barber and one no-chair barber, created a real appointment, and showed matching booking details in the Owner timeline. The appointment was cancelled through the customer UI and retained as `Cancelled`; no active test appointment remains. See [Customer Booking UI Verification](CUSTOMER_BOOKING_UI_TESTS.md). Physical-device and live concurrent-conflict checks remain limitations, not blockers for this focused item.

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
- A second live acceptance run on 2026-10-23 verified the chair/date/service filtering follow-up, matching Owner details and customer cancellation with cleanup. This closes S06-03 on the feature branch and makes the focused increment ready for integration. It does not claim physical-device, live concurrent-conflict or receipt acceptance.
- S09-01 assessment/catalogue work and S05-01 shop settings are still not implemented; merging this UI branch does not complete them.

## Priority And Scope Decisions

Current recommendation (2026-10-24): close the V42 baseline of S05-01 first,
then select from the remaining mandatory gaps using the V42 matrix. This is a
recommendation only. V42-01/02/03 and S07-01, S06-02/S08-01, S10-01 and S11
acceptance stay visible. The older recommendations below are historical and do
not override Word V42 or authorize a new feature.

- Recommended first: S06-01, because customer cancellation is a core workflow with a missing backend business rule. This is a recommendation, not permission to start edits automatically.
- Recheck S06-02/S08-01 against original scope before implementing unassigned booking.
- Do not count this list as a fresh full security audit, or treat absence of an item as proof of correctness.
- Sprint 14-17 remain visible in the sprint plan. Later work does not erase these earlier gaps.
- Latest approved direction: preserve the customer UI increment, then pursue S09-01 catalogue/assessment work. S05-01 settings are deferred, not removed. The original first-item recommendation above is historical, not an instruction to restart cancellation work.

## Closure Log

| Item ID | Status change | Verified on | Evidence / commit | Remaining limits |
| --- | --- | --- | --- | --- |
| Baseline | Review recorded; no gaps closed by this document | 2026-09-17 | Static review of `bbd8560` | Recheck before implementation |
| V42 baseline | Word becomes exam authority; phase/conflict matrix recorded | 2026-10-24 | V42 1.3 and 1.4 tables 1.1/1.2; static baseline b650b37; documentation commit pending | No new end-to-end test; V42-01/02/03 remain open |
| S04-01 / S04-02 | Implementation integrated; awaiting full live acceptance | 2026-10-24 | b650b37; prior focused backend run 10 passed; frontend build/lint passed | Earlier catalogue snapshots are historical; not full Project 1 acceptance |
| S06-03 | Integration recorded | 2026-10-24 | df9be5a is included in main at b650b37 | Prior live/emulation evidence retained; no new physical-device or concurrency run |
| S06-01 | Not Started -> Awaiting Verification | 2026-09-17 | CustomerCancellationTests.cs; frontend build; mocked browser checks; commit pending | Live customer/shop acceptance and real mobile check pending; PostgreSQL races not rerun |
| S05-01 | Approved scope expanded; remains Not Started | 2026-09-17 | User-approved operating calendar, holiday ranges/recurrence and configurable cancellation; rechecked ShopController | Settings implementation and dynamic S06-01 integration pending |
| S06-01 | Fixed-cutoff increment accepted; full item remains open | User confirmation in this session | `d5e1321`: user confirmed live customer cancellation and matching Owner status | Dynamic lead time under S05-01 pending; physical device unspecified; PostgreSQL races not rerun |
| S06-03 | Not Started -> Awaiting Verification | Customer UI redesign session | CustomerBooking.tsx; frontend/tests/customer-booking.ui.cjs; commit pending | Mocked browser checks only; redesigned live/physical-device acceptance pending |
| S06-03 | Awaiting Verification -> Done on feature branch | 2026-10-23 | Live Customer booking, exact availability filtering, matching Owner detail and customer cancellation; implementation `df9be5a` | Integration commit pending; physical device, live conflict and receipt checks remain |
