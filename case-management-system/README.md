# Case Management System

A comprehensive case management application for law firms, similar to CaseBench.in. Built with React (Vite) frontend and Node.js/Express/MongoDB backend.

## Features

- **Case Management** - Track cases, hearing dates, case status, court integrations
- **Client Management** - Manage clients, track their cases, enable portal access
- **Document Management** - Upload, organize, and download case documents with versioning
- **Hearing Tracking** - Automatic reminders (7 days & 2 days before), calendar view
- **Invoice Generation** - Create professional invoices, track payments
- **Team Management** - Multi-user support with role-based access (Admin/Manager/Advocate/Staff)
- **Client Portal** - Dedicated portal for clients to view their cases, documents, invoices
- **Notifications** - Real-time notifications for hearings, reminders, documents
- **Dashboard** - Stats, charts, upcoming hearings, recent activity
- **Email & WhatsApp Integration** - Automated hearing reminders and cause list delivery
- **Court Integration** - Support for ECourts, NCLT, DRT, High Courts, RERA, Consumer Forums

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, MUI 9, React Router 6, Chart.js |
| Backend | Node.js, Express 4, Mongoose 8 |
| Database | MongoDB |
| Auth | JWT (JSON Web Tokens) |
| File Upload | Multer |
| Scheduling | node-cron |

## Prerequisites

- **Node.js** >= 16.0.0
- **MongoDB** >= 5.0 (local or Atlas)
- **npm** or **yarn**

## Setup Instructions

### 1. Clone & Navigate

```bash
cd case-management-system
```

### 2. Backend Setup

```bash
cd server

# Install dependencies
npm install

# Configure environment variables
# Edit .env file with your MongoDB URI, JWT secret, email settings
```

**Edit `server/.env`:**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/case-management-system
JWT_SECRET=your_super_secret_key_here
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

### 3. Seed Demo Data

```bash
npm run seed
```

This creates:
- **5 users**: 1 Admin, 1 Manager, 2 Advocates, 1 Staff
- **10 clients** with realistic Indian law firm data
- **15 cases** across various courts and types
- **24 documents** with proper categorization
- **10 invoices** in different statuses

**Demo Login Credentials:**
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@legalfirm.in | password123 |
| Manager | manager@legalfirm.in | password123 |
| Advocate | advocate1@legalfirm.in | password123 |

### 4. Start Backend

```bash
npm run dev
```

Backend runs on `http://localhost:5000`

### 5. Frontend Setup

Open a new terminal:

```bash
cd client

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs on `http://localhost:5173`

### 6. Access the Application

- **Main App**: http://localhost:5173
- **Client Portal**: http://localhost:5173/client-portal
- **API**: http://localhost:5000/api

## Project Structure

```
case-management-system/
├── server/                    # Backend
│   ├── src/
│   │   ├── config/           # Database config
│   │   ├── middleware/        # Auth, upload middleware
│   │   ├── models/           # Mongoose models
│   │   ├── routes/           # Express routes
│   │   ├── services/         # Email, WhatsApp, Cron
│   │   ├── utils/            # Helpers
│   │   ├── seed.js           # Demo data seeder
│   │   └── index.js          # Entry point
│   └── .env                  # Environment variables
│
├── client/                    # Frontend
│   ├── src/
│   │   ├── api/              # Axios config
│   │   ├── components/       # Shared components
│   │   ├── context/          # Auth context
│   │   ├── pages/            # All pages
│   │   │   ├── cases/        # Case CRUD
│   │   │   ├── clients/      # Client CRUD
│   │   │   ├── documents/    # Document management
│   │   │   ├── invoices/     # Invoice management
│   │   │   └── client-portal/# Client portal
│   │   ├── theme/            # MUI theme
│   │   └── utils/            # Utilities
│   └── vite.config.js
│
└── README.md
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Cases
- `GET /api/cases` - List cases (with filters, search, pagination)
- `POST /api/cases` - Create case
- `GET /api/cases/:id` - Get case detail
- `PUT /api/cases/:id` - Update case
- `DELETE /api/cases/:id` - Delete case
- `GET /api/cases/upcoming-hearings` - Get upcoming hearings
- `POST /api/cases/:id/hearings` - Add hearing record
- `POST /api/cases/:id/orders` - Add order

### Clients
- `GET /api/clients` - List clients
- `POST /api/clients` - Create client
- `GET /api/clients/:id` - Get client detail
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

### Documents
- `GET /api/documents` - List documents
- `POST /api/documents` - Upload document (multipart)
- `GET /api/documents/:id/download` - Download document

### Invoices
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `POST /api/invoices/:id/payment` - Record payment
- `GET /api/invoices/statistics` - Invoice stats

### Dashboard
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/dashboard/hearing-calendar` - Calendar data
- `GET /api/dashboard/case-distribution` - Case distribution

### Client Portal
- `POST /api/client-portal/login` - Client login
- `GET /api/client-portal/cases` - Client's cases
- `GET /api/client-portal/invoices` - Client's invoices

## Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Use a production MongoDB instance (MongoDB Atlas recommended)
3. Set a strong `JWT_SECRET`
4. Configure proper email credentials
5. Set up SSL/HTTPS
6. Build frontend: `cd client && npm run build`
7. Serve the `dist/` folder from Express or use Nginx
