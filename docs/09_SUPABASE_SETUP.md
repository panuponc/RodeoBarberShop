# Supabase Setup

## Version

Version: 1.0  
Status: Draft  
Database: Supabase PostgreSQL  
Backend: ASP.NET Core Web API + Entity Framework Core

## Overview

This document explains how to create and connect a Supabase PostgreSQL database for Rodeo Barber Shop Management System.

Use this guide when the project is ready to create the first real database migration and test authentication APIs.

## What Is Supabase?

Supabase is a managed backend platform that provides PostgreSQL database hosting, a web dashboard, authentication tools, storage, and other backend services.

For this project, we use Supabase mainly for:

- PostgreSQL database
- Database dashboard
- Storage later for barber photos and shop logo

The ASP.NET Core backend still owns the API logic, authentication flow, and business rules.

## Before Starting

You need:

- A Supabase account
- A Supabase project
- Database password
- Connection string from the Supabase dashboard
- This project opened in VS Code

## Step 1: Create A Supabase Account

1. Go to:

```text
https://supabase.com
```

2. Sign up or log in.
3. Open the Supabase Dashboard.

## Step 2: Create A New Project

1. Click `New project`.
2. Select or create an organization.
3. Enter project name:

```text
rodeo-barber-shop
```

4. Create a database password.
5. Choose a region close to your users.
6. Click `Create new project`.

Keep the database password somewhere safe. Do not commit it to Git.

## Step 3: Find The Connection String

In the Supabase project dashboard:

1. Click `Connect`.
2. Open the `Connection string` section.
3. Choose a connection mode.

Supabase provides multiple connection modes:

| Mode | Typical Port | Use Case |
|------|--------------|----------|
| Direct connection | 5432 | Migrations, database tools, long-lived backend connections |
| Session pooler | 5432 | Good fallback when direct connection is not available on IPv4 networks |
| Transaction pooler | 6543 | Serverless or short-lived connections |

For this project during development, start with:

```text
Session pooler
```

If direct connection works on your network, direct connection is also fine for migrations.

## Step 4: Convert Supabase URL To Npgsql Format

Supabase may show a URL like:

```text
postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```

ASP.NET Core Npgsql commonly uses this format:

```text
Host=aws-0-ap-southeast-1.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.xxxxx;Password=YOUR_PASSWORD;SSL Mode=Require;Trust Server Certificate=true
```

Replace:

- `Host`
- `Port`
- `Username`
- `Password`
- `Database`

with the values from Supabase.

## Step 5: Store The Connection String Safely

For local development, use .NET user secrets instead of committing the real password.

From the backend project folder:

```bash
cd backend/RodeoBarberShop.Api
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=YOUR_HOST;Port=5432;Database=postgres;Username=YOUR_USERNAME;Password=YOUR_PASSWORD;SSL Mode=Require;Trust Server Certificate=true"
```

Do not put the real Supabase password in:

```text
appsettings.json
appsettings.Development.json
```

Those files are committed to Git.

## Current Placeholder

The project currently has a local placeholder in `appsettings.Development.json`:

```text
Host=localhost;Port=5432;Database=rodeo_barber_shop;Username=postgres;Password=postgres
```

This is only a development placeholder.

When user secrets are configured, the secret value overrides this placeholder.

## Step 6: Install EF Core CLI Tool

Check whether `dotnet ef` is available:

```bash
dotnet ef --version
```

If it is not installed:

```bash
dotnet tool install --global dotnet-ef --version 9.*
```

If it is already installed but old:

```bash
dotnet tool update --global dotnet-ef --version 9.*
```

## Step 7: Create The First Migration

From the repository root:

```bash
dotnet ef migrations add InitialCreate --project backend/RodeoBarberShop.Api --startup-project backend/RodeoBarberShop.Api
```

This creates migration files under the backend project.

Review the generated migration before applying it.

## Step 8: Apply Migration To Supabase

From the repository root:

```bash
dotnet ef database update --project backend/RodeoBarberShop.Api --startup-project backend/RodeoBarberShop.Api
```

This creates the tables in Supabase PostgreSQL.

EF Core will also create a migration history table:

```text
__EFMigrationsHistory
```

## Step 9: Verify Tables In Supabase

In the Supabase Dashboard:

1. Open your project.
2. Go to `Table Editor`.
3. Confirm that tables exist, such as:

```text
users
customer_profiles
barber_profiles
services
bookings
booking_services
payments
promotions
notifications
```

## Step 10: Test Backend Connection

Run the backend:

```bash
cd backend/RodeoBarberShop.Api
dotnet run
```

Open Swagger:

```text
http://localhost:PORT/swagger
```

Test:

```text
GET /api/health
```

Then test:

```text
POST /api/auth/register
POST /api/auth/login
GET /api/auth/me
```

## Example Register Request

```json
{
  "fullName": "Test Customer",
  "phoneNumber": "0812345678",
  "email": "customer@example.com",
  "password": "Password123!"
}
```

## Example Login Request

```json
{
  "email": "customer@example.com",
  "password": "Password123!"
}
```

After login, copy the `accessToken`.

In Swagger:

1. Click `Authorize`.
2. Paste the token.
3. Call:

```text
GET /api/auth/me
```

## Common Problems

## Password Is Wrong

Error examples:

```text
password authentication failed
```

Fix:

- Check the database password.
- Reset the database password in Supabase if needed.
- Update user secrets.

## Cannot Connect To Direct Host

Direct Supabase database connections may require IPv6 unless the project has IPv4 support.

Fix:

- Use the `Session pooler` connection string from Supabase.

## SSL Error

Use:

```text
SSL Mode=Require;Trust Server Certificate=true
```

## Migration Command Not Found

If this fails:

```bash
dotnet ef --version
```

Install EF Core CLI:

```bash
dotnet tool install --global dotnet-ef --version 9.*
```

## Safety Rules

1. Never commit real database passwords.
2. Never commit production JWT secrets.
3. Use user secrets for local development.
4. Use hosting environment variables for deployment.
5. Review generated migrations before applying them.
6. Do not run destructive database commands unless you understand the effect.

## References

- Supabase Database Connection Docs: https://supabase.com/docs/guides/database/connecting-to-postgres
- EF Core Migrations Overview: https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/
- EF Core CLI Reference: https://learn.microsoft.com/en-us/ef/core/cli/dotnet
