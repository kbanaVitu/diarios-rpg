# 📜 RPG Diaries — The Medieval Chronicle Archive

An atmospheric, multi-user **Medieval Chronicle Repository** built for RPG groups to manage their campaigns (RPG tables), curate social-network-inspired character dossiers, and preserve first-person character diary entries.

---

## 🏛️ Architecture & Tech Stack

- **Frontend**: Vue 3 + Vue Router 4 + Vite 6 + Custom Medieval Archive CSS Design System (parchment textures, illuminated drop-caps, Cinzel & EB Garamond typography, responsive desktop & mobile layouts).
- **Backend**: Node.js + Express REST API.
- **Database**: Relational SQLite (`node:sqlite`) with strict `FOREIGN KEY` constraints, `ON DELETE CASCADE`, indexes, and `BEFORE INSERT / UPDATE` triggers enforcing campaign membership and ownership integrity (`User → RPG Table → Character → Diary Entry`).
- **Authentication & Security**: `bcryptjs` password hashing, signed JWT Bearer tokens + HTTP-only cookies, backend ownership & table-membership enforcement on every route, and magic-byte image verification via `multer` for persistent character portrait uploads.

---

## 🚀 Quick Start

```bash
cd diarios-rpg
npm install

# Build production frontend bundle
npm run build

# Start production server (serves API, persistent uploads, and built SPA on http://localhost:3000)
npm start

# Or run Vite + Express concurrently in development mode
npm run dev

# Run automated integration & security test suite
npm test
```

### Seeded Demo Accounts (Password: `archive123`)

| Username | Display Name | Role |
| :--- | :--- | :--- |
| `aldric` | Master Aldric Vance | Owner of *The Ashen Crown of Valdoria* |
| `elena` | Elena Thorne | Owner of *Voyage of the Starlight Brigantine* & Member of *Valdoria* |
| `kaelen` | Kaelen Ashwood | Member of *The Ashen Crown of Valdoria* |
