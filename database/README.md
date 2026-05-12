# Database Setup (Supabase)

## Overview

This project uses **Supabase** (PostgreSQL) as the database. Supabase provides a managed PostgreSQL instance with auto-scaling, backups, and a dashboard for easy management.

> **Note:** Although the project description mentions MySQL, Supabase uses **PostgreSQL**. The SQL files use PostgreSQL syntax and are compatible with Supabase.

---

## Setup Steps

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up / log in.
2. Click **"New Project"**.
3. Fill in:
   - **Name**: `attendance-system` (or your preferred name)
   - **Database Password**: Generate a strong password and **save it**.
   - **Region**: Choose the closest region to your users.
4. Click **"Create new project"** and wait ~2 minutes for setup.

---

### 2. Get Your Connection String

1. In your project dashboard, go to: **Settings → Database**
2. Scroll to **"Connection string"** section.
3. Select the **URI** tab.
4. Copy the connection string — it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with the database password you saved.

> **For Vercel (serverless):** Use the **connection pooler** URI instead:
> ```
> postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
> ```
> Found at: Settings → Database → Connection Pooling → URI

---

### 3. Run Migration Files

In the Supabase dashboard:

1. Go to **SQL Editor** (left sidebar).
2. Click **"+ New query"**.
3. Copy the contents of `migrations/001_initial_schema.sql` and paste it.
4. Click **"Run"** (green button).
5. Repeat for `migrations/002_seed_data.sql`.

Alternatively, use `psql`:
```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" \
  -f migrations/001_initial_schema.sql

psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" \
  -f migrations/002_seed_data.sql
```

---

### 4. Set Backend Environment Variable

Add to your backend `.env` (or Vercel env vars):

```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

For Vercel serverless (use pooler):
```env
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
```

---

## Schema Overview

| Table | Description |
|-------|-------------|
| `users` | All employees, managers, and admins |
| `attendance` | Daily check-in/check-out records |
| `leaves` | Leave requests and their status |
| `leave_balances` | Per-year leave balance per employee |
| `leave_types` | Configurable leave types (Annual, Sick, etc.) |
| `notifications` | In-app notifications |
| `holidays` | Public holidays calendar |

---

## Default Demo Accounts

After running `002_seed_data.sql`:

| Email | Password | Role |
|-------|----------|------|
| admin@company.com | Admin@123456 | Admin |
| manager@company.com | Admin@123456 | Manager |
| employee@company.com | Admin@123456 | Employee |

> **Security note:** Change these passwords immediately in production!

---

## Resetting the Database

To start fresh in Supabase SQL Editor:
```sql
DROP TABLE IF EXISTS notifications, leave_balances, leaves, leave_types, attendance, holidays, users CASCADE;
```
Then re-run the migration files.
