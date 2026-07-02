# Project Brief

## Project Name

Rodeo Barber Shop Booking System

## Overview

Rodeo Barber Shop Booking System is a web application for a single barber shop.

The system allows customers to book haircut appointments online, choose a barber, choose a service, select an available time slot, and choose a payment method.

The system also helps barbers and administrators manage bookings, queue status, services, barbers, working hours, and payments.

## Business Goal

The main goal is to reduce manual booking work for the barber shop and provide a smoother appointment experience for customers.

## Target Users

### Customer

Customers use the system to:

- Register and login
- View services
- View barbers
- Book appointments
- Choose payment method
- View booking history
- Cancel bookings

### Barber

Barbers use the system to:

- View today’s bookings
- View upcoming bookings
- Start service
- Complete service

### Admin

Admins use the system to:

- Manage services
- Manage barbers
- Manage bookings
- Manage working hours
- View dashboard
- Manage payment status

## Project Scope

This project is designed for one barber shop only.

Shop name:

```text
Rodeo Barber Shop
```

The system supports:

- Single shop
- Multiple barbers
- Multiple services
- Online booking
- Queue management
- Payment tracking
- PromptPay slip verification with EasySlip

The system does not support multi-branch or multi-shop management in Version 1.

## Main Features

### Authentication

- Customer registration
- Login
- JWT authentication
- Role-based access control

### Booking

- Select service
- Select barber
- Select date
- Select available time slot
- Create booking
- Cancel booking
- Prevent overlapping bookings

### Queue Management

- Admin can view today’s queue
- Barber can view assigned bookings
- Barber can start service
- Barber can complete service
- Booking status updates in realtime

### Payment

The system supports two payment methods:

1. Pay at Shop
2. PromptPay Slip Verification

### Pay at Shop

Customer books an appointment and pays at the shop.

Booking status:

```text
Confirmed
```

Payment status:

```text
Unpaid
```

### PromptPay Slip Verification

Customer transfers money using PromptPay and uploads the payment slip.

The system sends the slip to EasySlip API for verification.

If verification succeeds:

```text
Booking Status = Confirmed
Payment Status = Paid
```

If verification fails:

```text
Booking Status = PendingPayment
Payment Status = Rejected
```

## Booking Status

The system uses the following booking statuses:

```text
PendingPayment
Confirmed
CheckedIn
InProgress
Completed
Cancelled
NoShow
```

## Payment Status

The system uses the following payment statuses:

```text
Unpaid
PendingVerification
Paid
Rejected
Refunded
```

## Business Rules

1. Customers can book only during shop working hours.
2. Customers can book only active services.
3. Customers can book only active barbers.
4. The booking duration is based on the selected service duration.
5. A barber cannot have overlapping bookings.
6. Customers can cancel bookings before the appointment time.
7. Admin can cancel any booking.
8. Admin can mark a booking as NoShow.
9. Barbers can only update bookings assigned to themselves.
10. Pay at Shop bookings are confirmed immediately.
11. PromptPay bookings require slip verification.
12. PromptPay slip amount must match the booking total price.
13. A PromptPay slip transaction must not be reused.
14. Payment API keys must not be hard-coded.

## Version 1 Limitations

Version 1 does not include:

- Multi-shop support
- Multi-branch support
- Membership system
- Promotion system
- Online refund automation
- Native mobile application
- Advanced AI recommendation

## Success Criteria

The project is considered successful when:

- Customers can book appointments online
- The system prevents duplicate or overlapping bookings
- Admin can manage services, barbers, and bookings
- Barbers can manage their own assigned bookings
- Pay at Shop works correctly
- PromptPay slip verification flow works correctly
- The project can be shown as a full-stack portfolio project

## Project Status

```text
Planning
```