# Tech Stack

## Version

Version: 1.0  
Status: Approved  
Environment: Windows 10 Home + VS Code

---

## Overview

This document defines the technology stack for the Rodeo Barber Shop Booking System.

The stack is selected to support full-stack development, easy deployment, PostgreSQL database usage, realtime queue updates, and payment slip verification.

---

## Development Environment

| Tool | Version |
|------|---------|
| Operating System | Windows 10 Home |
| IDE | Visual Studio Code |
| Git | 2.36.1 |
| .NET SDK | 9.0.315 |
| Node.js | v24.18.0 |
| npm | 8.19.1 |

---

## Frontend

### Selected

- React
- TypeScript
- Vite

### Why

React is widely used, has strong ecosystem support, and works well for building modern web applications.

TypeScript helps reduce bugs by adding type safety.

Vite provides fast development startup and build performance.

### Alternatives

- Angular
- Vue
- Blazor

React was selected because it is flexible, popular, and works well with Codex and modern frontend workflows.

---

## Backend

### Selected

- ASP.NET Core Web API
- .NET 9

### Why

ASP.NET Core is suitable for building secure and scalable APIs.

It works well with Entity Framework Core, JWT authentication, SignalR, and PostgreSQL.

The project uses .NET because the developer already has experience with the Microsoft ecosystem.

### Alternatives

- Node.js Express
- NestJS
- Django
- Laravel

ASP.NET Core was selected because it fits the developer’s background and is suitable for portfolio-level full-stack projects.

---

## Database

### Selected

- Supabase PostgreSQL

### Why

Supabase provides a managed PostgreSQL database with a web dashboard.

It is easier to manage than running PostgreSQL locally and is suitable for development, testing, and deployment.

Supabase also provides Storage, which can be used to store uploaded PromptPay slip images.

### Alternatives

- SQL Server
- MySQL
- SQLite
- Local PostgreSQL with Docker

Supabase PostgreSQL was selected because it is easy to start, supports real PostgreSQL, and includes useful dashboard tools.

---

## ORM

### Selected

- Entity Framework Core
- Npgsql PostgreSQL Provider

### Why

Entity Framework Core allows the backend to work with the database using C# classes.

Migrations can be used to create and update database tables safely.

Npgsql is the PostgreSQL provider for EF Core.

---

## Authentication

### Selected

- JWT Authentication
- Role-based Access Control

### Why

JWT works well with REST APIs and frontend applications like React.

Role-based access control is required because the system has three user roles:

- Customer
- Barber
- Admin

---

## Realtime Communication

### Selected

- SignalR

### Why

SignalR allows realtime updates between the backend and frontend.

This is useful for queue updates, booking status changes, and payment verification updates.

Example use cases:

- Admin changes booking status
- Barber completes a booking
- Customer sees queue updates without refreshing the page

---

## Payment

### Selected

- Pay at Shop
- PromptPay Slip Verification
- EasySlip API

### Why

Pay at Shop is simple and suitable for normal barber shop bookings.

PromptPay with EasySlip allows the system to verify payment slips automatically without using a payment gateway.

This avoids percentage-based payment gateway fees.

### Alternatives

- Omise / Opn PromptPay Gateway
- GB Prime Pay
- Stripe
- Manual admin slip verification

EasySlip was selected for Version 1 because it supports slip verification while keeping the payment flow simple.

---

## File Storage

### Selected

- Supabase Storage

### Why

Uploaded PromptPay slips need to be stored securely.

Supabase Storage is suitable because the project already uses Supabase PostgreSQL.

Slip image URLs will be stored in the Payment table.

---

## Source Control

### Selected

- Git
- GitHub

### Why

Git is used for version control.

GitHub is used to store the repository, track commit history, and present the project as a portfolio.

---

## AI Development Tool

### Selected

- Codex in VS Code

### Why

Codex will be used as an AI coding assistant.

Codex should follow the project documentation before implementing each sprint.

Codex must not change business rules unless explicitly instructed.

---

## Final Stack Summary

| Layer | Technology |
|------|------------|
| Frontend | React + TypeScript + Vite |
| Backend | ASP.NET Core Web API |
| Runtime | .NET 9 |
| Database | Supabase PostgreSQL |
| ORM | Entity Framework Core + Npgsql |
| Authentication | JWT |
| Authorization | Role-based Access Control |
| Realtime | SignalR |
| Payment | Pay at Shop + EasySlip |
| Storage | Supabase Storage |
| Source Control | Git + GitHub |
| IDE | VS Code |
| AI Assistant | Codex |

---

## AI Development Notes

This document is the source of truth for the project technology stack.

AI assistants must follow the technologies listed in this document.

Do not replace the selected stack unless explicitly instructed.
