# API Requirements

## Version

Version: 1.0  
Status: Draft  
Backend: ASP.NET Core Web API

## Overview

This document lists the required API groups for Rodeo Barber Shop Management System.

All protected APIs require JWT authentication and role-based authorization.

## Auth APIs

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | /api/auth/register | Public | Register customer |
| POST | /api/auth/login | Public | Login |
| POST | /api/auth/logout | Authenticated | Logout client-side token session |
| GET | /api/auth/me | Authenticated | Get current user profile |
| PUT | /api/auth/me | Customer, Barber, Staff, Owner, Admin | Update own profile |
| PUT | /api/auth/change-password | Authenticated | Change own password |
| POST | /api/auth/guest-otp/send | Public | Send Email OTP for guest booking |
| POST | /api/auth/guest-otp/verify | Public | Verify guest booking OTP |

## Personnel APIs

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | /api/personnel | Owner, Admin | List personnel |
| POST | /api/personnel | Owner, Admin | Create personnel account |
| GET | /api/personnel/{id} | Owner, Admin | Get personnel detail |
| PUT | /api/personnel/{id} | Owner, Admin | Update personnel |
| PUT | /api/personnel/{id}/role | Admin | Change user role |
| PUT | /api/personnel/{id}/status | Owner, Admin | Change account status |
| POST | /api/personnel/{id}/reset-password | Owner, Admin | Reset password |

## Barber APIs

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | /api/barbers | Public | List active barbers |
| GET | /api/barbers/{id} | Public | Get barber profile |
| PUT | /api/barbers/{id} | Owner, Admin | Update barber profile |
| PUT | /api/barbers/{id}/availability | Staff, Owner, Admin | Update ready/unavailable status |
| GET | /api/barbers/{id}/schedule | Customer, Staff, Barber, Owner, Admin | Get barber schedule |
| PUT | /api/barbers/{id}/working-hours | Owner, Admin | Update weekly working hours |
| GET | /api/barbers/{id}/available-slots | Public | Get available booking slots |

## Service APIs

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | /api/services | Public | List active services |
| GET | /api/services/{id} | Public | Get service detail |
| POST | /api/services | Owner, Admin | Create service |
| PUT | /api/services/{id} | Owner, Admin | Update service |
| DELETE | /api/services/{id} | Owner, Admin | Disable or delete service |

## Booking APIs

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | /api/bookings | Customer | Create customer booking |
| POST | /api/bookings/guest | Public | Create guest booking after OTP |
| POST | /api/bookings/walk-in | Staff, Owner, Admin | Create walk-in queue |
| GET | /api/bookings/my | Customer | Get own bookings |
| GET | /api/bookings/{id} | Authorized | Get booking detail |
| POST | /api/bookings/{id}/cancel | Customer, Staff, Owner, Admin | Cancel booking |
| POST | /api/bookings/{id}/confirm | Staff, Owner, Admin | Confirm booking |
| PUT | /api/bookings/{id}/barber | Staff, Owner, Admin | Assign or change barber |
| POST | /api/bookings/{id}/services | Staff, Barber, Owner, Admin | Add service during service |
| GET | /api/bookings/availability | Public | Check available time slots |

## Queue APIs

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | /api/queue/today | Staff, Barber, Owner, Admin | Get today's queue |
| GET | /api/queue/barber/{barberId}/today | Barber, Staff, Owner, Admin | Get barber queue |
| PUT | /api/queue/{bookingId}/status | Staff, Barber, Owner, Admin | Change queue status |
| GET | /api/queue/cancelled-slot-candidates | Staff, Owner, Admin | Find customers who can move to cancelled slot |
| POST | /api/queue/{bookingId}/move-slot | Staff, Owner, Admin | Move booking to available cancelled slot |

## Payment APIs

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | /api/payments/booking/{bookingId} | Staff, Owner, Admin | Get booking payment summary |
| POST | /api/payments | Staff, Owner, Admin | Record payment |
| GET | /api/payments/{id} | Staff, Owner, Admin | Get payment detail |
| POST | /api/payments/{id}/void | Owner, Admin | Void payment |
| GET | /api/payments/{id}/receipt | Staff, Owner, Admin | Get receipt data |

## Shop APIs

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | /api/shop | Public | Get shop information |
| PUT | /api/shop | Owner, Admin | Update shop information |
| GET | /api/shop/holidays | Public | List shop holidays |
| POST | /api/shop/holidays | Owner, Admin | Create holiday |
| PUT | /api/shop/holidays/{id} | Owner, Admin | Update holiday |
| DELETE | /api/shop/holidays/{id} | Owner, Admin | Delete holiday |

## Leave APIs

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | /api/leaves | Barber | Submit leave request |
| GET | /api/leaves/my | Barber | Get own leave requests |
| GET | /api/leaves | Owner, Admin | List leave requests |
| POST | /api/leaves/{id}/approve | Owner, Admin | Approve leave request |
| POST | /api/leaves/{id}/reject | Owner, Admin | Reject leave request |
| GET | /api/leaves/{id}/affected-bookings | Owner, Admin | List bookings affected by leave |

## Notification APIs

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | /api/notifications | Authenticated | List own notifications |
| PUT | /api/notifications/{id}/read | Authenticated | Mark notification as read |
| PUT | /api/notifications/read-all | Authenticated | Mark all as read |

## Promotion APIs

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | /api/promotions | Customer, Staff, Owner, Admin | List active promotions |
| POST | /api/promotions | Owner, Admin | Create promotion |
| GET | /api/promotions/{id} | Owner, Admin | Get promotion detail |
| PUT | /api/promotions/{id} | Owner, Admin | Update promotion |
| DELETE | /api/promotions/{id} | Owner, Admin | Disable promotion |

## Dashboard APIs

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | /api/dashboard/staff/today | Staff, Owner, Admin | Staff dashboard |
| GET | /api/dashboard/owner/summary | Owner, Admin | Owner summary dashboard |

## Report APIs

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | /api/reports/revenue | Owner, Admin | Revenue report |
| GET | /api/reports/customers | Owner, Admin | Customer count report |
| GET | /api/reports/bookings | Owner, Admin | Booking statistics |
| GET | /api/reports/barbers | Owner, Admin | Barber performance report |
| GET | /api/reports/export/pdf | Owner, Admin | Export report as PDF |

## Realtime Events

SignalR should support:

- New booking created
- Walk-in customer added
- Queue status changed
- Barber assignment changed
- Booking cancelled
- Payment recorded
- Leave request submitted
- Notification created

## Common API Rules

1. Validate role permission on every protected endpoint.
2. Do not expose password hashes.
3. Validate booking overlap before creating or updating booking time/barber.
4. Validate customer cancellation deadline.
5. Validate that selected services are active.
6. Validate that selected barber can perform selected services when a barber is selected.
7. Prevent duplicate payment for the same booking.
8. Store all important status changes as events.
