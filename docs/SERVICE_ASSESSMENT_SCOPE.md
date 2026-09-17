# Service Catalogue And In-Shop Assessment

## Status And Scope

Approved requirements from the customer-UI follow-up discussion. Implementation
has not started. Track this cross-sprint work as S09-01 in
[Implementation Gap Review](IMPLEMENTATION_GAP_REVIEW.md), covering catalogue
changes (Sprint 4), customer booking presentation (Sprint 6), assessment/service
work (Sprints 8-9), and billing (Sprint 10).

The customer-UI branch does not implement this system. Preserve and review that
increment before starting a focused service-assessment branch. Shop settings
(S05-01) remain planned, not cancelled by this change in priority.

## Customer-Facing Catalogue

Replace the active catalogue with these seven main services, exactly as requested.
Retire old services from new bookings without deleting historical booking lines,
payments or receipts. Inspect barber-service mappings and existing future
appointments before changing active services; do not rewrite their snapshots.

| Main service | Price (THB) | Initial reserved time |
| --- | --- | --- |
| ตัด-สระ-เซ็ต(ชาย) | 300 | 60 minutes |
| ตัดผมหญิง | 400 | 60 minutes |
| ดัดวอลลุ่ม | 1,200 | 180 minutes |
| ดัดหยิก | 1,200 | 180 minutes |
| ดัดฟอยล์ | 1,200 | 180 minutes |
| ยืดวอลลุ่ม | 1,500 | 180 minutes |
| ทำสีแฟชั่น | Assessed at the shop | 180 minutes |

The user's explicit list takes precedence over additional services, prices or
schedule details visible in the supplied shop poster. Do not change staff
schedules or introduce extra services merely because they appear in that image.

## Visibility And Workflow

- Before booking, customers select only main services. Fashion colouring displays
  `ประเมินราคาที่ร้าน`, reserves three hours, and can be booked without a final price.
- Do not expose substep selection, assessment forms or substep time inputs in the
  pre-booking customer flow. Customers do not need to plan the treatment themselves.
- After arrival, either a barber OR shop staff can assess the work, explain the
  procedure, price and time to the customer, and enter the agreed work in the shop UI.
- Do not restrict assessment to barbers alone. Define exact role/booking ownership
  checks using the existing role model before implementation; record the acting user.
- Add substeps under the relevant booked main service, such as bleaching, colouring,
  treatment or another named procedure. Support a variable number of steps, including
  ten or more; no fixed three-step template or mandatory public subservice menu.
- Retain the distinction between an internal assessment interface and customer-facing
  billing. Receipt detail must clearly explain agreed charges, without making the
  assessment interface part of pre-booking.

## Time Rules

- Substeps have no initial duration. Leave the time blank when all work fits the
  main service's reserved time; adding a substep must not automatically add an hour.
- When time is specified, use whole-hour increments: 1, 2, 3 hours, etc. The field
  means time used by that step, NOT an extra amount added to the initial reservation.
- For each main service: effective duration = max(initial reserved duration,
  sum of its explicitly entered substep durations). Blank step durations do not
  add time. This calculation never shortens below the main service's initial time.
- For a booking containing multiple main services, sum each main service's effective
  duration. Substeps of one main service must not absorb time reserved for another.
- Example: fashion colouring reserves 3 hours; bleach 1 + colour 2 + treatment 1
  gives 4 hours total, extending the booking by 1 hour, not by 4 hours.
- Example: ten steps totalling 10 hours give 10 hours for that main service, not
  13 hours. A separate one-hour haircut would make the booking 11 hours.
- Preview the old and new appointment end times and actual extension before saving.
  Check other bookings, shared capacity, barber schedules, leave, booking closures
  and shop operating hours using existing availability rules.
- Revalidate atomically when saving. If the extension conflicts, reject it with a
  useful explanation. Do not move/cancel other bookings or extend across days
  automatically. Editing/removing steps and already-extended bookings needs explicit
  validation; do not silently lose work, time or charges on a failed save.

## Price And Payment Rules

- Unknown price is a real unresolved state, not zero. Customer summaries combining
  fixed-price services with colouring must say the known amount PLUS an amount to
  be assessed, rather than present the known amount as the full booking price.
- Staff/barbers enter assessed charge lines after discussing the work with the
  customer. Avoid charging a main-service price again through its included substeps.
- Confirm the exact rule for included versus separately charged steps before coding
  billing. Fixed-price main services must not be silently converted to unknown price.
- Payment cannot be finalized while a required assessed price is unresolved. Enforce
  this in backend payment validation as well as UI; preserve existing duplicate-payment
  protection, payment corrections, receipt snapshots and historical prices.

## Acceptance Checklist

- Seven active main services with the agreed prices/durations; retired catalogue
  absent from new selection; old bookings, receipts and mappings handled deliberately.
- Customer can book a main service without seeing assessment controls; unknown price
  is not rendered or charged as free, including mixed-service totals.
- Both authorized staff and barber workflows can assess after arrival; customers and
  unauthorized actors cannot edit assessment data; changes have actor/audit evidence.
- Blank durations retain the base reservation; 1+2+1 produces four hours; ten-hour
  step totals and multiple main services follow the per-service max/sum formula.
- Preview/save agree; conflicting or concurrent extension is rejected without partial
  schedule/price changes; shop closures and shared capacity are respected.
- Assessed charges do not double-count included work; unresolved amounts block payment;
  receipt and payment totals match the agreed assessment.
- Verify responsive shop/barber assessment forms, errors, retries and existing service
  add/checkout flows. This document is scope, not evidence that these checks have passed.
