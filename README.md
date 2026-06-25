# 🏢 Habitat - Campus Life & Governance Super-App

**An all-in-one ecosystem for Modern Hostel & Campus Management.**
A robust monorepo combining a **Node.js/PostgreSQL Backend**, **React 19 Web Dashboard**, and **React Native (Expo) Mobile App** designed to digitize and enrich every aspect of campus living.

---

## 🎬 Demo Video

> [!IMPORTANT] > **View Project Demo:** [https://drive.google.com/file/d/1iT_jYIA4zVkZLzemLkvhMVOcfVKeyjvL/view?usp=sharing]

---


## 🌟 Vision & Overview
**Habitat** goes beyond traditional management software. It serves as a comprehensive **social, logistics, and governance hub** for students, staff, and administration. It solves daily campus friction points with elegant technology:
- 🛠️ **Maintenance**: Chat-based complaint desk with SLA auto-escalation.
- 🗣️ **Social Grid**: Subreddit-style Clubs with Polls and LFG Gaming Lobbies.
- 🛒 **Commerce**: Peer-to-peer item bidding and marketplace listing.
- 📅 **Logistics**: Time-slot scheduling for Washers and Badminton Courts.

---

## 🛠️ Core Modules

### 🏠 1. User Governance & Roles
- **Dedicated Dashboards**: specialized UI pipelines for Resident, Staff, Admin, and Security.
- **Stateless Auth**: JWT-driven session architecture with secure validation.

### 🗣️ 2. Community & social (Clubs)
- **Subreddit-style Channels**: Topic-dedicated spaces (e.g. Music, Gaming) with moderators.
- **Actionable Posts Feed**: Discuss ideas, trigger authenticated **Polls**, or spin up an **LFG (Looking For Group)** queue with max-capacity capping for gaming or meetups.
- **Social Micro-interactions**: Threaded comment trees, upvoting/downvoting engines, and report moderation audit trails.

### 🍔 3. Smart Mess Lifecycle
- **QR Attendance Gateway**: Fast scans validating daily student eating opt-in logs securely.
- **Wastage Analytics Graphs**: Smart charts quantifying food saved/wasted leveraging headcount summaries efficiently.

### 🛒 4. P2P Marketplace
- **Listing Engine**: Buy/Sell items under condition tags like "Like New" with image upload streams.
- **Bidding Engine**: Propose price negotiations allowing sellers to approve closures safely.

### 📅 5. Smart Bookings & Waitlists
- **Asset Time-Slotting**: Collision-validated reservations for high-traffic items (e.g., Washers, Badminton courts).
- **Queue Management**: Automated slot adjustments and resident promotions upon cancellation.

### 🛠️ 6. Maintenance & SLA Dashboard
- **Targeted Ticketing**: Smart ticket assignment based on staff specialty (e.g., Plumbing, Electrical).
- **In-App Messaging**: Smooth communication streams directly inside the issue view for resident-staff sync.
- **Breach Auto-Escalation**: Alert triggers routing pending files directly to administrators if SLA hours expire.

### 🚨 7. Safety & Security
- **SOS Panic Button**: Coordinate logging triggering rapid monitor notifications for on-site staff response.
- **Digital Gate Pass**: Digitized QR Gate tracing safe Overnight/Day out bounds closures fully.

### 📚 8. Amenities (Library & Membership Plans)
- **Library Book Management**: Circulation desk tracking due dates, copies available, and fine calculations.
- **Gym Subscription Plans**: Duration tiers linked under payment category engines securely handled.

### 💳 9. Payments & Fines (Razorpay Core)
- **Automatic Fees Cleared**: Seamless reconciliation solving fine clearances easily.

---

## 💻 Tech Stack Node Setup Grid

| Layer       | Technologies                                                                 |
| :---------- | :--------------------------------------------------------------------------- |
| **Mobile**  | Expo Router, React Native, Redux Toolkit, NativeWind                       |
| **Web SPA** | React 19, Vite, Tailwind v4, Recharts, Redux Toolkit                      |
| **Backend** | Node.js (Express v5), Drizzle ORM (Postgres), Redis, Cron, Cloudinary, Expo Push |

---

## 🚀 Getting Started

### 🔧 Pre-requisites
- **Node.js**: v18+ 
- **Docker**: For running Postgres/Redis locally (Optional, but recommended)
- **Expo Go**: (For Mobile testing)

### 📦 Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone <repository_url>
   cd Endgame
   ```

2. **Backend Setup**:
   ```bash
   cd backend
   npm install
   # Create a .env file following .env.example
   npm run drizzle:generate
   npm run drizzle:migrate
   npm run seed
   npm run dev
   ```

3. **Web Client Setup**:
   ```bash
   cd ../client
   npm install
   npm run dev
   ```

4. **Mobile App Setup**:
   ```bash
   cd ../mobile
   npm install
   npx expo start
   ```

---

## 📂 Directory Structure

```text
Endgame/
├── backend/          # Express API + Drizzle ORM Schema
├── client/           # React 19 Web Dashboard SPA
├── mobile/           # Expo (React Native) App
└── shared/           # Common Constants & Validations
```
