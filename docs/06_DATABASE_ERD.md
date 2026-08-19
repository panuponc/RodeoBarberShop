# Database ERD

## Version

Version: 1.0  
Status: Draft  
Source: 03_DATABASE_DESIGN.md

## Overview

This document shows the Entity Relationship Diagram for Rodeo Barber Shop Management System.

The ERD is written with Mermaid so it can be viewed directly in Markdown-supported tools.

## Mermaid ERD

```mermaid
erDiagram
    users {
        uuid id PK
        varchar full_name
        varchar nickname
        varchar phone_number
        varchar email
        text password_hash
        varchar role
        varchar account_status
        text profile_image_url
        date start_date
        text note
        timestamptz created_at
        timestamptz updated_at
    }

    customer_profiles {
        uuid id PK
        uuid user_id FK
        timestamptz created_at
        timestamptz updated_at
    }

    barber_profiles {
        uuid id PK
        uuid user_id FK
        text specialty
        int experience_years
        text bio
        boolean is_available
        boolean accepts_booking
        timestamptz created_at
        timestamptz updated_at
    }

    shop_settings {
        uuid id PK
        varchar shop_name
        text address
        varchar phone_number
        text facebook_url
        text instagram_url
        varchar line_official
        text website_url
        text logo_url
        time opening_time
        time closing_time
        int booking_advance_days
        int cancellation_deadline_hours
        int slot_interval_minutes
        timestamptz created_at
        timestamptz updated_at
    }

    shop_holidays {
        uuid id PK
        varchar holiday_type
        int day_of_week
        date holiday_date
        text reason
        timestamptz created_at
        timestamptz updated_at
    }

    services {
        uuid id PK
        varchar name
        text description
        numeric price
        int duration_minutes
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    barber_services {
        uuid id PK
        uuid barber_id FK
        uuid service_id FK
        timestamptz created_at
    }

    barber_working_hours {
        uuid id PK
        uuid barber_id FK
        int day_of_week
        time start_time
        time end_time
        boolean is_working_day
        timestamptz created_at
        timestamptz updated_at
    }

    leave_requests {
        uuid id PK
        uuid barber_id FK
        varchar leave_type
        timestamptz start_at
        timestamptz end_at
        text reason
        varchar status
        uuid reviewed_by_user_id FK
        timestamptz reviewed_at
        text review_note
        timestamptz created_at
        timestamptz updated_at
    }

    bookings {
        uuid id PK
        varchar booking_number
        varchar booking_source
        uuid customer_id FK
        varchar guest_name
        varchar guest_phone_number
        varchar guest_email
        uuid barber_id FK
        timestamptz start_at
        timestamptz end_at
        int estimated_duration_minutes
        numeric subtotal_amount
        numeric discount_amount
        numeric total_amount
        varchar booking_status
        varchar payment_status
        text customer_note
        text cancel_reason
        timestamptz cancelled_at
        timestamptz checked_in_at
        timestamptz service_started_at
        timestamptz service_completed_at
        uuid created_by_user_id FK
        timestamptz created_at
        timestamptz updated_at
    }

    booking_services {
        uuid id PK
        uuid booking_id FK
        uuid service_id FK
        varchar service_name
        numeric unit_price
        int duration_minutes
        int quantity
        numeric line_total
        boolean added_during_service
        uuid added_by_user_id FK
        timestamptz created_at
    }

    queue_events {
        uuid id PK
        uuid booking_id FK
        varchar from_status
        varchar to_status
        uuid changed_by_user_id FK
        text note
        timestamptz created_at
    }

    barber_assignment_events {
        uuid id PK
        uuid booking_id FK
        uuid from_barber_id FK
        uuid to_barber_id FK
        uuid changed_by_user_id FK
        text reason
        timestamptz created_at
    }

    payments {
        uuid id PK
        uuid booking_id FK
        varchar payment_number
        varchar payment_method
        varchar payment_status
        numeric subtotal_amount
        numeric discount_amount
        numeric total_amount
        timestamptz paid_at
        uuid received_by_user_id FK
        text note
        timestamptz created_at
        timestamptz updated_at
    }

    promotions {
        uuid id PK
        varchar name
        text description
        date start_date
        date end_date
        varchar discount_type
        numeric discount_value
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    promotion_services {
        uuid id PK
        uuid promotion_id FK
        uuid service_id FK
        timestamptz created_at
    }

    notifications {
        uuid id PK
        uuid recipient_user_id FK
        varchar recipient_role
        varchar title
        text message
        varchar notification_type
        uuid related_booking_id FK
        boolean is_read
        timestamptz read_at
        timestamptz created_at
    }

    email_otps {
        uuid id PK
        varchar email
        text otp_hash
        varchar purpose
        timestamptz expires_at
        timestamptz verified_at
        timestamptz created_at
    }

    users ||--o| customer_profiles : has
    users ||--o| barber_profiles : has
    users ||--o{ bookings : customer
    users ||--o{ bookings : created_by
    users ||--o{ leave_requests : reviews
    users ||--o{ booking_services : adds
    users ||--o{ queue_events : changes
    users ||--o{ barber_assignment_events : changes
    users ||--o{ payments : receives
    users ||--o{ notifications : receives

    barber_profiles ||--o{ barber_services : can_perform
    services ||--o{ barber_services : performed_by

    barber_profiles ||--o{ barber_working_hours : works
    barber_profiles ||--o{ leave_requests : requests
    barber_profiles ||--o{ bookings : assigned_to
    barber_profiles ||--o{ barber_assignment_events : from_barber
    barber_profiles ||--o{ barber_assignment_events : to_barber

    bookings ||--o{ booking_services : contains
    services ||--o{ booking_services : selected_as

    bookings ||--o{ queue_events : has
    bookings ||--o{ barber_assignment_events : has
    bookings ||--o| payments : has_payment
    bookings ||--o{ notifications : related_to

    promotions ||--o{ promotion_services : includes
    services ||--o{ promotion_services : included_in
```

## Relationship Notes

- A user can be a customer, barber, front desk staff, owner, or admin.
- A user can have one customer profile.
- A user can have one barber profile.
- A booking can belong to a registered customer or store guest information directly.
- A booking can have no barber at first when the customer chooses shop assignment.
- A booking contains one or more booking service rows.
- Booking service rows store service name, price, and duration snapshots.
- A booking should have only one active paid payment record.
- Queue changes and barber assignment changes are stored as event history.
- Promotions can apply to multiple services.
- Notifications can target a specific user or a role.

## ERD Review Checklist

- [ ] Confirm whether one user can have both customer and barber roles.
- [ ] Confirm whether walk-in customers need reusable customer profiles.
- [ ] Confirm whether bank transfer or QR Payment needs slip image upload.
- [ ] Confirm whether promotions apply during booking or only during payment.
- [ ] Confirm whether report export needs stored report history.
