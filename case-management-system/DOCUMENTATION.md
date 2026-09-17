# CaseBench - Legal Case Management System

## Complete Documentation

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Tech Stack](#2-tech-stack)
3. [Installation & Setup](#3-installation--setup)
4. [Database Schema](#4-database-schema)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [Admin Portal](#6-admin-portal)
7. [Client Portal](#7-client-portal)
8. [API Reference](#8-api-reference)
9. [Feature Guide](#9-feature-guide)
10. [Deployment](#10-deployment)

---

## 1. System Overview

CaseBench is a comprehensive legal case management system built for law firms. It provides separate portals for **Admin/Senior Advocates**, **Junior Advocates**, and **Clients** with role-based access control, granular permissions, and full CRUD operations across all entities.

### Core Modules

| Module | Description |
|--------|-------------|
| Cases | Create, manage, track legal cases with full lifecycle |
| Clients | Client database with portal access management |
| Documents | File uploads, versioning, categorization |
| Invoices | Billing with line items, tax, payment tracking |
| Calendar | Court hearing calendar with color-coded events |
| Hearings | Hearing scheduling, outcome recording |
| Tasks | Task assignment, tracking, priority management |
| Team | Staff management with granular permissions |
| Notifications | System notifications with read/unread tracking |
| Search | Global search across cases, clients, documents, invoices |
| Reports | Analytics dashboard with charts and statistics |
| Client Portal | Dedicated client-facing interface |

---

## 2. Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL 8.4.9
- **ORM**: Raw SQL with mysql2/promise
- **Auth**: JWT (JSON Web Tokens) + bcryptjs
- **File Upload**: multer
- **Validation**: express-validator

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite 8
- **UI Library**: Material-UI (MUI) v9
- **Charts**: Chart.js + react-chartjs-2
- **Routing**: React Router v6
- **State**: React Context API
- **HTTP Client**: Axios
- **Notifications**: react-hot-toast

---

## 3. Installation & Setup

### Prerequisites
- Node.js 18+
- MySQL 8.x
- npm or yarn

### Backend Setup

```bash
cd server
npm install
```

Create `.env` file:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root123
DB_NAME=case_management
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

Start MySQL and run:
```bash
node src/index.js
```

### Frontend Setup

```bash
cd client
npm install
npx vite --host
```

Frontend runs on `http://localhost:5173`
Backend runs on `http://localhost:5000`

### MySQL Manual Start (after reboot)

```powershell
Start-Process -FilePath 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe' -ArgumentList '--datadir=C:\Users\BS-24\mysql-data','--port=3306' -WindowStyle Hidden
```

---

## 4. Database Schema

### Tables

#### users (Staff/Admin)
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(36) PK | UUID |
| name | VARCHAR(255) | Full name |
| email | VARCHAR(255) UNIQUE | Email |
| password | VARCHAR(255) | bcrypt hash |
| role | VARCHAR(20) | admin, manager, advocate, staff |
| phone | VARCHAR(50) | Phone number |
| avatar | VARCHAR(500) | Profile photo path |
| firmName | VARCHAR(255) | Law firm name |
| permissions | TEXT | JSON `{feature: {view, add, edit, delete}}` |
| isActive | TINYINT | Account active flag |
| createdAt | VARCHAR(50) | ISO datetime |

#### clients
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(36) PK | UUID |
| name | VARCHAR(255) | Client name |
| email | VARCHAR(255) UNIQUE | Email |
| phone | VARCHAR(50) | Mobile number (used for portal login) |
| address | TEXT | JSON address |
| company | VARCHAR(255) | Company name |
| panNumber | VARCHAR(20) | PAN card |
| aadharNumber | VARCHAR(20) | Aadhar card |
| portalEnabled | TINYINT | Portal access flag |
| portalPassword | VARCHAR(255) | bcrypt hash for portal login |
| emergencyContact | VARCHAR(255) | Emergency contact |
| profilePhoto | VARCHAR(500) | Profile photo path |
| resetOtp | VARCHAR(10) | Password reset OTP |
| resetOtpExpiry | VARCHAR(50) | OTP expiry datetime |
| createdBy | VARCHAR(36) | FK to users |

#### cases
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(36) PK | UUID |
| caseNumber | VARCHAR(50) UNIQUE | e.g., HC/CVL/2026/1234 |
| caseTitle | TEXT | Case title |
| caseType | VARCHAR(30) | civil, criminal, family, corporate, labor, consumer, other |
| court | VARCHAR(30) | district, high, supreme, nclt, drt, rera, consumer, other |
| courtName | VARCHAR(255) | Specific court name |
| judgeName | VARCHAR(255) | Judge name |
| clientId | VARCHAR(36) FK | Client ID |
| filingDate | VARCHAR(50) | Filing date |
| nextHearingDate | VARCHAR(50) | Next hearing |
| status | VARCHAR(30) | pending, active, in-progress, closed, disposed, won, lost |
| priority | VARCHAR(20) | low, medium, high, urgent |
| description | TEXT | Case description |
| oppositeParty | VARCHAR(255) | Opposite party name |
| oppositePartyLawyer | VARCHAR(255) | Opposite lawyer |
| orders | TEXT | JSON array of court orders |
| hearingHistory | TEXT | JSON array of hearings |
| notes | TEXT | JSON array of notes |
| tags | TEXT | JSON array of tags |
| visibleToClient | TINYINT | Show to client flag |
| createdBy | VARCHAR(36) FK | Created by user |

#### case_advocates (Junction)
| Column | Type | Description |
|--------|------|-------------|
| caseId | VARCHAR(36) FK | Case ID |
| userId | VARCHAR(36) FK | Advocate user ID |

#### documents
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(36) PK | UUID |
| title | VARCHAR(500) | Document title |
| fileName | VARCHAR(500) | Stored filename |
| originalName | VARCHAR(500) | Original filename |
| filePath | VARCHAR(1000) | File path |
| fileSize | BIGINT | File size in bytes |
| mimeType | VARCHAR(100) | MIME type |
| caseId | VARCHAR(36) FK | Associated case |
| uploadedBy | VARCHAR(36) FK | User who uploaded |
| category | VARCHAR(30) | petition, evidence, correspondence, court, financial, other |
| tags | TEXT | JSON array |
| versions | TEXT | JSON array of versions |
| visibleToClient | TINYINT | Show to client flag |

#### invoices
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(36) PK | UUID |
| invoiceNumber | VARCHAR(30) UNIQUE | e.g., INV-2601-1234 |
| clientId | VARCHAR(36) FK | Client ID |
| caseId | VARCHAR(36) FK | Associated case |
| items | TEXT | JSON array `{description, amount, rate, quantity}` |
| subtotal | DOUBLE | Subtotal |
| tax | DOUBLE | Tax amount |
| total | DOUBLE | Total amount |
| status | VARCHAR(20) | draft, sent, paid, overdue, cancelled |
| dueDate | VARCHAR(50) | Due date |
| paidDate | VARCHAR(50) | Payment date |
| paidAmount | DOUBLE | Amount paid |
| paymentMethod | VARCHAR(30) | Payment method |
| notes | TEXT | Invoice notes |
| createdBy | VARCHAR(36) FK | Created by user |

#### notifications (Staff)
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(36) PK | UUID |
| userId | VARCHAR(36) FK | Target user |
| title | VARCHAR(500) | Notification title |
| message | TEXT | Notification message |
| type | VARCHAR(30) | system, hearing, invoice, document, case |
| caseId | VARCHAR(36) FK | Related case |
| isRead | TINYINT | Read status |
| link | VARCHAR(500) | Frontend route |

#### client_notifications (Client)
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(36) PK | UUID |
| clientId | VARCHAR(36) FK | Target client |
| title | VARCHAR(500) | Title |
| message | TEXT | Message |
| type | VARCHAR(30) | Type |
| caseId | VARCHAR(36) FK | Related case |
| isRead | TINYINT | Read status |

#### hearings
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(36) PK | UUID |
| caseId | VARCHAR(36) FK | Associated case |
| hearingDate | VARCHAR(50) | Hearing datetime |
| court | VARCHAR(30) | Court type |
| courtName | VARCHAR(255) | Court name |
| courtHall | VARCHAR(255) | Court hall number |
| judgeName | VARCHAR(255) | Judge name |
| outcome | TEXT | Hearing outcome |
| judgeRemarks | TEXT | Judge remarks |
| nextHearingDate | VARCHAR(50) | Next hearing |
| notes | TEXT | Notes |
| status | VARCHAR(20) | scheduled, completed, cancelled, adjourned |
| createdBy | VARCHAR(36) FK | Created by user |

#### tasks
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(36) PK | UUID |
| title | VARCHAR(500) | Task title |
| description | TEXT | Task description |
| caseId | VARCHAR(36) FK | Associated case |
| assignedTo | VARCHAR(36) FK | Assigned user |
| assignedBy | VARCHAR(36) FK | Assigner user |
| priority | VARCHAR(20) | low, medium, high, urgent |
| status | VARCHAR(20) | pending, in-progress, completed, cancelled |
| dueDate | VARCHAR(50) | Due date |
| completedAt | VARCHAR(50) | Completion datetime |
| taskType | VARCHAR(50) | Task category |

#### messages
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(36) PK | UUID |
| senderId | VARCHAR(36) | Sender ID |
| senderType | VARCHAR(20) | client, advocate, admin |
| receiverId | VARCHAR(36) | Receiver ID |
| receiverType | VARCHAR(20) | client, advocate, admin |
| caseId | VARCHAR(36) FK | Related case |
| text | TEXT | Message text |
| attachments | TEXT | JSON array |
| isRead | TINYINT | Read status |

#### appointments
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(36) PK | UUID |
| clientId | VARCHAR(36) FK | Client ID |
| advocateId | VARCHAR(36) FK | Advocate ID |
| caseId | VARCHAR(36) FK | Related case |
| meetingType | VARCHAR(30) | office-visit, video-call, phone-call |
| requestedDate | VARCHAR(50) | Requested date |
| requestedTime | VARCHAR(50) | Requested time |
| reason | TEXT | Meeting reason |
| status | VARCHAR(20) | pending, approved, rejected, completed, cancelled |
| notes | TEXT | Notes |

#### activity_logs
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(36) PK | UUID |
| userId | VARCHAR(36) FK | User who performed action |
| userName | VARCHAR(255) | User name |
| action | VARCHAR(50) | Action type |
| entity | VARCHAR(30) | Entity type |
| entityId | VARCHAR(36) | Entity ID |
| details | TEXT | Action details |
| ipAddress | VARCHAR(50) | IP address |

---

## 5. Authentication & Authorization

### Login Credentials

#### Admin/Senior Advocate
| Field | Value |
|-------|-------|
| Email | `nagendrank@gmail.com` |
| Password | `admin@123` |
| Role | admin |

#### Junior Advocate
| Field | Value |
|-------|-------|
| Email | `chaitrashricn74@gmail.com` |
| Password | `chai@123` |
| Role | advocate |

#### Client Portal
| Client | Mobile | Password |
|--------|--------|----------|
| pradeep | `9876543210` | `client123` |
| sam | `9739717806` | `client123` |

### Role Hierarchy

```
Admin (Senior Advocate)
├── Full system access
├── Manage team members
├── Set permissions
├── Create/edit/delete everything
│
Manager
├── Manage cases, clients
├── View team
│
Advocate (Junior)
├── View ALL cases
├── Edit ONLY assigned cases
├── View ALL hearings
├── Upload documents to assigned cases
│
Staff
├── Limited access based on permissions
│
Client
├── View own cases only
├── View documents, invoices
├── Send messages
├── Request appointments
├── Cannot edit anything
```

### JWT Tokens

**Staff/Admin tokens:**
```json
{
  "id": "user-uuid",
  "_id": "user-uuid",
  "role": "admin",
  "iat": timestamp,
  "exp": timestamp
}
```

**Client tokens:**
```json
{
  "id": "client-uuid",
  "type": "client",
  "iat": timestamp,
  "exp": "7d"
}
```

### Granular Permissions

Permissions are stored as JSON in the `users.permissions` column:

```json
{
  "cases": { "view": true, "add": true, "edit": true, "delete": true },
  "clients": { "view": true, "add": true, "edit": true, "delete": true },
  "documents": { "view": true, "add": true, "edit": true, "delete": true },
  "invoices": { "view": true, "add": true, "edit": true, "delete": true },
  "calendar": { "view": true },
  "hearings": { "view": true, "add": true, "edit": true, "delete": true },
  "tasks": { "view": true, "add": true, "edit": true, "delete": true },
  "team": { "view": true, "add": true, "edit": true, "delete": true },
  "search": { "view": true },
  "reports": { "view": true }
}
```

---

## 6. Admin Portal

### Navigation Items

| Item | Route | Description |
|------|-------|-------------|
| Dashboard | `/` | Overview with stats, charts, quick actions |
| Cases | `/cases` | Case list with filters |
| Clients | `/clients` | Client directory |
| Documents | `/documents` | Document management |
| Invoices | `/invoices` | Billing & payments |
| Calendar | `/calendar` | Court hearing calendar |
| Hearings | `/hearings` | Hearing management |
| Tasks | `/tasks` | Task tracking |
| Search | `/search` | Global search |
| Team | `/team` | Staff management |
| Notifications | `/notifications` | System notifications |
| Settings | `/settings` | Account settings |

### Dashboard Features

- 4 primary stat cards (Total Cases, Active, Hearings, Clients)
- 5 secondary stat cards (Won, Lost, Today, Revenue, Bills)
- Win rate circular progress indicator
- Cases by Status doughnut chart
- Cases by Type bar chart
- Quick Actions grid
- Upcoming Hearings list
- Recent Cases list

### Case Management

**Create Case:**
- Case title, number (auto-generated), type, court
- Client selection (required)
- Advocate assignment (multiple)
- Filing date, next hearing date
- Description, opposite party, priority
- Tags

**Case Detail Tabs:**
- Overview: Case details, assigned advocates
- Hearings: Hearing history with outcomes
- Orders: Court orders
- Documents: Uploaded files
- Notes: Case notes
- Timeline: Chronological event history

### Client Management

**Create Client:**
- Name, email, phone (required)
- Address, company, PAN, Aadhar
- Portal access toggle with password generation

**Client Detail:**
- Profile information
- Associated cases
- Documents
- Invoices
- Portal access status

### Team Management

- Invite team members (admin only)
- Set roles (admin, manager, advocate, staff)
- Granular permission management per feature
- Activity log tracking
- Profile photo upload

### Invoice Management

**Create Invoice:**
- Client selection
- Case linkage (optional)
- Line items with description, rate, quantity
- Tax rate (percentage)
- Due date
- Notes

**Invoice Detail:**
- PDF-ready layout
- Payment status tracking
- Payment history

---

## 7. Client Portal

### Access

URL: `http://localhost:5173/client-portal`

### Login

Clients log in using:
1. Registered mobile number
2. Password (set by admin)

### Forgot Password Flow

1. Enter registered mobile number
2. Receive OTP (shown in console in dev mode)
3. Enter OTP
4. Set new password (min 6 characters)
5. Redirect to login

### Client Dashboard

- Active Cases count
- Upcoming Hearings count
- Pending Amount
- Total Documents
- Unread Notifications
- Unread Messages
- Recent Cases list
- Upcoming Hearings list
- Recent Documents
- Payments summary

### My Cases

- Card-based layout
- Search by case number/title
- Filter by status
- Shows: Case number, title, type, court, judge, advocates, next hearing, priority, status
- Click to view case detail

### Case Detail (Client View)

**Tabs:**
- Overview: Full case details, assigned advocates
- Hearings: Hearing history with outcomes
- Orders: Court orders
- Documents: Uploaded files with download
- Timeline: Chronological events

### Hearings

- List of all hearings
- Filter by status (scheduled, completed, adjourned)
- Shows: Case name, date, court, judge, hall, outcome
- Click to go to case detail

### Documents

- Searchable document list
- Filter by case
- Shows: Title, category, case number, file size, date
- Download button for each document

### Payments & Invoices

- Filter by status (sent, paid, overdue, draft)
- Shows: Invoice number, status, total, items count, due date, paid date

### Notifications

- Tabbed view (All / Unread)
- Mark individual as read
- Mark all as read
- Shows: Type icon, title, message, time ago

### Messages

- Conversation list with unread counts
- Real-time chat interface
- Send text messages
- Messages with advocates

### Appointments

- Request meeting with any advocate
- Meeting types: Office Visit, Video Call, Phone Call
- Select date and time
- Provide reason
- Cancel pending appointments

### Profile

- View profile photo, name, email, phone
- Edit: Email, address, emergency contact
- Change password (requires current password)
- Phone number read-only

---

## 8. API Reference

### Base URL

```
http://localhost:5000/api
```

### Authentication Header

```
Authorization: Bearer <token>
```

---

### Staff Auth Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/login` | No | Staff login |
| POST | `/auth/register` | No | Register new user |
| GET | `/auth/profile` | Yes | Get profile |
| PUT | `/auth/profile` | Yes | Update profile |
| POST | `/auth/change-password` | Yes | Change password |
| POST | `/auth/upload-avatar` | Yes | Upload avatar |

#### POST /auth/login

Request:
```json
{
  "email": "nagendrank@gmail.com",
  "password": "admin@123"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "name": "...", "role": "admin" },
    "token": "jwt-token"
  }
}
```

---

### Cases Endpoints

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/cases` | Yes | cases.view | List all cases |
| GET | `/cases/statistics` | Yes | cases.view | Case statistics |
| GET | `/cases/upcoming-hearings` | Yes | cases.view | Upcoming hearings |
| GET | `/cases/:id` | Yes | cases.view | Case detail |
| POST | `/cases` | Yes | cases.add | Create case |
| PUT | `/cases/:id` | Yes | cases.edit | Update case |
| DELETE | `/cases/:id` | Yes | cases.delete | Delete case |
| POST | `/cases/:id/hearings` | Yes | - | Add hearing |
| POST | `/cases/:id/orders` | Yes | - | Add order |
| GET | `/cases/:id/timeline` | Yes | - | Case timeline |
| POST | `/cases/:id/documents` | Yes | - | Upload document |
| POST | `/cases/:id/notes` | Yes | - | Add note |

#### GET /cases

Query Parameters:
- `page` (int, default 1)
- `limit` (int, default 10, max 100)
- `search` (string)
- `status` (string, comma-separated)
- `caseType` (string, comma-separated)
- `court` (string, comma-separated)
- `priority` (string, comma-separated)
- `sortBy` (string: caseNumber, caseTitle, nextHearingDate, filingDate, createdAt, priority, status)
- `sortOrder` (string: asc, desc)

#### POST /cases

Request:
```json
{
  "caseTitle": "Rajesh Kumar vs State",
  "caseType": "civil",
  "court": "high",
  "courtName": "Bombay High Court",
  "judgeName": "Justice Patil",
  "client": "client-uuid",
  "assignedAdvocates": ["user-uuid-1", "user-uuid-2"],
  "filingDate": "2026-01-15",
  "nextHearingDate": "2026-02-20T10:30:00.000Z",
  "description": "Property dispute case",
  "oppositeParty": "State of Maharashtra",
  "oppositePartyLawyer": "Adv. Kulkarni",
  "priority": "high",
  "status": "active",
  "tags": ["property", "urgent"]
}
```

---

### Clients Endpoints

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/clients` | Yes | clients.view | List clients |
| GET | `/clients/:id` | Yes | clients.view | Client detail |
| POST | `/clients` | Yes | clients.add | Create client |
| PUT | `/clients/:id` | Yes | clients.edit | Update client |
| DELETE | `/clients/:id` | Yes | clients.delete | Delete client |
| POST | `/clients/:id/portal-access` | Yes | - | Enable portal |

#### POST /clients

Request:
```json
{
  "name": "Rajesh Kumar",
  "email": "rajesh@email.com",
  "phone": "9876543210",
  "address": {
    "street": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  },
  "company": "Kumar Enterprises",
  "panNumber": "ABCPK1234A",
  "notes": "Important client"
}
```

---

### Documents Endpoints

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/documents` | Yes | documents.view | List documents |
| GET | `/documents/:id` | Yes | documents.view | Document detail |
| POST | `/documents` | Yes | documents.add | Upload document |
| PUT | `/documents/:id` | Yes | documents.edit | Update document |
| DELETE | `/documents/:id` | Yes | documents.delete | Delete document |
| GET | `/documents/:id/download` | Yes | documents.view | Download file |

#### POST /documents

Multipart form data:
- `file` (File, required)
- `title` (string)
- `caseId` (string)
- `category` (string: petition, evidence, correspondence, court, financial, other)
- `tags` (JSON array)

---

### Invoices Endpoints

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/invoices` | Yes | invoices.view | List invoices |
| GET | `/invoices/:id` | Yes | invoices.view | Invoice detail |
| POST | `/invoices` | Yes | invoices.add | Create invoice |
| PUT | `/invoices/:id` | Yes | invoices.edit | Update invoice |
| DELETE | `/invoices/:id` | Yes | invoices.delete | Delete invoice |

#### POST /invoices

Request:
```json
{
  "client": "client-uuid",
  "case": "case-uuid",
  "items": [
    { "description": "Legal consultation", "amount": 5000 },
    { "description": "Court appearance", "amount": 10000 }
  ],
  "taxRate": 0.18,
  "dueDate": "2026-03-01",
  "notes": "Payment due within 30 days"
}
```

---

### Hearings Endpoints

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/hearings` | Yes | - | List hearings |
| GET | `/hearings/today` | Yes | - | Today's hearings |
| GET | `/hearings/:id` | Yes | - | Hearing detail |
| POST | `/hearings` | Yes | cases.add | Create hearing |
| PUT | `/hearings/:id` | Yes | cases.edit | Update hearing |
| DELETE | `/hearings/:id` | Yes | cases.delete | Delete hearing |
| POST | `/hearings/:id/outcome` | Yes | cases.edit | Record outcome |

---

### Tasks Endpoints

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/tasks` | Yes | - | List tasks |
| GET | `/tasks/:id` | Yes | - | Task detail |
| POST | `/tasks` | Yes | - | Create task |
| PUT | `/tasks/:id` | Yes | - | Update task |
| DELETE | `/tasks/:id` | Yes | - | Delete task |
| PATCH | `/tasks/:id/status` | Yes | - | Update status |

---

### Notifications Endpoints (Staff)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/notifications` | Yes | List notifications |
| GET | `/notifications/unread-count` | Yes | Get unread count |
| PUT | `/notifications/:id/read` | Yes | Mark as read |
| PUT | `/notifications/read-all` | Yes | Mark all read |
| DELETE | `/notifications/:id` | Yes | Delete notification |

---

### Team Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/team` | Yes | List team members |
| POST | `/team/invite` | Yes (admin) | Invite member |
| PUT | `/team/:id/role` | Yes (admin) | Update role |
| PUT | `/team/:id/permissions` | Yes (admin) | Update permissions |
| PUT | `/team/:id/status` | Yes (admin) | Activate/deactivate |

---

### Search Endpoint

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/search` | Yes | Global search |

Query Parameters:
- `q` (string, required) - Search query
- `type` (string) - Filter: all, cases, clients, documents, invoices

---

### Dashboard Endpoint

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/dashboard/stats` | Yes | Dashboard statistics |
| GET | `/dashboard/hearing-calendar` | Yes | Calendar data |
| GET | `/dashboard/case-distribution` | Yes | Case distribution |

---

### Activity Logs Endpoint

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/activity-logs` | Yes | List activity logs |

Query Parameters:
- `userId` (string) - Filter by user
- `action` (string) - Filter by action
- `entity` (string) - Filter by entity type
- `page` (int)
- `limit` (int)

---

### Client Portal Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/client-portal/login` | No | Client login |
| POST | `/client-portal/forgot-password` | No | Request OTP |
| POST | `/client-portal/reset-password` | No | Reset password |
| GET | `/client-portal/dashboard` | Client | Dashboard |
| GET | `/client-portal/cases` | Client | List cases |
| GET | `/client-portal/cases/:id` | Client | Case detail |
| GET | `/client-portal/cases/:id/timeline` | Client | Case timeline |
| GET | `/client-portal/hearings` | Client | List hearings |
| GET | `/client-portal/documents` | Client | List documents |
| GET | `/client-portal/invoices` | Client | List invoices |
| GET | `/client-portal/invoices/:id` | Client | Invoice detail |
| GET | `/client-portal/notifications` | Client | List notifications |
| GET | `/client-portal/notifications/unread-count` | Client | Unread count |
| PUT | `/client-portal/notifications/:id/read` | Client | Mark read |
| PUT | `/client-portal/notifications/read-all` | Client | Mark all read |
| GET | `/client-portal/messages/conversations` | Client | Conversations |
| GET | `/client-portal/messages` | Client | Messages with user |
| POST | `/client-portal/messages` | Client | Send message |
| PUT | `/client-portal/messages/read` | Client | Mark read |
| GET | `/client-portal/appointments` | Client | List appointments |
| POST | `/client-portal/appointments` | Client | Request appointment |
| PUT | `/client-portal/appointments/:id/cancel` | Client | Cancel appointment |
| GET | `/client-portal/profile` | Client | Get profile |
| PUT | `/client-portal/profile` | Client | Update profile |
| PUT | `/client-portal/profile/password` | Client | Change password |

#### POST /client-portal/login

Request:
```json
{
  "mobile": "9876543210",
  "password": "client123"
}
```

#### POST /client-portal/forgot-password

Request:
```json
{
  "mobile": "9876543210"
}
```

Response (dev mode includes OTP):
```json
{
  "success": true,
  "message": "OTP sent to your registered mobile number",
  "otp": "123456"
}
```

#### POST /client-portal/reset-password

Request:
```json
{
  "mobile": "9876543210",
  "otp": "123456",
  "newPassword": "newpass123"
}
```

---

## 9. Feature Guide

### Hearing Management

1. **Schedule Hearing**: Go to Hearings → Schedule Hearing
2. **Record Outcome**: After hearing, click Record Outcome
3. **Set Next Date**: Optionally set next hearing date
4. **View History**: Check case detail → Hearings tab

### Task Management

1. **Create Task**: Go to Tasks → Create Task
2. **Assign**: Select team member
3. **Track Status**: Update status (Pending → In Progress → Completed)
4. **Filter**: By status, priority, assignee

### Document Management

1. **Upload**: Via case detail → Documents tab, or Documents page
2. **Categorize**: petition, evidence, correspondence, court, financial, other
3. **Download**: Click download button
4. **Search**: By title, filename, case number

### Invoice Management

1. **Create**: Invoices → Create Invoice
2. **Add Items**: Line items with amounts
3. **Apply Tax**: Set tax rate (e.g., 0.18 for 18% GST)
4. **Send**: Change status to "sent"
5. **Track Payment**: Update when paid

### Messaging (Client Portal)

1. **View Conversations**: Messages page shows all conversations
2. **Open Chat**: Click a conversation
3. **Send Message**: Type and press Enter or click send
4. **Unread Counts**: Badge shows unread messages

### Appointments (Client Portal)

1. **Request**: Click "Request Meeting"
2. **Select Advocate**: Choose from team
3. **Choose Type**: Office Visit, Video Call, Phone Call
4. **Set Date/Time**: Pick preferred date and time
5. **Provide Reason**: Describe meeting purpose
6. **Cancel**: Can cancel if status is still "pending"

---

## 10. Deployment

### Environment Variables

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-production-password
DB_NAME=case_management
JWT_SECRET=your-very-long-random-secret
NODE_ENV=production
```

### Production Build

```bash
cd client
npx vite build
```

Static files output to `client/dist/`

### Server

```bash
cd server
NODE_ENV=production node src/index.js
```

### MySQL Production Setup

1. Create database: `CREATE DATABASE case_management;`
2. Tables auto-created on first run
3. Seed initial admin user
4. Set strong JWT_SECRET

### Security Checklist

- [ ] Use HTTPS in production
- [ ] Set strong JWT_SECRET (min 32 chars)
- [ ] Use production MySQL credentials
- [ ] Enable CORS only for production domain
- [ ] Set secure cookie flags
- [ ] Regular database backups
- [ ] Log rotation
- [ ] Rate limiting on auth endpoints

---

## Appendix: File Structure

```
case-management-system/
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js              # MySQL connection & schema
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT authentication
│   │   │   ├── permission.js      # Permission checking
│   │   │   └── upload.js          # multer config
│   │   ├── models/
│   │   │   ├── Case.js
│   │   │   ├── Client.js
│   │   │   ├── Document.js
│   │   │   ├── Invoice.js
│   │   │   ├── Notification.js
│   │   │   └── User.js
│   │   ├── routes/
│   │   │   ├── activityLogs.js
│   │   │   ├── auth.js
│   │   │   ├── cases.js
│   │   │   ├── client-portal.js
│   │   │   ├── clients.js
│   │   │   ├── dashboard.js
│   │   │   ├── documents.js
│   │   │   ├── hearings.js
│   │   │   ├── invoices.js
│   │   │   ├── notifications.js
│   │   │   ├── search.js
│   │   │   ├── tasks.js
│   │   │   └── users.js
│   │   ├── utils/
│   │   │   ├── activityLogger.js
│   │   │   └── helpers.js
│   │   └── index.js               # Server entry point
│   └── uploads/                   # Uploaded files
├── client/
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.js           # Axios instance
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── StatusChip.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   └── ConfirmDialog.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── cases/
│   │   │   │   ├── CasesList.jsx
│   │   │   │   ├── CaseForm.jsx
│   │   │   │   └── CaseDetail.jsx
│   │   │   ├── clients/
│   │   │   │   ├── ClientsList.jsx
│   │   │   │   ├── ClientForm.jsx
│   │   │   │   └── ClientDetail.jsx
│   │   │   ├── documents/
│   │   │   │   └── DocumentsList.jsx
│   │   │   ├── invoices/
│   │   │   │   ├── InvoicesList.jsx
│   │   │   │   ├── InvoiceForm.jsx
│   │   │   │   └── InvoiceDetail.jsx
│   │   │   ├── hearings/
│   │   │   │   └── HearingsList.jsx
│   │   │   ├── tasks/
│   │   │   │   └── TasksList.jsx
│   │   │   ├── search/
│   │   │   │   └── GlobalSearch.jsx
│   │   │   ├── client-portal/
│   │   │   │   ├── ClientPortalLogin.jsx
│   │   │   │   ├── ClientPortalForgotPassword.jsx
│   │   │   │   ├── ClientPortalLayout.jsx
│   │   │   │   ├── ClientPortalDashboard.jsx
│   │   │   │   ├── ClientPortalCases.jsx
│   │   │   │   ├── ClientPortalCaseDetail.jsx
│   │   │   │   ├── ClientPortalHearings.jsx
│   │   │   │   ├── ClientPortalDocuments.jsx
│   │   │   │   ├── ClientPortalInvoices.jsx
│   │   │   │   ├── ClientPortalNotifications.jsx
│   │   │   │   ├── ClientPortalMessages.jsx
│   │   │   │   ├── ClientPortalAppointments.jsx
│   │   │   │   └── ClientPortalProfile.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── ForgotPassword.jsx
│   │   │   ├── Calendar.jsx
│   │   │   ├── TeamManagement.jsx
│   │   │   ├── Notifications.jsx
│   │   │   └── Settings.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── theme.js
│   └── index.html
└── README.md
```
