# Sprint Plan

## Version

Version: 1.0  
Status: Draft

## Overview

This sprint plan follows the approved project scope and separates work into Project 1 and Project 2.

## Project 1

Goal: Build the core management and booking system.

### Sprint 1: Project Setup And Core Foundation

- Create backend solution with ASP.NET Core Web API
- Create frontend app with React, TypeScript, and Vite
- Configure PostgreSQL connection
- Configure Entity Framework Core
- Add base entities and migrations
- Add JWT authentication foundation
- Add role-based authorization foundation

### Sprint 2: User And Authentication

- Customer registration
- Login and logout
- Current user profile API
- Customer profile update
- Password change
- Basic role authorization

### Sprint 3: Personnel And Barber Management

- Personnel account management
- Role assignment
- Account status management
- Password reset for personnel
- Barber profile management
- Barber ready/unavailable status
- Barber public listing

### Sprint 4: Service Management

- Create service
- Edit service
- Disable or delete service
- Public service list
- Barber service mapping

### Sprint 5: Shop Settings And Schedule

- Shop information management
- Opening and closing hours
- Weekly holidays
- Special holidays
- Barber weekly working hours
- Available slot calculation

### Sprint 6: Online Booking

- Customer booking flow
- Multiple service selection
- Estimated price calculation
- Estimated duration calculation
- Barber selection or unassigned booking
- Date and time selection
- Booking overlap validation
- Customer booking history
- Customer cancellation with 1-hour rule and reason

### Sprint 7: Guest Booking

- Guest booking form
- Email OTP send and verify
- Guest booking confirmation
- Guest booking validation

### Sprint 8: Front Desk Queue Management

- Today's queue view
- Booking confirmation
- Queue status update
- Walk-in customer creation
- Assign barber to unassigned booking
- Change barber with availability validation

### Sprint 9: Barber Service Flow

- Barber daily schedule
- Barber waiting queue
- Service detail view
- Start service
- Add service during service
- Recalculate duration and price
- Complete service

### Sprint 10: Counter Payment

- Waiting payment status
- Payment summary
- Cash payment
- Bank transfer payment
- QR Payment
- Record payment receiver
- Prevent duplicate payment
- Receipt or payment summary view

### Sprint 11: Project 1 Stabilization

- Fix bugs from core workflows
- Improve validation
- Improve UI consistency
- Test core booking flow
- Test queue flow
- Test payment flow
- Prepare Project 1 demo

## Project 2

Goal: Complete advanced management, dashboard, notification, promotion, and reporting features.

### Sprint 12: Dashboard

- Staff dashboard
- Today's queue summary
- Queue count per barber
- Owner dashboard
- Daily customer count
- Daily revenue
- Barber workload summary
- Service ranking

### Sprint 13: Barber Leave Management

Implementation checkpoint (2026-09-14, branch `feature/barber-leave-management`):
- Implemented: barber request submission and own request history via `/api/leaves` and `/api/leaves/my`, with pending/approved overlap validation.
- Implemented: Owner/Admin request list, affected booking preview, approve/reject with reviewer identity and notes. Approval rechecks affected booking IDs; rejection requires a reason.
- Implemented: approved leave blocks overlapping availability, customer/staff booking creation, and service extensions into leave. Pending/rejected requests do not block booking availability.
- Existing bookings are not automatically changed. The review view links to their date in the queue for manual handling; automatic reassignment/rescheduling is not implemented.
- Implemented: barber withdrawal of own pending request and cancellation request for approved leave. `CancellationPending` continues blocking availability, new bookings and extensions, and remains visible in the timeline until Owner/Admin confirms cancellation. Rejection returns it to Approved. Ended leave cannot be cancelled retroactively.
- Added migration `20260914043326_AddLeaveEvents` (applied to Development): append-only application history in `leave_events` records actor, action, note and timestamp. Original approval fields remain intact; earlier requests keep their existing review information without fabricated history.
- Implemented: staff booking form disables services exceeding the continuous free window and shows booking errors inside the sheet; schedule headers/timeline display approved leave and retained conflicting bookings.
- Implemented: leave submission and approval require remaining work time within the requested interval, respecting barber hours, shop hours and holidays. After today's work ends, the barber date picker starts tomorrow; server validation also rejects stale forms.
- Corrected workflow: Owner/Admin/FrontDeskStaff close a barber's bookings directly from today's schedule, effective immediately until the earlier of shop closing or barber shift end. Staff can reopen it; approved leave still blocks bookings. This is separate from leave requests and does not create/approve leave. Existing bookings remain untouched for customer contact. No check-in, retrospective reporting or automatic reassignment is included.
- Added migration `20260914152359_AddBarberBookingClosures` (applied to Development), preserving closure reason, period, closing actor and reopening actor/time. Removed the superseded report-unavailable leave form/endpoints.
- Closure controls are accessed through the barber avatar, not a full-width header button. Only today's currently working, bookable barbers are actionable; active leave prevents redundant closure, while an existing operational closure can be reopened without overriding leave. API also rejects off-hours, holidays and disabled booking flags. Verified avatar workflow and clock-driven removal of controls with browser emulation.
- Scope update: closures also support the selected future date (up to 366 days), covering that day's working window only. Today still requires current working hours; past dates and non-working days are rejected. Dialog and POST carry the selected date; reopening a future closure works before that day starts. Verified future-date close/reopen via backend tests and mocked responsive browser workflow. This supersedes the today-only restriction above.
- Status color agreement: black means shop closed, red means shop open but barber unavailable (off shift, disabled booking, leave or closure), green means bookable according to schedule. Shop hours are supplied separately from barber hours. Partial leave only makes today's dot red during the actual interval; non-current dates use their own planned windows. No amber or gray status dots.
- Implemented: schedule status dots and text use bookable working windows (shop hours, holidays and barber booking flags) plus blocking leave intervals. Current-day status advances with the clock; future dates describe planned availability, not attendance.
- Verified: 72 isolated backend tests (replacing the superseded leave-report tests with closure role/close/reopen/next-day/leave-preservation tests), frontend build/lint, deterministic status boundary tests, mocked schedule close/reopen workflow with responsive transitions, and read-only PostgreSQL-backed development API checks. Browser tests do not modify real leave/booking records.
- Remaining before merge/sign-off: user acceptance of the affected-booking handling workflow and real PostgreSQL concurrent approval/booking validation in an isolated test environment. This checkpoint does not claim final Sprint 13 acceptance.

- Barber leave request
- Owner approval
- Owner rejection
- Leave type and reason
- Affected booking list
- Staff action for affected bookings

- Scope correction (2026-09-15): staff may close/reopen today's bookings before opening while working time remains. Pre-opening closures cover the scheduled shift; during work they start immediately. Past dates, ended shifts, holidays and disabled booking flags remain blocked. This supersedes the current-working-hours restriction above. Existing appointments remain unchanged.

### Sprint 14: Notifications

- Internal website notification storage
- Customer booking notifications
- Customer cancellation notifications
- Barber assignment notifications
- Staff and barber queue notifications
- Appointment reminder foundation
- SignalR realtime notification updates

### Sprint 15: Promotions And Discounts

- Promotion creation
- Fixed amount discount
- Percentage discount
- Service-specific promotion
- Promotion active date range
- Apply discount to booking or payment summary

### Sprint 16: Reports And Statistics

- Revenue report
- Customer report
- Booking report
- Barber performance report
- Peak booking time report
- Payment method report
- Export report as PDF

### Sprint 17: Final Polish And Documentation

- Fix defects from Project 2
- Final UI polish
- Security review
- Database cleanup
- Prepare final report
- Update project documentation
- Prepare final presentation

## Development Priority

### Must Have

- Authentication and roles
- Service management
- Barber management
- Shop settings
- Online booking
- Queue management
- Walk-in
- Payment recording

### Should Have

- Guest booking with Email OTP
- Dashboard
- Barber leave management
- Notifications

### Could Have

- Promotions
- Detailed reports
- PDF export

## Delivery Notes

- Build and test one complete workflow before adding advanced features.
- Keep database migrations small and reviewable.
- Treat the PDF scope document as the source of truth.
- Update documents whenever scope changes.
