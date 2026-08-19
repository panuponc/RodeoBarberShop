# Rodeo Barber Shop Management System

Rodeo Barber Shop Management System is a web application for managing a single barber shop.

The system supports online booking, guest booking, walk-in queue management, barber scheduling, service management, counter payment recording, promotions, dashboards, notifications, and reports.

## Project Status

```text
Current Phase: Sprint 1 - Project Setup And Core Foundation
Implementation: Started
Version: 1.0
```

The current work focuses on setting up the backend, frontend, Swagger/OpenAPI, and the foundation required before implementing authentication and database features.

## Main Users

- Customer
- Guest
- Barber
- Front Desk Staff
- Owner
- Admin

## Core Features

- Customer registration and login
- Role-based access control
- Guest booking with Email OTP
- Service management
- Barber and staff management
- Online booking
- Walk-in queue management
- Barber assignment and reassignment
- Barber service workflow
- Add-on services during service
- Counter payment recording
- Cash, bank transfer, and QR Payment support
- Shop information management
- Barber working schedule
- Barber leave request and approval
- Internal website notifications
- Promotions and discounts
- Dashboard
- Reports and PDF export

## Tech Stack

| Layer | Technology |
|------|------------|
| Frontend | React + TypeScript + Vite |
| Backend | ASP.NET Core Web API |
| Runtime | .NET 9 |
| Database | Supabase PostgreSQL |
| ORM | Entity Framework Core + Npgsql |
| Authentication | JWT + Email OTP |
| Authorization | Role-based Access Control |
| Realtime | SignalR |
| Storage | Supabase Storage |
| Source Control | Git + GitHub |
| IDE | Visual Studio Code |

## Project Structure

```text
RodeoBarberShop/
  README.md
  RodeoBarberShop.sln
  backend/
    RodeoBarberShop.Api/
  frontend/
  docs/
```

Backend and frontend projects were created during Sprint 1.

## Documentation

Project documentation is stored in the `docs` folder.

| Document | Description |
|----------|-------------|
| docs/00_REQUIREMENT_CHECKLIST.md | Requirement gathering checklist |
| docs/01_PROJECT_BRIEF.md | Project overview, scope, users, and business rules |
| docs/02_TECH_STACK.md | Approved technology stack |
| docs/03_DATABASE_DESIGN.md | Database tables, relationships, rules, and indexes |
| docs/04_API_REQUIREMENTS.md | API groups, endpoints, roles, and rules |
| docs/05_SPRINT_PLAN.md | Development plan for Project 1 and Project 2 |
| docs/06_DATABASE_ERD.md | Mermaid Entity Relationship Diagram |
| docs/07_SYSTEM_FLOW.md | Main system flows and status flow |
| docs/08_DATA_FLOW_DIAGRAM.md | Context Diagram, Level 0 DFD, and Level 1 DFD |

## Recommended Reading Order

1. `docs/01_PROJECT_BRIEF.md`
2. `docs/02_TECH_STACK.md`
3. `docs/03_DATABASE_DESIGN.md`
4. `docs/06_DATABASE_ERD.md`
5. `docs/07_SYSTEM_FLOW.md`
6. `docs/08_DATA_FLOW_DIAGRAM.md`
7. `docs/04_API_REQUIREMENTS.md`
8. `docs/05_SPRINT_PLAN.md`

## Current Progress

- [x] Requirement checklist
- [x] Project brief
- [x] Tech stack
- [x] Database design
- [x] API requirements draft
- [x] Sprint plan draft
- [x] Database ERD
- [x] System flow
- [x] Data Flow Diagram
- [x] Backend project setup
- [x] Swagger/OpenAPI setup
- [x] Frontend project setup
- [x] EF Core foundation
- [x] Initial database entities
- [ ] Database migration
- [ ] Authentication implementation

## Next Steps

1. Add the real PostgreSQL or Supabase connection string.
2. Create the first database migration.
3. Apply the migration to the development database.
4. Implement authentication and role foundation.
5. Add customer registration and login APIs.
6. Connect the frontend to the backend health endpoint.

## Author

Developed by Panupong Chainet

Portfolio Project 2026

## License

This project is licensed under the MIT License.
