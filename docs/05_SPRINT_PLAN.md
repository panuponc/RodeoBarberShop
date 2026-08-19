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

- Barber leave request
- Owner approval
- Owner rejection
- Leave type and reason
- Affected booking list
- Staff action for affected bookings

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
