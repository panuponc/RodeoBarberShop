# Data Flow Diagram

## Version

Version: 1.0  
Status: Draft  
Source: Approved project scope document

## Overview

This document describes the Data Flow Diagram for Rodeo Barber Shop Management System.

The diagrams are written with Mermaid so they can be previewed in Markdown-supported tools.

## External Entities

| Entity | Description |
|--------|-------------|
| Customer | Registered customer who books and manages appointments |
| Guest | Non-registered customer who books with Email OTP |
| Barber | Barber who views schedule, manages service status, and submits leave |
| Front Desk Staff | Staff who manages queue, walk-ins, barber assignment, and payment |
| Owner | Shop owner who manages business data, schedules, dashboard, and reports |
| Admin | System administrator with full management permission |
| Email Service | External service used to send OTP and notifications |

## Data Stores

| Data Store | Description |
|------------|-------------|
| D1 Users | User accounts, roles, account status, password hashes |
| D2 Profiles | Customer and barber profile information |
| D3 Services | Service list, price, duration, active status |
| D4 Shop Settings | Shop information, opening hours, holidays |
| D5 Schedules | Barber working hours and leave requests |
| D6 Bookings | Online bookings, guest bookings, walk-ins, queue status |
| D7 Booking Services | Selected services and add-on services per booking |
| D8 Payments | Payment records, methods, totals, receiver |
| D9 Promotions | Promotions and participating services |
| D10 Notifications | Internal website notifications |
| D11 Events | Queue and barber assignment event history |
| D12 OTP Records | Guest booking OTP hashes and verification status |

## Context Diagram

```mermaid
flowchart LR
    Customer[Customer]
    Guest[Guest]
    Barber[Barber]
    Staff[Front Desk Staff]
    Owner[Owner]
    Admin[Admin]
    Email[Email Service]

    System((Rodeo Barber Shop Management System))

    Customer -->|Register, login, booking request, cancellation request| System
    System -->|Booking detail, status, notifications| Customer

    Guest -->|Guest booking data, OTP verification| System
    System -->|OTP request, booking detail| Guest

    Barber -->|Service status update, leave request| System
    System -->|Schedule, queue, notifications| Barber

    Staff -->|Queue update, walk-in, payment, barber assignment| System
    System -->|Today's queue, payment summary, notifications| Staff

    Owner -->|Manage shop, services, personnel, schedule, promotions| System
    System -->|Dashboard, reports, leave requests| Owner

    Admin -->|Manage users, roles, settings| System
    System -->|System data, reports| Admin

    System -->|Send OTP and notification email| Email
    Email -->|Delivery status| System
```

## Level 0 DFD

```mermaid
flowchart TD
    Customer[Customer]
    Guest[Guest]
    Barber[Barber]
    Staff[Front Desk Staff]
    Owner[Owner]
    Admin[Admin]
    Email[Email Service]

    P1((1.0 User And Auth))
    P2((2.0 Booking And Queue))
    P3((3.0 Barber Service))
    P4((4.0 Payment))
    P5((5.0 Management))
    P6((6.0 Notification))
    P7((7.0 Dashboard And Report))

    D1[(D1 Users)]
    D2[(D2 Profiles)]
    D3[(D3 Services)]
    D4[(D4 Shop Settings)]
    D5[(D5 Schedules)]
    D6[(D6 Bookings)]
    D7[(D7 Booking Services)]
    D8[(D8 Payments)]
    D9[(D9 Promotions)]
    D10[(D10 Notifications)]
    D11[(D11 Events)]
    D12[(D12 OTP Records)]

    Customer -->|Register, login, profile update| P1
    Guest -->|Email, OTP code| P1
    Barber -->|Login, profile update| P1
    Staff -->|Login| P1
    Owner -->|Login| P1
    Admin -->|Login, role management| P1
    P1 <--> D1
    P1 <--> D2
    P1 <--> D12
    P1 -->|Send OTP| Email

    Customer -->|Booking request, cancellation| P2
    Guest -->|Guest booking request| P2
    Staff -->|Walk-in, queue update, barber assignment| P2
    P2 <--> D3
    P2 <--> D4
    P2 <--> D5
    P2 <--> D6
    P2 <--> D7
    P2 <--> D11
    P2 --> P6

    Barber -->|Start service, add service, complete service| P3
    Staff -->|Add service during service| P3
    P3 <--> D6
    P3 <--> D7
    P3 <--> D3
    P3 <--> D11
    P3 --> P6

    Staff -->|Payment method and amount| P4
    P4 <--> D6
    P4 <--> D7
    P4 <--> D8
    P4 --> P6

    Owner -->|Manage personnel, services, schedules, shop, promotions| P5
    Admin -->|Manage all system data| P5
    Barber -->|Leave request| P5
    P5 <--> D1
    P5 <--> D2
    P5 <--> D3
    P5 <--> D4
    P5 <--> D5
    P5 <--> D9
    P5 --> P6

    P6 <--> D10
    P6 -->|Internal notifications| Customer
    P6 -->|Internal notifications| Barber
    P6 -->|Internal notifications| Staff
    P6 -->|Internal notifications| Owner

    Owner -->|Report filters| P7
    Admin -->|Report filters| P7
    P7 <--> D6
    P7 <--> D7
    P7 <--> D8
    P7 <--> D9
    P7 -->|Dashboard and reports| Owner
    P7 -->|Dashboard and reports| Admin
```

## Level 1: User And Auth

```mermaid
flowchart TD
    Customer[Customer]
    Guest[Guest]
    StaffUser[Personnel User]
    Admin[Admin]
    Email[Email Service]

    P11((1.1 Register Customer))
    P12((1.2 Login))
    P13((1.3 Manage Profile))
    P14((1.4 Manage Personnel Account))
    P15((1.5 Guest Email OTP))

    D1[(D1 Users)]
    D2[(D2 Profiles)]
    D12[(D12 OTP Records)]

    Customer -->|Registration data| P11
    P11 -->|Create user| D1
    P11 -->|Create customer profile| D2

    Customer -->|Email or phone, password| P12
    StaffUser -->|Email, password| P12
    P12 <--> D1
    P12 -->|JWT token and role| Customer
    P12 -->|JWT token and role| StaffUser

    Customer -->|Profile changes| P13
    StaffUser -->|Profile changes| P13
    P13 <--> D1
    P13 <--> D2

    Admin -->|Personnel data, role, status| P14
    P14 <--> D1
    P14 <--> D2

    Guest -->|Email| P15
    P15 -->|Store OTP hash| D12
    P15 -->|Send OTP| Email
    Guest -->|OTP code| P15
    P15 -->|Verification result| Guest
```

## Level 1: Booking And Queue

```mermaid
flowchart TD
    Customer[Customer]
    Guest[Guest]
    Staff[Front Desk Staff]

    P21((2.1 Select Services))
    P22((2.2 Check Availability))
    P23((2.3 Create Booking))
    P24((2.4 Cancel Booking))
    P25((2.5 Manage Queue))
    P26((2.6 Assign Or Change Barber))

    D3[(D3 Services)]
    D4[(D4 Shop Settings)]
    D5[(D5 Schedules)]
    D6[(D6 Bookings)]
    D7[(D7 Booking Services)]
    D11[(D11 Events)]

    Customer -->|Selected services| P21
    Guest -->|Selected services| P21
    Staff -->|Walk-in services| P21
    P21 <--> D3
    P21 -->|Estimated price and duration| P22

    P22 <--> D4
    P22 <--> D5
    P22 <--> D6
    P22 -->|Availability result| P23

    Customer -->|Booking data| P23
    Guest -->|Guest booking data| P23
    Staff -->|Walk-in data| P23
    P23 -->|Save booking| D6
    P23 -->|Save selected services| D7
    P23 -->|Create event| D11

    Customer -->|Cancellation request and reason| P24
    P24 <--> D6
    P24 -->|Create cancellation event| D11

    Staff -->|Queue status change| P25
    P25 <--> D6
    P25 -->|Create queue event| D11

    Staff -->|Barber assignment request| P26
    P26 <--> D5
    P26 <--> D6
    P26 -->|Create assignment event| D11
```

## Level 1: Barber Service And Payment

```mermaid
flowchart TD
    Barber[Barber]
    Staff[Front Desk Staff]

    P31((3.1 Start Service))
    P32((3.2 Add Extra Service))
    P33((3.3 Complete Service))
    P41((4.1 Summarize Payment))
    P42((4.2 Record Payment))

    D3[(D3 Services)]
    D6[(D6 Bookings)]
    D7[(D7 Booking Services)]
    D8[(D8 Payments)]
    D11[(D11 Events)]

    Barber -->|Start selected booking| P31
    P31 <--> D6
    P31 -->|Create status event| D11

    Barber -->|Extra service request| P32
    Staff -->|Extra service request| P32
    P32 <--> D3
    P32 <--> D6
    P32 -->|Save add-on service| D7
    P32 -->|Create service event| D11

    Barber -->|Complete service| P33
    P33 <--> D6
    P33 -->|Set waiting payment| D11

    Staff -->|Open payment summary| P41
    P41 <--> D6
    P41 <--> D7
    P41 -->|Subtotal, discount, total| Staff

    Staff -->|Payment method, receiver, paid amount| P42
    P42 <--> D6
    P42 -->|Save payment| D8
    P42 -->|Create payment event| D11
```

## Level 1: Management

```mermaid
flowchart TD
    Owner[Owner]
    Admin[Admin]
    Barber[Barber]

    P51((5.1 Manage Shop Data))
    P52((5.2 Manage Services))
    P53((5.3 Manage Barber Schedule))
    P54((5.4 Manage Leave Request))
    P55((5.5 Manage Promotions))

    D3[(D3 Services)]
    D4[(D4 Shop Settings)]
    D5[(D5 Schedules)]
    D6[(D6 Bookings)]
    D9[(D9 Promotions)]
    D10[(D10 Notifications)]

    Owner -->|Shop data| P51
    Admin -->|Shop data| P51
    P51 <--> D4

    Owner -->|Service data| P52
    Admin -->|Service data| P52
    P52 <--> D3

    Owner -->|Working hours| P53
    Admin -->|Working hours| P53
    P53 <--> D5

    Barber -->|Leave request| P54
    Owner -->|Approve or reject| P54
    P54 <--> D5
    P54 <--> D6
    P54 -->|Affected booking notification| D10

    Owner -->|Promotion data| P55
    Admin -->|Promotion data| P55
    P55 <--> D9
```

## Level 1: Dashboard And Report

```mermaid
flowchart TD
    Staff[Front Desk Staff]
    Owner[Owner]
    Admin[Admin]

    P71((7.1 Staff Dashboard))
    P72((7.2 Owner Dashboard))
    P73((7.3 Reports))
    P74((7.4 Export PDF))

    D6[(D6 Bookings)]
    D7[(D7 Booking Services)]
    D8[(D8 Payments)]
    D9[(D9 Promotions)]

    Staff -->|Today filter| P71
    P71 <--> D6
    P71 <--> D7
    P71 -->|Today's queue summary| Staff

    Owner -->|Dashboard filter| P72
    P72 <--> D6
    P72 <--> D7
    P72 <--> D8
    P72 -->|Customer count, revenue, barber workload, service ranking| Owner

    Owner -->|Report filters| P73
    Admin -->|Report filters| P73
    P73 <--> D6
    P73 <--> D7
    P73 <--> D8
    P73 <--> D9
    P73 -->|Report data| Owner
    P73 -->|Report data| Admin

    P73 -->|Selected report data| P74
    P74 -->|PDF file| Owner
    P74 -->|PDF file| Admin
```

## Data Flow Notes

1. Passwords and OTP values must be stored as hashes only.
2. Booking creation must read services, shop settings, barber schedules, leave records, and existing bookings before saving.
3. Queue status changes must update bookings and create event history.
4. Payment recording must check for an existing paid payment before saving.
5. Report APIs should read from booking, booking service, payment, and promotion data.
6. Notifications should be stored in the database and pushed through realtime communication when available.

## Open Questions

1. Which email provider will be used for OTP?
2. Does QR Payment require slip image upload?
3. Should PDF exports be stored, or generated on demand only?
4. Should staff be able to edit guest customer contact data after booking?
5. Should cancelled slot notifications be sent by internal notification only or email too?
