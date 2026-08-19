# Database Design

## Version

Version: 1.0  
Status: Draft  
Database: Supabase PostgreSQL  
ORM: Entity Framework Core

## Overview

This database design follows the approved project scope for Rodeo Barber Shop Management System.

The design supports:

- Single shop
- Registered customers and guest bookings
- Admin, owner, front desk staff, barber, and customer roles
- Personnel management
- Multiple services per booking
- Barber assignment
- Walk-in queue
- Counter payment
- Promotions and discounts
- Barber schedule and leave
- Internal notifications
- Dashboards and reports

## Naming Conventions

- Table names: plural snake_case
- Column names: snake_case
- Primary key column: id
- Primary key type: uuid
- Timestamp type: timestamptz
- Timezone: Asia/Bangkok

## Enumerations

### User Roles

```text
Customer
Barber
FrontDeskStaff
Owner
Admin
```

### Account Status

```text
PendingActivation
Active
Suspended
Resigned
Disabled
```

### Booking Status

```text
PendingConfirmation
Confirmed
WaitingService
InService
WaitingPayment
Completed
Cancelled
NoShow
```

### Booking Source

```text
Online
Guest
WalkIn
StaffCreated
```

### Payment Method

```text
Cash
BankTransfer
QrPayment
```

### Payment Status

```text
Unpaid
Paid
Voided
Refunded
```

### Leave Status

```text
Pending
Approved
Rejected
Cancelled
```

### Discount Type

```text
FixedAmount
Percentage
```

## Tables

## users

Stores login accounts for registered customers and shop personnel.

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | uuid | Yes | Primary key |
| full_name | varchar(150) | Yes | Full name |
| nickname | varchar(100) | No | Optional display name |
| phone_number | varchar(30) | Yes | Contact phone |
| email | varchar(255) | Yes | Login and contact email |
| password_hash | text | Yes | Hashed password |
| role | varchar(30) | Yes | Customer, Barber, FrontDeskStaff, Owner, Admin |
| account_status | varchar(30) | Yes | Account status |
| profile_image_url | text | No | Supabase Storage URL |
| start_date | date | No | Personnel start date |
| note | text | No | Internal note |
| created_at | timestamptz | Yes | Created timestamp |
| updated_at | timestamptz | Yes | Updated timestamp |

### Constraints

- email should be unique.
- phone_number should be indexed.

## customer_profiles

Stores customer-specific profile data.

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | uuid | Yes | Primary key |
| user_id | uuid | Yes | FK to users.id |
| created_at | timestamptz | Yes | Created timestamp |
| updated_at | timestamptz | Yes | Updated timestamp |

## barber_profiles

Stores barber-specific public and internal information.

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | uuid | Yes | Primary key |
| user_id | uuid | Yes | FK to users.id |
| specialty | text | No | Barber specialty |
| experience_years | int | No | Experience |
| bio | text | No | Public bio |
| is_available | boolean | Yes | Ready for service |
| accepts_booking | boolean | Yes | Can receive bookings |
| created_at | timestamptz | Yes | Created timestamp |
| updated_at | timestamptz | Yes | Updated timestamp |

## shop_settings

Stores single-shop basic information and configuration.

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | uuid | Yes | Primary key |
| shop_name | varchar(150) | Yes | Shop name |
| address | text | No | Shop address |
| phone_number | varchar(30) | No | Shop phone |
| facebook_url | text | No | Contact channel |
| instagram_url | text | No | Contact channel |
| line_official | varchar(100) | No | Contact channel |
| website_url | text | No | Contact channel |
| logo_url | text | No | Supabase Storage URL |
| opening_time | time | Yes | Default opening time |
| closing_time | time | Yes | Default closing time |
| booking_advance_days | int | Yes | How far customers can book |
| cancellation_deadline_hours | int | Yes | Default 1 hour |
| slot_interval_minutes | int | Yes | Default 60 minutes |
| created_at | timestamptz | Yes | Created timestamp |
| updated_at | timestamptz | Yes | Updated timestamp |

## shop_holidays

Stores weekly and special shop holidays.

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | uuid | Yes | Primary key |
| holiday_type | varchar(30) | Yes | Weekly, Special |
| day_of_week | int | No | 0 = Sunday, 6 = Saturday |
| holiday_date | date | No | Special holiday date |
| reason | text | No | Optional reason |
| created_at | timestamptz | Yes | Created timestamp |
| updated_at | timestamptz | Yes | Updated timestamp |

## services

Stores shop services.

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | uuid | Yes | Primary key |
| name | varchar(150) | Yes | Service name |
| description | text | No | Service description |
| price | numeric(10,2) | Yes | Base price |
| duration_minutes | int | Yes | Estimated duration, minimum 60 minutes |
| is_active | boolean | Yes | Visible and bookable |
| created_at | timestamptz | Yes | Created timestamp |
| updated_at | timestamptz | Yes | Updated timestamp |

## barber_services

Maps services that each barber can perform.

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | uuid | Yes | Primary key |
| barber_id | uuid | Yes | FK to barber_profiles.id |
| service_id | uuid | Yes | FK to services.id |
| created_at | timestamptz | Yes | Created timestamp |

### Constraints

- Unique pair: barber_id + service_id

## barber_working_hours

Stores weekly recurring working hours for each barber.

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | uuid | Yes | Primary key |
| barber_id | uuid | Yes | FK to barber_profiles.id |
| day_of_week | int | Yes | 0 = Sunday, 6 = Saturday |
| start_time | time | Yes | Local start time |
| end_time | time | Yes | Local end time |
| is_working_day | boolean | Yes | Working day flag |
| created_at | timestamptz | Yes | Created timestamp |
| updated_at | timestamptz | Yes | Updated timestamp |

## leave_requests

Stores barber leave requests and owner approval decisions.

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | uuid | Yes | Primary key |
| barber_id | uuid | Yes | FK to barber_profiles.id |
| leave_type | varchar(50) | Yes | Leave type |
| start_at | timestamptz | Yes | Leave start |
| end_at | timestamptz | Yes | Leave end |
| reason | text | Yes | Leave reason |
| status | varchar(30) | Yes | Pending, Approved, Rejected, Cancelled |
| reviewed_by_user_id | uuid | No | FK to users.id |
| reviewed_at | timestamptz | No | Review timestamp |
| review_note | text | No | Owner note |
| created_at | timestamptz | Yes | Created timestamp |
| updated_at | timestamptz | Yes | Updated timestamp |

## bookings

Stores appointments, guest bookings, walk-ins, and queue records.

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | uuid | Yes | Primary key |
| booking_number | varchar(30) | Yes | Human-readable booking code |
| booking_source | varchar(30) | Yes | Online, Guest, WalkIn, StaffCreated |
| customer_id | uuid | No | FK to users.id for registered customer |
| guest_name | varchar(150) | No | Required for guest or walk-in |
| guest_phone_number | varchar(30) | No | Required for guest or walk-in |
| guest_email | varchar(255) | No | Required for guest booking |
| barber_id | uuid | No | FK to barber_profiles.id, nullable when unassigned |
| start_at | timestamptz | Yes | Appointment start |
| end_at | timestamptz | Yes | Appointment end |
| estimated_duration_minutes | int | Yes | Sum of selected services |
| subtotal_amount | numeric(10,2) | Yes | Sum before discount |
| discount_amount | numeric(10,2) | Yes | Default 0 |
| total_amount | numeric(10,2) | Yes | Net total |
| booking_status | varchar(30) | Yes | Queue status |
| payment_status | varchar(30) | Yes | Payment status |
| customer_note | text | No | Customer note |
| cancel_reason | text | No | Required when customer cancels |
| cancelled_at | timestamptz | No | Cancellation timestamp |
| checked_in_at | timestamptz | No | Check-in timestamp |
| service_started_at | timestamptz | No | Service start |
| service_completed_at | timestamptz | No | Service completed |
| created_by_user_id | uuid | No | FK to users.id |
| created_at | timestamptz | Yes | Created timestamp |
| updated_at | timestamptz | Yes | Updated timestamp |

### Notes

- customer_id is required for registered customer booking.
- guest fields are required for guest and walk-in booking.
- barber_id can be null when the customer lets the shop assign a barber.

## booking_services

Stores selected services for each booking.

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | uuid | Yes | Primary key |
| booking_id | uuid | Yes | FK to bookings.id |
| service_id | uuid | Yes | FK to services.id |
| service_name | varchar(150) | Yes | Snapshot at booking time |
| unit_price | numeric(10,2) | Yes | Snapshot at booking time |
| duration_minutes | int | Yes | Snapshot at booking time |
| quantity | int | Yes | Default 1 |
| line_total | numeric(10,2) | Yes | unit_price * quantity |
| added_during_service | boolean | Yes | True for add-on service |
| added_by_user_id | uuid | No | FK to users.id |
| created_at | timestamptz | Yes | Created timestamp |

## queue_events

Stores queue and booking status changes.

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | uuid | Yes | Primary key |
| booking_id | uuid | Yes | FK to bookings.id |
| from_status | varchar(30) | No | Previous status |
| to_status | varchar(30) | Yes | New status |
| changed_by_user_id | uuid | No | FK to users.id |
| note | text | No | Optional note |
| created_at | timestamptz | Yes | Event timestamp |

## barber_assignment_events

Stores barber assignment and reassignment history.

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | uuid | Yes | Primary key |
| booking_id | uuid | Yes | FK to bookings.id |
| from_barber_id | uuid | No | Previous barber |
| to_barber_id | uuid | No | New barber |
| changed_by_user_id | uuid | Yes | Staff, owner, or admin |
| reason | text | No | Reason for reassignment |
| created_at | timestamptz | Yes | Event timestamp |

## payments

Stores counter payment records.

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | uuid | Yes | Primary key |
| booking_id | uuid | Yes | FK to bookings.id |
| payment_number | varchar(30) | Yes | Human-readable payment code |
| payment_method | varchar(30) | Yes | Cash, BankTransfer, QrPayment |
| payment_status | varchar(30) | Yes | Paid, Voided, Refunded |
| subtotal_amount | numeric(10,2) | Yes | Before discount |
| discount_amount | numeric(10,2) | Yes | Discount amount |
| total_amount | numeric(10,2) | Yes | Net amount |
| paid_at | timestamptz | Yes | Payment timestamp |
| received_by_user_id | uuid | Yes | FK to users.id |
| note | text | No | Optional note |
| created_at | timestamptz | Yes | Created timestamp |
| updated_at | timestamptz | Yes | Updated timestamp |

### Constraints

- booking_id should be unique for active paid payment records.

## promotions

Stores promotion campaigns.

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | uuid | Yes | Primary key |
| name | varchar(150) | Yes | Promotion name |
| description | text | No | Promotion details |
| start_date | date | Yes | Start date |
| end_date | date | Yes | End date |
| discount_type | varchar(30) | Yes | FixedAmount or Percentage |
| discount_value | numeric(10,2) | Yes | Discount value |
| is_active | boolean | Yes | Active flag |
| created_at | timestamptz | Yes | Created timestamp |
| updated_at | timestamptz | Yes | Updated timestamp |

## promotion_services

Maps promotions to participating services.

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | uuid | Yes | Primary key |
| promotion_id | uuid | Yes | FK to promotions.id |
| service_id | uuid | Yes | FK to services.id |
| created_at | timestamptz | Yes | Created timestamp |

## notifications

Stores internal website notifications.

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | uuid | Yes | Primary key |
| recipient_user_id | uuid | No | FK to users.id |
| recipient_role | varchar(30) | No | Optional role broadcast |
| title | varchar(150) | Yes | Notification title |
| message | text | Yes | Notification body |
| notification_type | varchar(50) | Yes | Booking, Queue, Payment, Leave, System |
| related_booking_id | uuid | No | FK to bookings.id |
| is_read | boolean | Yes | Default false |
| read_at | timestamptz | No | Read timestamp |
| created_at | timestamptz | Yes | Created timestamp |

## email_otps

Stores temporary OTP records for guest booking verification.

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | uuid | Yes | Primary key |
| email | varchar(255) | Yes | Guest email |
| otp_hash | text | Yes | Hashed OTP only |
| purpose | varchar(50) | Yes | GuestBooking |
| expires_at | timestamptz | Yes | Expiration timestamp |
| verified_at | timestamptz | No | Verification timestamp |
| created_at | timestamptz | Yes | Created timestamp |

## Relationship Summary

| Relationship | Type |
|--------------|------|
| users -> customer_profiles | One-to-one |
| users -> barber_profiles | One-to-one |
| barber_profiles -> barber_services | One-to-many |
| services -> barber_services | One-to-many |
| barber_profiles -> barber_working_hours | One-to-many |
| barber_profiles -> leave_requests | One-to-many |
| users -> leave_requests | One-to-many as reviewer |
| users -> bookings | One-to-many as customer |
| barber_profiles -> bookings | One-to-many |
| bookings -> booking_services | One-to-many |
| services -> booking_services | One-to-many |
| bookings -> queue_events | One-to-many |
| bookings -> barber_assignment_events | One-to-many |
| bookings -> payments | One-to-one active payment |
| promotions -> promotion_services | One-to-many |
| services -> promotion_services | One-to-many |
| users -> notifications | One-to-many |

## Important Indexes

| Table | Columns | Purpose |
|-------|---------|---------|
| users | email | Login lookup |
| users | phone_number | Customer lookup |
| users | role, account_status | Personnel filtering |
| barber_profiles | user_id | Barber profile lookup |
| services | is_active | Public service list |
| barber_services | barber_id, service_id | Service availability |
| barber_working_hours | barber_id, day_of_week | Schedule lookup |
| leave_requests | barber_id, start_at, end_at | Availability and leave lookup |
| bookings | start_at | Daily queue |
| bookings | barber_id, start_at, end_at | Overlap checking |
| bookings | customer_id, start_at | Customer history |
| bookings | booking_status | Queue filtering |
| booking_services | booking_id | Booking details |
| payments | booking_id | Payment lookup |
| promotions | start_date, end_date, is_active | Promotion lookup |
| notifications | recipient_user_id, is_read | User notification list |
| email_otps | email, purpose, expires_at | OTP verification |

## Booking Overlap Rule

Active statuses that block barber availability:

```text
PendingConfirmation
Confirmed
WaitingService
InService
WaitingPayment
```

Non-blocking statuses:

```text
Completed
Cancelled
NoShow
```

Overlap condition:

```text
existing.start_at < new.end_at
AND existing.end_at > new.start_at
```

The backend must check this when:

- Creating an online booking
- Creating a guest booking
- Adding a walk-in customer
- Assigning or changing a barber
- Adding a service during service
- Approving barber leave that affects existing bookings

## Cancellation Rule

Customers can cancel only when:

```text
appointment_start_time - current_time >= 1 hour
```

The customer must provide a cancellation reason.

## Initial Seed Data

Recommended seed data:

1. Admin account
2. Owner account
3. Front desk staff account
4. Sample barber accounts
5. Sample services
6. Barber service mappings
7. Barber working hours
8. Shop settings
9. Sample promotions

## Open Questions

These should be confirmed before implementation:

1. Exact shop opening and closing hours
2. Weekly shop holidays
3. Special holiday rules
4. Booking advance limit
5. Exact QR Payment method details
6. Whether bank transfer needs slip upload in Version 1
7. Whether report PDF export is required in Project 1 or Project 2
8. Whether notifications are realtime only or also stored history
