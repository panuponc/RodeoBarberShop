# Project Brief

## Project Name

Rodeo Barber Shop Management System

## Source Document

This project brief is based on the approved project scope document:

```text
2569-1-O1007_01_ระบบจัดการร้านตัดผม Rodeo Barber Shop3.pdf
```

## Overview

Rodeo Barber Shop Management System is a web application for managing a single barber shop.

The system supports customer booking, guest booking, barber queue management, staff front-desk operations, service management, shop information management, payment recording, promotions, notifications, dashboards, and reports.

## Objectives

1. Design and develop a management system for Rodeo Barber Shop.
2. Design and develop a barber booking and queue system for Rodeo Barber Shop.

## Keywords

```text
Web Application
Booking Queue
Barber Management
```

## Target Users

### Customer

Customers can:

- Register an account
- Login and logout
- View and edit personal information
- Change password
- View services
- View barber profiles and availability
- Book appointments
- Book as a guest with Email OTP
- View booking details and booking status
- View booking history
- Cancel bookings with a reason

### Guest

Guests can:

- Select services
- Select a barber or let the shop assign one
- Select appointment date and time
- Enter name, phone number, and email
- Verify identity with Email OTP
- Confirm a booking

### Barber

Barbers can:

- View their own schedule
- View today's assigned queue
- View waiting customers
- View customer and service details
- Edit their own profile
- Submit leave requests

### Front Desk Staff

Front desk staff can:

- View and manage today's queue
- Add walk-in customers
- Confirm or cancel bookings
- Assign or change barbers
- Change queue status
- Add services during service
- Record payments
- View staff dashboard data

### Owner

Owners can:

- Manage staff and barber accounts
- Manage services
- Manage shop information
- Manage barber schedules
- Approve or reject barber leave requests
- View dashboards
- View revenue and reports

### Admin

Admins can:

- Manage all user accounts
- Create owner accounts
- Assign or change user roles
- Reset user passwords
- Manage system settings
- Manage shop data
- Access all admin-level features

## Project Scope

This project is designed for one barber shop only:

```text
Rodeo Barber Shop
```

The system supports:

- User registration and authentication
- Role-based access control
- Customer profile management
- Personnel account management
- Barber and staff profile management
- Service management
- Online booking
- Guest booking with Email OTP
- Queue management
- Walk-in customer handling
- Barber work tracking
- Add-on services during service
- Front-desk payment recording
- Shop information management
- Barber schedule and leave management
- Internal website notifications
- Promotions and discounts
- Dashboards
- Reports and statistics

The system does not support multi-branch or multi-shop management in the current scope.

## Main Features

### User And Authentication

- Customer registration with name, phone number, email, and password
- Login and logout
- Role-based access control
- Customer profile update
- Password change
- Personnel account creation and management
- Account status management
- Password reset by authorized roles

### Personnel Management

- Manage admins, owners, front desk staff, and barbers
- Store full name, nickname, phone number, email, profile image, specialty, experience, start date, status, and notes
- Activate, suspend, resign, or disable personnel accounts

### Service Management

- Create services such as haircut, kids haircut, shampoo, shaving, styling, and hair coloring
- Store service name, description, price, estimated duration, and active status
- Edit or remove inactive services
- Display service list to customers

### Online Booking

- Select one or more services
- Calculate estimated total price
- Calculate estimated service duration
- Select a specific barber or let the shop assign one
- Select date and time
- Show only available dates and time slots
- Prevent past bookings
- Prevent bookings during shop closed hours
- Prevent bookings during barber unavailable hours
- Prevent overlapping bookings
- Store booking number, customer, services, barber, appointment time, total price, and booking status

### Customer Booking Management

- View booking details
- View booking status
- View booking history
- Cancel bookings at least 1 hour before appointment time
- Cancellation requires a reason
- Customers cannot directly edit appointment date and time; they must cancel and create a new booking

### Guest Booking

- Guests can book without registration
- Guest booking requires name, phone number, email, and Email OTP verification

### Front Desk Queue Management

- View today's queue
- View appointment time, customer, services, assigned barber, and queue status
- Add walk-in customers
- Change queue status
- Assign barbers to unassigned bookings
- Change assigned barber in emergency cases
- Check barber availability before changing barber
- Notify customers when a cancelled slot becomes available
- Let the first confirming customer move into the cancelled slot

### Barber Service Flow

- Barber views today's schedule and waiting queue
- Barber views customer and selected service details
- Barber or staff can add services during service
- System recalculates price and duration
- System checks that added service duration does not overlap another booking

### Payment

Payment is handled at the counter after service is completed.

Supported payment methods:

- Cash
- Bank transfer
- QR Payment

Front desk staff can:

- Change service status to waiting for payment
- Summarize service items
- View service prices, discount, and net total
- Select payment method
- Record payment date and time
- Record payment receiver
- Mark booking as paid
- Prevent duplicate payment records
- Show receipt or payment summary details

### Shop Information

- Manage shop name
- Manage shop address
- Manage phone number
- Manage contact channels
- Manage opening and closing hours
- Manage shop logo
- Manage weekly holidays
- Manage special holidays

### Dashboard

Front desk dashboard:

- Today's queue
- Queue count per barber
- Service details per queue
- Queue status

Owner dashboard:

- Daily customer count
- Daily revenue
- Daily workload per barber
- Service ranking by selected service count

### Barber Schedule And Leave

- Manage weekly barber working days and working hours
- Barbers can submit leave requests
- Owners can approve or reject leave requests
- Leave requests store leave type, dates, and reason
- System shows bookings affected by approved barber leave
- Staff can change barber, change time, cancel booking, or contact customers

### Notifications

The system supports internal website notifications.

Customer notifications:

- Booking created
- Booking confirmed
- Barber changed
- Appointment time changed
- Booking cancelled
- Appointment reminder

Staff and barber notifications:

- New booking
- New walk-in customer
- Upcoming next queue
- Booking cancellation

### Promotions And Discounts

- Create promotions
- Set promotion name, description, start date, end date, discount type, discount value, and participating services
- Support fixed amount discount
- Support percentage discount
- Support service-specific discount

### Reports And Statistics

Reports include:

- Daily revenue
- Monthly revenue
- Revenue by service
- Revenue by barber
- Revenue by payment method
- Daily customer count
- Advance booking customer count
- Walk-in customer count
- New customer count
- Returning customer count
- Total booking count
- Completed booking count
- Cancelled booking count
- No-show count
- Peak booking time
- Barber job count
- Barber revenue
- Average service duration per barber
- Direct barber selection count
- Export report as PDF

## Booking Status

The system uses the following booking statuses:

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

## Payment Status

The system uses the following payment statuses:

```text
Unpaid
Paid
Voided
Refunded
```

## Business Rules

1. Customers can book only active services.
2. Customers can select at least one service.
3. Customers can select a barber or leave the barber unassigned for staff assignment.
4. Minimum booking duration per service is 1 hour.
5. The system must calculate total estimated price from selected services.
6. The system must calculate total estimated duration from selected services.
7. The system must not allow past bookings.
8. The system must not allow bookings outside shop working hours.
9. The system must not allow bookings during barber unavailable hours.
10. The system must prevent overlapping bookings.
11. Customers can cancel bookings at least 1 hour before appointment time.
12. Customers must provide a cancellation reason.
13. Customers cannot edit appointment date and time directly.
14. Walk-in customers can be added by front desk staff.
15. Staff must check barber availability before assigning or changing a barber.
16. Payment can be recorded only once for a completed service bill.
17. Barbers can submit leave requests.
18. Owners can approve or reject barber leave requests.
19. The system must show bookings affected by approved barber leave.

## Project Plan Summary

### Project 1

- Propose project topic
- Study current process and plan work
- Analyze and design the system
- Prepare System Flow
- Prepare Data Flow Diagram
- Design database
- Prepare Entity Relationship Diagram
- Develop core system features:
  - User and authentication
  - Barber and staff information management
  - Service management
  - Online booking
  - Front-desk queue management
  - Barber service flow
  - Payment recording
  - Shop information management

### Project 2

- Fix issues from Project 1
- Continue analysis and design
- Prepare remaining Data Flow Diagram
- Develop additional features:
  - Personnel account management
  - Dashboard
  - Barber schedule and leave
  - Notifications
  - Promotions and discounts
  - Reports and statistics
- Prepare final report and revise documents

## Project Status

```text
Planning
```
