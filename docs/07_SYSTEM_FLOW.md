# System Flow

## Version

Version: 1.0  
Status: Draft  
Source: Approved project scope document

## Overview

This document describes the main system flows for Rodeo Barber Shop Management System.

The flows are written with Mermaid so they can be previewed in Markdown-supported tools.

## Main System Flow

```mermaid
flowchart TD
    A([Start]) --> B{User Type}

    B -->|Customer| C[Register or Login]
    B -->|Guest| D[Verify Email OTP]
    B -->|Front Desk Staff| E[Login]
    B -->|Barber| F[Login]
    B -->|Owner/Admin| G[Login]

    C --> H[Browse Services and Barbers]
    D --> H
    H --> I[Create Booking]
    I --> J[System Checks Availability]
    J -->|Available| K[Save Booking]
    J -->|Not Available| H
    K --> L[Notify Customer and Staff]

    E --> M[Manage Today's Queue]
    M --> N[Add Walk-in or Confirm Booking]
    N --> O[Assign or Change Barber]
    O --> P[Update Queue Status]

    F --> Q[View Own Schedule]
    Q --> R[Start Service]
    R --> S[Add Extra Service if Needed]
    S --> T[Complete Service]

    T --> U[Waiting Payment]
    P --> U
    U --> V[Front Desk Records Payment]
    V --> W[Booking Completed]

    G --> X[Manage Shop Data]
    X --> Y[Manage Personnel, Services, Schedule, Promotions]
    Y --> Z[View Dashboard and Reports]

    W --> AA([End])
    Z --> AA
```

## Customer Booking Flow

```mermaid
flowchart TD
    A([Start]) --> B[Customer Login]
    B --> C[View Services]
    C --> D[Select One or More Services]
    D --> E[System Calculates Estimated Price and Duration]
    E --> F{Choose Barber?}
    F -->|Yes| G[Select Barber]
    F -->|No| H[Leave Barber Unassigned]
    G --> I[Select Date and Time]
    H --> I
    I --> J[System Checks Shop Hours]
    J --> K[System Checks Barber Working Hours]
    K --> L[System Checks Existing Bookings]
    L --> M{Available?}
    M -->|No| I
    M -->|Yes| N[Confirm Booking]
    N --> O[Save Booking as PendingConfirmation]
    O --> P[Show Booking Detail]
    P --> Q[Send Internal Notification]
    Q --> R([End])
```

## Guest Booking Flow

```mermaid
flowchart TD
    A([Start]) --> B[Guest Selects Services]
    B --> C[Guest Selects Barber or Shop Assignment]
    C --> D[Guest Selects Date and Time]
    D --> E[Guest Enters Name, Phone, Email]
    E --> F[System Sends Email OTP]
    F --> G[Guest Enters OTP]
    G --> H{OTP Valid?}
    H -->|No| G
    H -->|Yes| I[System Checks Availability]
    I --> J{Available?}
    J -->|No| D
    J -->|Yes| K[Save Guest Booking]
    K --> L[Show Booking Detail]
    L --> M[Send Internal Notification]
    M --> N([End])
```

## Customer Cancellation Flow

```mermaid
flowchart TD
    A([Start]) --> B[Customer Opens Booking Detail]
    B --> C[Customer Clicks Cancel Booking]
    C --> D[System Checks Appointment Time]
    D --> E{At Least 1 Hour Before Appointment?}
    E -->|No| F[Show Cancellation Not Allowed]
    E -->|Yes| G[Customer Enters Cancellation Reason]
    G --> H[System Updates Booking to Cancelled]
    H --> I[System Creates Queue Event]
    I --> J[Notify Staff]
    J --> K[Find Possible Customers for Cancelled Slot]
    K --> L([End])
    F --> L
```

## Front Desk Queue Flow

```mermaid
flowchart TD
    A([Start]) --> B[Staff Login]
    B --> C[Open Today's Queue]
    C --> D{Action}

    D -->|Confirm Booking| E[Set Status to Confirmed]
    D -->|Add Walk-in| F[Enter Walk-in Customer and Service]
    D -->|Assign Barber| G[Select Available Barber]
    D -->|Change Status| H[Update Queue Status]
    D -->|Change Barber| I[Select Replacement Barber]

    F --> J[System Checks Availability]
    G --> J
    I --> J
    J --> K{Available?}
    K -->|No| C
    K -->|Yes| L[Save Queue Update]

    E --> M[Create Queue Event]
    H --> M
    L --> M
    M --> N[Send Realtime Queue Update]
    N --> C
```

## Barber Service Flow

```mermaid
flowchart TD
    A([Start]) --> B[Barber Login]
    B --> C[View Today's Schedule]
    C --> D[Open Booking Detail]
    D --> E[Start Service]
    E --> F[Set Status to InService]
    F --> G{Need Extra Service?}
    G -->|No| H[Complete Service]
    G -->|Yes| I[Select Extra Service]
    I --> J[System Recalculates Duration and Price]
    J --> K[System Checks Overlap]
    K --> L{Still Available?}
    L -->|No| G
    L -->|Yes| M[Add Booking Service]
    M --> H
    H --> N[Set Status to WaitingPayment]
    N --> O[Notify Front Desk]
    O --> P([End])
```

## Payment Flow

```mermaid
flowchart TD
    A([Start]) --> B[Staff Opens Waiting Payment Booking]
    B --> C[System Shows Service Summary]
    C --> D[System Shows Subtotal, Discount, Total]
    D --> E[Staff Selects Payment Method]
    E --> F{Payment Method}
    F -->|Cash| G[Record Cash Payment]
    F -->|Bank Transfer| H[Record Bank Transfer Payment]
    F -->|QR Payment| I[Record QR Payment]
    G --> J[System Checks Duplicate Payment]
    H --> J
    I --> J
    J --> K{Already Paid?}
    K -->|Yes| L[Reject Duplicate Payment]
    K -->|No| M[Save Payment]
    M --> N[Set Payment Status to Paid]
    N --> O[Set Booking Status to Completed]
    O --> P[Show Receipt Summary]
    P --> Q([End])
    L --> Q
```

## Personnel And Role Management Flow

```mermaid
flowchart TD
    A([Start]) --> B[Owner or Admin Login]
    B --> C[Open Personnel Management]
    C --> D{Action}
    D -->|Create Account| E[Enter Personnel Information]
    D -->|Update Account| F[Edit Personnel Information]
    D -->|Change Status| G[Select Account Status]
    D -->|Reset Password| H[Generate Initial Password]
    D -->|Change Role| I[Assign Role]

    E --> J[Validate Permission]
    F --> J
    G --> J
    H --> J
    I --> J

    J --> K{Allowed?}
    K -->|No| L[Reject Action]
    K -->|Yes| M[Save Changes]
    M --> N[Notify Related User if Needed]
    N --> O([End])
    L --> O
```

## Barber Leave Flow

```mermaid
flowchart TD
    A([Start]) --> B[Barber Login]
    B --> C[Submit Leave Request]
    C --> D[System Saves Request as Pending]
    D --> E[Notify Owner]
    E --> F[Owner Reviews Request]
    F --> G{Decision}
    G -->|Reject| H[Set Leave Status to Rejected]
    G -->|Approve| I[Set Leave Status to Approved]
    I --> J[System Finds Affected Bookings]
    J --> K[Show Affected Bookings to Staff]
    K --> L[Staff Changes Barber, Changes Time, Cancels, or Contacts Customer]
    H --> M[Notify Barber]
    L --> M
    M --> N([End])
```

## Promotion Flow

```mermaid
flowchart TD
    A([Start]) --> B[Owner or Admin Login]
    B --> C[Create or Edit Promotion]
    C --> D[Set Name and Description]
    D --> E[Set Start and End Date]
    E --> F[Set Discount Type and Value]
    F --> G[Select Participating Services]
    G --> H[Save Promotion]
    H --> I[System Applies Active Promotion During Booking or Payment Summary]
    I --> J([End])
```

## Report Flow

```mermaid
flowchart TD
    A([Start]) --> B[Owner or Admin Login]
    B --> C[Open Reports]
    C --> D{Report Type}
    D -->|Revenue| E[Generate Revenue Report]
    D -->|Customers| F[Generate Customer Report]
    D -->|Bookings| G[Generate Booking Report]
    D -->|Barbers| H[Generate Barber Performance Report]
    E --> I[Display Report]
    F --> I
    G --> I
    H --> I
    I --> J{Export PDF?}
    J -->|No| K([End])
    J -->|Yes| L[Generate PDF File]
    L --> K
```

## Status Flow

```mermaid
stateDiagram-v2
    [*] --> PendingConfirmation
    PendingConfirmation --> Confirmed
    PendingConfirmation --> Cancelled
    Confirmed --> WaitingService
    Confirmed --> Cancelled
    WaitingService --> InService
    WaitingService --> NoShow
    WaitingService --> Cancelled
    InService --> WaitingPayment
    WaitingPayment --> Completed
    Completed --> [*]
    Cancelled --> [*]
    NoShow --> [*]
```

## Notes

- The system flow is based on the approved project scope.
- Some flows may be adjusted after detailed UI and API design.
- The next document should be the Data Flow Diagram.
