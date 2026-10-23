# V42 Scope And Exam Baseline

## Authority

- Reviewed on 2026-10-24 against `Rodeo_Barber_Shop_V42.docx`, supplied by the user at `C:/Users/ASUS/Downloads/Rodeo_Barber_Shop_V42.docx`.
- Source: chapter 1, section 1.3 (requirements), and section 1.4, tables 1.1 and 1.2 (Project 1/2 delivery allocation). Clause numbers below are the numbers inside section 1.3.
- The Word file is the exam scope authority, superseding the earlier PDF and any conflicting Markdown plan. The original Word file was read only, not edited or copied into Git.
- Implementation baseline: `b650b37`, integrated into `main`. This is a documentation/static-code reconciliation, not a new end-to-end acceptance test.
- Keep already implemented Project 2 features. Early delivery is not a reason to remove functionality or declare Project 1 complete.
- Sprint numbers are engineering work IDs, not Word section numbers or proof of phase completion.

## Project 1 Traceability

Table 1.1 schedules the eight functional groups below for Project 1. Do not downgrade a listed subrequirement to optional just because its implementation is missing.

| V42 clause | Required outcome | Current evidence and remaining acceptance | Tracking |
| --- | --- | --- | --- |
| 1.1-1.4 | Registration, login/logout, role access, customer profile editing/password/history | AuthController, App.tsx and CustomerBooking.tsx provide related flows. Recheck every field, ownership and negative role case; not a blanket acceptance claim. | S11-01 |
| 1.5 | Personnel accounts, field details, role restrictions, activation and password resets | StaffController and staff UI exist. Table 1.2 explicitly schedules personnel-account management for Project 2, despite its placement under group 1. Retain early implementation; verify scope interpretation and exact privileges, including the highest-admin reset clause 1.5.9.2. | V42-01, S11-01 |
| 2.1-2.3 | Staff/barber details, readiness/off-work controls and public barber information | StaffController, BarbersController, BarberBookingClosuresController and customer selection exist. Field-by-field checks remain, including photos, experience and public availability. | S11-01 |
| 2.4.1-2.4.3 | Working days, start/end times and days off for both barbers AND front-desk staff | Barber working-hours implementation exists. This must not be used as proof that front-desk staff scheduling is complete; separately audit the latter. | V42-02 |
| 3.1-3.4 | Create/edit services, details, price, estimated duration, open/closed status, remove retired services, customer listing | ServiceManagement.tsx and ServicesController integrated in b650b37. Focused backend tests passed 10 cases in the prior run. Deletion is soft disable: verify that retiring a service satisfies 3.3.2 while retaining historical bookings. Full live CRUD/permission acceptance remains. | S04-01, S11-01 |
| 4.1, 4.2.1, 4.3-4.5 | Select service/barber/date/time, estimates, minimum one-hour service booking, no past/closed/off-work/overlapping booking, confirmation details | CustomerBooking.tsx and BookingsController implement named-barber booking. Previous customer live checks and b650b37 front-desk date fix provide focused evidence only. Verify all V42 boundaries and recorded details. The 12-hour maximum is a shop agreement, not a V42 requirement. | S06-03, S11-01 |
| 4.2.2 | Customer can omit the barber and let the shop assign one | Current named-barber flow is not sufficient. V42 explicitly requires this option; decide capacity reservation and assignment workflow without silently substituting random automatic assignment. | S06-02, S08-01 |
| 4.6.1-4.6.4 | Own booking details/status/history; cancellation at least one hour before service with reason; no customer self-rescheduling | Fixed one-hour cancellation has prior implementation/acceptance evidence. Recheck exact boundary and ownership for the exam. Configurable cancellation lead time is an additional agreement, not the V42 baseline. | S06-01 |
| 4.7.1 | Guest enters contact details and verifies Email OTP before confirming a booking | EmailOtp entity is not a working public OTP flow. Controller/UI delivery and verification were not found in this review. Staff-created guest appointments do not satisfy this clause. | S07-01 |
| 5.1-5.3, 5.4.1 | Daily queue details, walk-in entry, queue statuses and waiting queue display | App.tsx, QueueController and BookingsController provide queue workflows. Cancelled history and past-date booking fixes are in b650b37. Audit all specified statuses, including NoShow, and front-desk permissions. | S11-01 |
| 5.4.2-5.4.4 | Notify eligible customers of a cancelled slot; first customer to confirm obtains it; update moved appointment | Conflicts with the later conversation agreeing staff-controlled moves after a phone call. Staff rescheduling alone does not satisfy this wording. Do not implement or discard the conflicting workflow without resolution; the Word obligation stays visible. | V42-03 |
| 5.5.1-5.5.3 | Assign an unassigned queue and change barber after availability checks | Staff rescheduling exists. Initial assignment of a genuinely unassigned booking still needs the 4.2.2 design and acceptance. | S08-01 |
| 6.1-6.2 | Own schedule/waiting queue/customer/service details; barber or staff can add services without overlap | BarberQueue, BarberAddServices and queue APIs provide related flows. Verify BOTH staff and barber add-service paths. Hierarchical assessment substeps are an additional shop agreement, not required by this wording. | S11-01; extra work S09-01 |
| 7.1-7.6 | Counter checkout, waiting-payment state, items/prices/discount/net total, cash/bank transfer/QR, receiver/time, no duplicate payment, itemized summary | PaymentsController supports methods; App.tsx confirmPayment still submits QrPayment. A complete front-desk method selector and acceptance of displayed bank account/discount/receipt fields remain. Barber cash checkout does not establish front-desk acceptance. | S10-01, S11-01 |
| 8.1-8.2.3 | Shop name/address/phone/contact/hours/logo, operating days, weekly and special holidays | ShopController has basic settings and weekly/single-date holiday APIs. Owner management UI and end-to-end availability integration remain incomplete. Range/annual recurrence are additional agreed details, not explicit V42 requirements. | S05-01 |

## Project 2 Allocation

Table 1.2 schedules personnel-account management, basic dashboards (9), barber schedules/leave (10), notifications (11), promotions (12), reports/statistics/PDF (13), Project 1 defect correction and final documentation.

- Personnel accounts and leave/rescheduling already have implementation; retain them and their historical verification.
- Group 2.4 working hours and group 10.1 weekly schedules overlap. Do not defer basic Project 1 schedule validation merely because group 10 appears in Project 2.
- Group 5.4 references notifications while general notifications are scheduled in Project 2. This is an explicit phase-dependency question, not permission to erase 5.4 from Project 1.
- Group 7.3.3 requires discount display in the payment summary. A full promotion engine is separately scheduled in Project 2; do not conflate them.

## Additional Shop Agreements

Preserve these as approved engineering follow-ups, but do not call them verbatim V42 exam requirements:

- Configurable cancellation cutoff; V42 specifies a fixed one-hour minimum.
- Holiday date ranges, cross-year closure and annual recurrence; V42 explicitly specifies weekly/special holidays, not these mechanisms.
- Per-weekday shop-hour variants and affected-booking preview are expanded implementation details for settings.
- Internal service-assessment steps, flexible substep durations/prices and the current catalogue choices: see SERVICE_ASSESSMENT_SCOPE.md. A 1-12 whole-hour editor rule is a shop decision; V42 only states a minimum one-hour booking per service.
- Chair-sharing/standby and barber checkout already delivered may support actual shop operation; keep them without substituting them for missing explicit clauses.

## Conflicts And Evidence Rules

1. V42 section 1.3 and delivery tables define required scope. Chapters 4/5 describe results/limitations; their claims of passed tests do not replace reproducible evidence against current code. Chapter 5 says customer booking needs further work, while table 1.1 still schedules online booking in Project 1.
2. V42-01: resolve personnel-account phase placement and exact highest-admin permissions without assuming a new super-admin role.
3. V42-02: audit front-desk work scheduling separately from barber scheduling before marking group 2 complete.
4. V42-03: obtain a decision on 5.4.2-5.4.4 and its Project 2 notification dependency. Until an approved Word revision/clarification exists, retain the V42 requirement as unresolved, not waived or implemented.
5. No new feature implementation is authorized by this reconciliation. Use the existing gap IDs and a focused branch after the user selects work.
6. Before the exam, record clause-level expected/actual outcomes and evidence under S11-01, then a repeatable rehearsal under S11-02. Distinguish static inspection, automated tests, browser emulation, live data and physical devices.

## Next Work Recommendation

Start with the V42 baseline of S05-01 (8.1-8.2.3): shop information, opening/closing hours and weekly/special holidays, with booking enforcement. It is explicitly Project 1 work and has reusable APIs. This recommendation does not authorize implementation or require completing annual recurrence first.

Keep S07-01, S06-02/S08-01, S10-01, V42-02 and V42-03 visible as outstanding work/decisions; finishing settings alone will not complete Project 1.
