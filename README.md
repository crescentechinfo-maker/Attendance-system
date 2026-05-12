# AttendEase — Employee Attendance & Leave Management System

A full-stack web application for managing employee attendance and leave requests, built with React, Node.js/Express, and PostgreSQL (Supabase).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | PostgreSQL via Supabase |
| Auth | JWT (JSON Web Tokens) |
| Deployment | Vercel (frontend + backend) |

---

## Features

### Employee
- Check-in / Check-out with working hours tracking
- Monthly attendance history
- Apply for leave (Annual, Sick, Emergency)
- View leave balance
- Real-time leave status notifications
- Profile management

### Admin / Manager
- Dashboard with live statistics
- Employee management (add, edit, deactivate)
- Attendance reports with charts
- Leave approval / rejection with email notifications
- Department filtering

---

## Project Structure

```
attendance-system/
├── frontend/               # React + Vite app
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # React context (Auth)
│   │   ├── pages/          # Page components
│   │   │   └── admin/      # Admin-only pages
│   │   ├── services/       # API service layer (axios)
│   │   ├── App.jsx         # Routes
│   │   └── main.jsx        # Entry point
│   ├── vercel.json         # Frontend Vercel config (SPA rewrites)
│   └── .env.example        # Environment variable template
│
├── backend/                # Node.js + Express API
│   ├── src/
│   │   ├── config/         # Database, email, logger
│   │   ├── controllers/    # Business logic
│   │   ├── middleware/     # Auth, validation, error handling
│   │   └── routes/         # API route definitions
│   ├── server.js           # Express app entry
│   ├── vercel.json         # Backend Vercel config
│   └── .env.example        # Environment variable template
│
└── database/
    ├── migrations/
    │   ├── 001_initial_schema.sql  # Tables, indexes, triggers
    │   └── 002_seed_data.sql       # Demo data
    └── README.md                   # Database setup guide
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login and get JWT token |
| POST | `/api/auth/register` | Register new account |
| GET | `/api/auth/me` | Get current user profile |
| PUT | `/api/auth/profile` | Update profile |
| PUT | `/api/auth/password` | Change password |

### Attendance
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/attendance/checkin` | Employee | Clock in |
| POST | `/api/attendance/checkout` | Employee | Clock out |
| GET | `/api/attendance/today` | Employee | Today's attendance |
| GET | `/api/attendance/my` | Employee | My attendance history |
| GET | `/api/attendance` | Admin | All attendance records |
| PUT | `/api/attendance/:id` | Admin | Edit attendance record |

### Leaves
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/leaves/apply` | Employee | Submit leave request |
| GET | `/api/leaves/my` | Employee | My leave requests |
| GET | `/api/leaves/balance` | Employee | My leave balance |
| GET | `/api/leaves` | Admin | All leave requests |
| PUT | `/api/leaves/:id/approve` | Admin | Approve leave |
| PUT | `/api/leaves/:id/reject` | Admin | Reject leave |
| PUT | `/api/leaves/:id/cancel` | Employee | Cancel own leave |

### Employees (Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employees` | List all employees |
| POST | `/api/employees` | Create employee |
| PUT | `/api/employees/:id` | Update employee |
| DELETE | `/api/employees/:id` | Deactivate employee |

### Reports (Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/dashboard` | Dashboard stats |
| GET | `/api/reports/attendance` | Monthly attendance report |
| GET | `/api/reports/leaves` | Leave usage report |

---

## Deployment Guide

### Prerequisites
- GitHub account
- Vercel account (free tier works)
- Supabase account (free tier works)

---

### Step 1: Set Up Database (Supabase)

1. Create account at [supabase.com](https://supabase.com)
2. Click **New Project** → fill in name, password, and region
3. Wait for project to initialize (~2 minutes)
4. Go to **SQL Editor** → run `database/migrations/001_initial_schema.sql`
5. Run `database/migrations/002_seed_data.sql`
6. Go to **Settings → Database → Connection string (URI)** → copy the URI

---

### Step 2: Push to GitHub

```bash
# Initialize git repository
git init
git add .
git commit -m "Initial commit: AttendEase system"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/attendance-system.git
git branch -M main
git push -u origin main
```

---

### Step 3: Deploy Backend to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repository
3. Set **Root Directory** to `backend`
4. Framework Preset: **Other**
5. Add **Environment Variables**:

   | Variable | Value |
   |----------|-------|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | Your Supabase connection string |
   | `JWT_SECRET` | Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
   | `JWT_EXPIRES_IN` | `24h` |
   | `FRONTEND_URL` | Your frontend Vercel URL (set after frontend deploy) |
   | `EMAIL_USER` | Gmail address (optional) |
   | `EMAIL_PASSWORD` | Gmail App Password (optional) |

6. Click **Deploy**
7. Copy the deployment URL (e.g., `https://attendance-backend.vercel.app`)

---

### Step 4: Deploy Frontend to Vercel

1. **Add New Project** → import same GitHub repository
2. Set **Root Directory** to `frontend`
3. Framework Preset: **Vite**
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Add **Environment Variables**:

   | Variable | Value |
   |----------|-------|
   | `VITE_API_URL` | `https://YOUR-BACKEND.vercel.app/api` |

7. Click **Deploy**
8. Go back to backend Vercel project → Settings → Environment Variables
9. Update `FRONTEND_URL` with your frontend URL → **Redeploy**

---

### Step 5: Verify Deployment

Test the API:
```
GET https://YOUR-BACKEND.vercel.app/api/health
```
Should return:
```json
{ "status": "ok", "environment": "production" }
```

Then open your frontend URL and log in with demo credentials.

---

## Local Development

### Backend

```bash
cd backend
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your Supabase DATABASE_URL and JWT_SECRET

npm run dev
# API runs on http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install

# Copy and configure environment
cp .env.example .env
# Set VITE_API_URL=http://localhost:5000/api

npm run dev
# App runs on http://localhost:5173
```

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@company.com | Admin@123456 |
| Manager | manager@company.com | Admin@123456 |
| Employee | employee@company.com | Admin@123456 |

> **Security:** Change all demo passwords before going to production!

---

## Email Configuration (Optional)

To enable email notifications for leave approvals:

1. Enable **2-Step Verification** on your Gmail account
2. Go to **Google Account → Security → App Passwords**
3. Generate an app password for "Mail"
4. Set in backend `.env`:
   ```env
   EMAIL_USER=your@gmail.com
   EMAIL_PASSWORD=your-16-char-app-password
   ```

---

## Security Features

- JWT authentication with 24-hour expiry
- bcrypt password hashing (12 salt rounds)
- Rate limiting (100 req/15min, 20 login attempts/15min)
- CORS restricted to configured frontend URL
- Helmet.js security headers
- Input validation via express-validator
- SQL injection prevention (parameterized queries)
- Role-based access control (admin/manager/employee)

---

## License

MIT
