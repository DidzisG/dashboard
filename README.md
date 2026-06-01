# ⚡ Aether Dashboard

> A modern, ergonomic service dashboard with integrated inbox notifications, calendar, task management, and smart notes.

![Dashboard Preview](https://img.shields.io/badge/Status-Live-brightgreen) ![Vanilla JS](https://img.shields.io/badge/Built%20With-Vanilla%20JS-f7df1e) ![No Dependencies](https://img.shields.io/badge/Dependencies-None-blueviolet)

## ✨ Features

- **📬 Inbox Notifications** — Simulated incoming service alerts (Sentry, Stripe, Vercel, Cloudflare) with toast popups and sound alerts
- **📅 Calendar & Agenda** — Monthly calendar with event scheduling, click any day to view its agenda
- **✅ Task Management** — Create, complete, and delete tasks with priority levels (High / Medium / Low)
- **📝 Smart Notes** — Scratchpad with live **Markdown preview** (bold, italic, headings, lists, code)
- **🔔 Notification Center** — Slide-in history drawer with bell badge, mark-all-read, and clear-all
- **⌘ Command Palette** — Press `⌘K` or `Ctrl+K` to search tasks, emails, calendar events, and run commands
- **🌙 Light / Dark Theme** — Toggle between themes, persisted to localStorage
- **📱 Fully Responsive** — Bottom tab bar on mobile, single-column layout on tablet

## 🛠️ Tech Stack

- **HTML5** — Semantic structure, `<dialog>` for modals
- **Vanilla CSS** — Glassmorphism, CSS Grid, custom animations
- **ES6 Modules** — Zero build step, zero dependencies
- **Web Audio API** — Synthesized notification sounds
- **localStorage** — Persistent state across sessions

## 🚀 Running Locally

```bash
git clone https://github.com/DidzisG/dashboard.git
cd dashboard
python3 -m http.server 8888
# Open http://localhost:8888
```

## 🌐 Live Demo

👉 **[https://didzisg.github.io/dashboard](https://didzisg.github.io/dashboard)**

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` / `Ctrl+K` | Open Command Palette |
| `Escape` | Close any modal or palette |

## 📁 Project Structure

```
dashboard/
├── index.html          # App shell + widget layout
├── styles.css          # Design system + glassmorphism
├── app.js              # Main orchestrator (ES module)
└── js/
    ├── db.js           # localStorage state management
    ├── tasks.js        # Task CRUD + filtering
    ├── email.js        # Email simulation + Web Audio
    ├── calendar.js     # Calendar grid + event management
    ├── commandPalette.js # ⌘K search + command routing
    ├── notifications.js  # Notification center drawer
    └── notes.js          # Markdown preview + auto-save
```

---

Built with ❤️ using pure HTML, CSS, and JavaScript — no frameworks, no build tools.
