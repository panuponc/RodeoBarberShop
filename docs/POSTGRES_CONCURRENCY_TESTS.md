# PostgreSQL Concurrency Tests

## Safety

These tests do not read application settings or development credentials. They require
`RODEO_TEST_POSTGRES` and reject any host other than `127.0.0.1`, port other than
`55439`, or database marker other than `rodeo_concurrency_test`.

Use a disposable local PostgreSQL instance, never a tunnel to a shared database.
Each case creates a unique `rodeo_concurrency_<guid>` database, builds the EF model
with `EnsureCreated`, seeds synthetic data, then drops that database in cleanup.
The configured account needs permission to create and drop these databases.
This validates the current EF model, not migration upgrades.

## Run

Start the disposable PostgreSQL instance on loopback port 55439 first. For the
portable instance prepared in this workspace:

```powershell
.tmp/pgsql/bin/pg_ctl.exe -D D:/Project/RodeoBarberShop/.tmp/postgres-concurrency-data -l D:/Project/RodeoBarberShop/.tmp/postgres-concurrency.log -o "-h 127.0.0.1 -p 55439" -w start
```

Set the test-only connection in the same terminal:

```powershell
$env:RODEO_TEST_POSTGRES = 'Host=127.0.0.1;Port=55439;Database=rodeo_concurrency_test;Username=postgres;Pooling=false'
```

```powershell
dotnet test backend/RodeoBarberShop.Api.Tests --no-restore -p:BaseOutputPath=D:/Project/RodeoBarberShop/.tmp/add-services-build/
```

Without that environment variable the PostgreSQL theory is explicitly skipped;
a passing ordinary unit-test run is not evidence of concurrency verification.

Stop the test instance after use:

```powershell
.tmp/pgsql/bin/pg_ctl.exe -D D:/Project/RodeoBarberShop/.tmp/postgres-concurrency-data -m fast -w stop
```

```powershell
Remove-Item Env:RODEO_TEST_POSTGRES
```

The portable cluster uses local trust authentication and must remain loopback-only
and stopped when not testing. It contains no shop credentials or customer data.
The binaries and data under `.tmp` are local artifacts, not committed dependencies.
Portable binaries were obtained from the [EDB PostgreSQL archive download page](https://www.enterprisedb.com/download-postgresql-binaries).

## Coverage And Results

Verified on 2026-09-17 using PostgreSQL 16.15:

- Staff booking versus customer booking.
- Rescheduling versus customer booking.
- Two different appointments rescheduled into the same slot.
- Leave approval versus customer booking, with an initially empty affected-booking list.

Each pair runs in both acquisition orders, using separate contexts/connections.
A held PostgreSQL table lock and `pg_locks` checks establish that both writers are
actually waiting before release. Assertions verify one successful operation, one
validation rejection, committed booking counts and rescheduling audit counts.
If booking wins against leave approval, approval rejects the stale affected list;
if approval wins, booking rejects the approved leave.

The focused run passed 8/8. The full run passed 103/103 with zero skips, repeating
all eight races. No generated test databases remained after completion.

These tests call application controllers against PostgreSQL, not concurrent HTTP
clients. They do not cover every operational race (for example payment, closure
or cancellation races), load/performance, or production infrastructure behavior.
