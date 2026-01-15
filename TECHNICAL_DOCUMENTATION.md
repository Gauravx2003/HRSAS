# Project Technical Documentation

This document provides a deep dive into the technical implementation of the Hostel Services Academic Portal. It allows for autonomous planning and development by detailing the database schema, API surface, and frontend architecture.

## 1. System Architecture

### Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide React, Axios.
- **Backend**: Node.js, Express.js, TypeScript.
- **Database**: PostgreSQL (managed via Drizzle ORM).
- **Authentication**: JWT-based stateless auth.
- **File Storage**: Cloudinary (integrated via `multer` middleware).

### Directory Structure

- `client/`: React SPA source code.
  - `src/services/`: API integration layer.
  - `src/layout/`: Layout wrappers (Admin, Staff, Resident).
  - `src/pages/`: Route-level components.
- `backend/`: Express API source code.
  - `src/db/`: Drizzle schema and connection logic.
  - `src/modules/`: Feature-based modular structure (Controller, Service, Routes).
  - `src/middleware/`: Auth, Validation, Upload middlewares.

---

## 2. Database Schema (PostgreSQL/Drizzle)

The database uses UUIDs for primary keys and relies on Enums for state management.

### Enums

- `role`: 'RESIDENT', 'STAFF', 'ADMIN', 'SECURITY'
- `staff_type`: 'IN_HOUSE', 'VENDOR'
- `complaint_status`: 'CREATED', 'ASSIGNED', 'IN_PROGRESS', 'CLOSED', 'RESOLVED', 'ESCALATED'
- `priority_type`: 'LOW', 'MEDIUM', 'HIGH'
- `approval_status`: 'PENDING', 'APPROVED', 'REJECTED'
- `lost_and_found_status`: 'OPEN', 'CLAIMED', 'CLOSED'
- `lost_and_found_type`: 'LOST', 'FOUND'

### Tables

#### `users`

| Column           | Type         | Details                  |
| :--------------- | :----------- | :----------------------- |
| `id`             | UUID         | PK, Default Random       |
| `organizationId` | UUID         | FK -> `organizations.id` |
| `hostelId`       | UUID         | FK -> `hostels.id`       |
| `name`           | Varchar(100) | Not Null                 |
| `email`          | Varchar(150) | Unique, Not Null         |
| `passwordHash`   | Text         | Not Null                 |
| `role`           | Enum         | `role`                   |
| `isActive`       | Boolean      | Default: true            |

#### `staff_profiles`

| Column           | Type        | Details              |
| :--------------- | :---------- | :------------------- |
| `userId`         | UUID        | PK, FK -> `users.id` |
| `staffType`      | Enum        | `staff_type`         |
| `specialization` | Varchar(50) | e.g. "Plumbing"      |
| `maxActiveTasks` | Integer     | Default: 5           |

#### `complaint_categories`

| Column       | Type        | Details                 |
| :----------- | :---------- | :---------------------- |
| `id`         | UUID        | PK                      |
| `name`       | Varchar(50) | e.g. "Electrical"       |
| `slaHours`   | Integer     | Hours before escalation |
| `vendorOnly` | Boolean     | Default: false          |

#### `complaints`

| Column          | Type      | Details                               |
| :-------------- | :-------- | :------------------------------------ |
| `id`            | UUID      | PK                                    |
| `residentId`    | UUID      | FK -> `users.id`                      |
| `roomId`        | UUID      | FK -> `rooms.id`                      |
| `categoryId`    | UUID      | FK -> `complaint_categories.id`       |
| `assignedStaff` | UUID      | FK -> `users.id` (Nullable)           |
| `status`        | Enum      | `complaint_status` (Default: CREATED) |
| `description`   | Text      |                                       |
| `slaDeadline`   | Timestamp | Calculated at creation                |
| `createdAt`     | Timestamp |                                       |

#### `notices`

| Column      | Type         | Details          |
| :---------- | :----------- | :--------------- |
| `id`        | UUID         | PK               |
| `title`     | Varchar(255) |                  |
| `content`   | Text         |                  |
| `createdBy` | UUID         | FK -> `users.id` |
| `expiresAt` | Timestamp    |                  |

#### `notifications`

| Column    | Type    | Details          |
| :-------- | :------ | :--------------- |
| `id`      | UUID    | PK               |
| `userId`  | UUID    | FK -> `users.id` |
| `message` | Text    |                  |
| `isRead`  | Boolean | Default: false   |

#### `lost_and_found_items`

| Column       | Type         | Details                 |
| :----------- | :----------- | :---------------------- |
| `id`         | UUID         | PK                      |
| `title`      | Varchar(255) |                         |
| `type`       | Enum         | `lost_and_found_type`   |
| `reportedBy` | UUID         | FK -> `users.id`        |
| `status`     | Enum         | `lost_and_found_status` |
| `createdAt`  | Timestamp    |                         |

---

## 3. Backend API Endpoints

Base URL: `/api`

### Auth Module (`/auth`)

- `POST /login`: Authenticates user, returns JWT and user info.

### Complaints Module (`/complaints`)

- `POST /` (Resident): Create a new complaint. Triggers auto-assignment logic.
- `GET /my` (Resident): Get complaints logged by the current user.
- `GET /escalated` (Admin): Get all complaints with `ESCALATED` status.
- `POST /:complaintId/attachments` (Resident): Upload files (max 5) for a complaint.

### Staff Module (`/staff`)

- `GET /complaints` (Staff): Get non-resolved complaints assigned to the logged-in staff member.
- `PATCH /complaints/:id/status` (Staff): Update status (e.g. to `RESOLVED` or `IN_PROGRESS`).

### Notices Module (`/notices`)

- `POST /` (Admin): Create a new notice/announcement.
- `GET /` (Public/All): Fetch active notices.

### Notifications Module (`/notifications`)

- `GET /`: Fetch unread/recent notifications for the user.
- `PATCH /:id/read`: Mark a notification as read.

### Lost & Found Module (`/lost-and-found`)

- `POST /` (All): Report a lost or found item.
- `GET /my` (All): View user's reported items.
- `GET /found` (All): View all items reported as "FOUND" (for residents to claim).
- `GET /claimed` (Admin): View history of claimed items.
- `PATCH /:id` (Admin): Update item details.
- `PATCH /:id/claim` (All): Attempt to claim an item (logic likely sets status to CLAIMED or PENDING approval).
- `PATCH /:id/close` (Admin): Close an item case.

---

## 4. Frontend Interactions

### Routing & Role Access

The application uses `RoleRoute` to strictly enforce access control.

- **Public**: `/login`
- **Admin** (`/admin`):
  - Dashboard (`/admin/`): Stats overview.
  - Notices (`/admin/notices`): Creation form + list.
  - Escalations (`/admin/escalations`): Table of breached complaints.
  - Approvals (`/admin/lost-found`): Administration of lost & found reports.
- **Staff** (`/staff`):
  - Dashboard (`/staff/`): Stats + active count.
  - Complaints (`/staff/complaints`): Interaction UI to update status.
  - Notices (`/staff/notices`): Read-only view.
- **Resident** (`/resident`):
  - Dashboard (`/resident/`): Stats.
  - My Complaints (`/resident/complaints`): List + Create Modal/Page.
  - Lost Items (`/resident/lost-items`): Report lost item.
  - Found Items (`/resident/found-items`): Browse found items.

### Key Workflows

1.  **Complaint Lifecycle**:
    - Resident POSTs complaint -> Backend assigns Staff (based on logic) -> Notification sent to Staff -> Staff sees in `/staff/complaints` -> Staff updates status -> Resident notified.
2.  **Notification System**:
    - TopBar polls `/api/notifications` -> User clicks Bell -> Dropdown shows list -> User clicks "Mark as Read" -> optimistic UI update + API call.
