# Alliance University — Lost & Found Portal (CampusFind)

A modern, full-stack Lost and Found web application designed for Alliance University Central Campus (Anekal, Bengaluru). The portal allows students, staff, and administration to report lost belongings, list found items, receive automated match alerts, chat peer-to-peer to coordinate returns, explore lost-item intensity on a campus map, and consult an integrated AI Chatbot assistant.

---

## 🚀 Quick Start Guide

### Option 1: Run the Unified Full-Stack Application (Recommended)

The root server hosts all HTML pages, static assets, Express REST endpoints, and Socket.IO real-time messaging on a single port:

```powershell
# In the project root directory:
node server.js
```
*(Or `npm start`)*

Open your browser to:
👉 **`http://localhost:5000/index.html`**

---

### Option 2: Run via Live Server / Static Hosting

You can also open the project with **VS Code Live Server** (e.g. `http://localhost:5500/index.html`) or double-click `index.html`.
- When the backend (`http://localhost:5000`) is running, the portal communicates directly with the live server and Socket.IO.
- If the backend is not yet started, the portal runs safely in demo/offline mode without redirect loops or blank screens.

---

## 🔑 Pre-Configured Demo Accounts

For testing, grading, or demonstration, the following accounts are pre-seeded:

| Role | Email Address | Password |
| :--- | :--- | :--- |
| **Student** | `kavitha.r@ced.alliance.edu.in` | `Student@1234` |
| **Student 2** | `rohan.s@ced.alliance.edu.in` | `Student@1234` |
| **Administrator** | `admin@alliance.edu.in` | `Admin@1234` |

*Note: New student registrations require an official Alliance University email ending in `@ced.alliance.edu.in`.*

---

## 🌟 Key Upgrades & Features

### 1. Consistent UI, Fonts, Colors & Sizing
- **Preserved Existing Background Design**: The original campus background photo (`campus.jpg`) is kept on the hero banner and student login / registration pages, and the clean `#f5f8fc` university palette is applied across all pages.
- **Unified Typography & Spacing**: Standardized font family (`"Segoe UI", sans-serif`), button heights (44px), card radii (10px–14px), table layouts, and input styles across every single page.
- **Brand Navy Palette**: Primary `#123b68`, deep hover `#0d2c4f`, light accent `#eaf2fb`, and clean text `#1f2937`.

### 2. Strict Lost & Found Data Storage & Separation
- **Lost Table (`lost.html`)**: Exclusively displays reports with `type: 'lost'`. Features instant search by keyword, category filter, date, and "View Details".
- **Found Table (`found.html`)**: Exclusively displays reports with `type: 'found'`. Displays custody/handover location (e.g. Student Affairs, Security Office), instant filter toolbar, and a direct "Claim" button.
- **No Mixing or Missing Entries**: All routing and submission APIs strictly tag reports as `lost` or `found`.

### 3. Modern AI Chatbot Assistant & Peer-to-Peer Messaging
- **AI Chatbot (`portal.js`)**: Floating toggle button with pulse animation at the bottom right. Opens a dialog window featuring quick-prompt chips, intelligent policy guidance (ID card recovery, office hours, claim procedures), real-time search of items, and graceful offline fallback.
- **Student-to-Student Messaging (`history.html`)**: Real-time chat powered by Socket.IO with distinct sent (navy) vs. received (white card) speech bubbles, timestamps, unread badges, and conversation history.

### 4. Interactive Campus Map & Automated Matcher
- **Campus Map (`map.html`)**: Uses Leaflet and OpenStreetMap centered on Alliance University Central Campus with aggregate report intensity markers and location breakdowns.
- **Automated Matches (`matches.html`)**: Automatically identifies pairs between lost and found items matching category, location, or name keywords with side-by-side comparison and "Contact Student" button.

### 5. Administrator Governance Panel (`admin.html`)
- Overview statistics of all campus items.
- Item status approval, recovery status update, and category correction.
- Claim review workflow with "Request Proof", "Approve", and "Reject" actions.
- Role management (promote student accounts to administrator).

---

## 📁 Project Structure

```text
├── admin.html          # Administrator login & governance dashboard
├── admin_access.html   # Portal role gateway (Student vs Admin)
├── contact.html        # Campus office contact & inquiry form
├── dashboard.html      # Student account overview
├── found.html          # Found item report form & exclusive Found table
├── history.html        # My Reports, Claims tracking & Peer Messaging
├── index.html          # Portal home page with campus hero & recent items
├── item.html           # Full report detail & image viewer
├── login.html          # Student authentication (clean campus design)
├── lost.html           # Lost item report form & exclusive Lost table
├── map.html            # Campus location density & Leaflet map
├── matches.html        # Automated lost/found matcher & notifications
├── register.html       # Student registration (@ced.alliance.edu.in)
├── search.html         # Unified campus search hub with advanced filters
├── style.css           # Master unified stylesheet & design tokens
├── portal.js           # Client logic, sockets, notifications & AI assistant
├── campus_map.js       # Campus map Leaflet integration
├── server.js           # Root Node/Express + Socket.IO server
├── .env                # Environment configuration
└── assets/             # Campus imagery and university logos
```

---

## 🛠️ Requirements & Dependencies
- Node.js v18 or newer
- MongoDB (optional; defaults automatically to in-memory fallback if MongoDB is not running locally)
