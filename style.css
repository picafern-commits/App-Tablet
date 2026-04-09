:root {
  --bg: #eef2f7;
  --panel: #ffffff;
  --text: #0f172a;
  --muted: #64748b;
  --border: #dbe4ee;
  --primary: #2563eb;
  --danger: #dc2626;
  --success: #16a34a;
  --shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  width: 100%;
  min-height: 100%;
  overflow-x: hidden;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: var(--bg);
  color: var(--text);
  touch-action: pan-y;
}

body.dark {
  --bg: #0f172a;
  --panel: #111827;
  --text: #e5e7eb;
  --muted: #94a3b8;
  --border: #1f2937;
  --primary: #3b82f6;
  --shadow: none;
}

img {
  max-width: 100%;
  height: auto;
}

/* LAYOUT */
.app-shell {
  display: grid;
  grid-template-columns: 290px 1fr;
  min-height: 100vh;
  align-items: start;
  background: var(--bg);
}

.sidebar {
  grid-column: 1;
  grid-row: 1;
  position: sticky;
  top: 0;
  height: 100vh;
  background: #020617;
  color: white;
  border-right: 1px solid #0f172a;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.main {
  grid-column: 2;
  grid-row: 1;
  min-width: 0;
  min-height: 100vh;
  align-self: start;
  padding: 24px;
  margin: 0;
  background: var(--bg);
}

/* SIDEBAR */
.brand {
  margin-bottom: 20px;
}

.brand h1 {
  margin: 0;
  font-size: 20px;
  color: white;
}

.brand p {
  margin: 4px 0 0;
  font-size: 14px;
  color: #94a3b8;
}

.side-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.side-nav button {
  text-align: left;
  border: none;
  background: transparent;
  color: white;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 16px;
  cursor: pointer;
}

.side-nav button.active,
.side-nav button:hover {
  background: rgba(59, 130, 246, 0.18);
  color: #93c5fd;
}

/* PÁGINAS */
.page {
  margin: 0;
  padding: 0;
}

.hidden {
  display: none !important;
}

/* DASHBOARD */
.dashboard-logo {
  width: 220px;
  max-width: 100%;
  display: block;
  margin: 0 0 20px 0;
  border-radius: 18px;
}

h2 {
  margin: 0 0 4px;
  font-size: 22px;
}

.subtitle {
  margin: 0 0 20px;
  color: var(--muted);
  font-size: 14px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin: 0 0 20px;
}

.stat-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 20px;
  box-shadow: var(--shadow);
  padding: 18px;
}

.stat-card span {
  display: block;
  color: var(--muted);
  font-size: 14px;
  margin-bottom: 8px;
}

.stat-card strong {
  font-size: 22px;
}

/* PAINÉIS */
.panel,
.card,
.check-item {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 20px;
  box-shadow: var(--shadow);
}

.panel {
  padding: 16px;
  margin-bottom: 16px;
}

.cards-list {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.card {
  padding: 14px 16px;
}

.card small {
  display: block;
  color: var(--muted);
  margin-top: 4px;
}

.card-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.inline-check {
  width: 22px;
  height: 22px;
  margin: 0;
  min-height: auto;
}

/* FORMULÁRIOS */
input,
select,
button,
textarea {
  width: 100%;
  min-height: 52px;
  padding: 14px 16px;
  margin-top: 10px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--panel);
  color: var(--text);
  font-size: 16px;
}

button {
  cursor: pointer;
}

button.primary,
.primary {
  background: var(--primary);
  color: #fff;
  border-color: transparent;
}

button.secondary,
.secondary {
  background: transparent;
  color: var(--primary);
}

.delete-btn {
  width: auto;
  min-height: 40px;
  padding: 8px 12px;
  margin-top: 10px;
  background: var(--danger);
  color: #fff;
  border: none;
  border-radius: 12px;
}

/* CHECKLIST */
.checklist-list {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 16px;
}

.check-item input {
  width: 22px;
  height: 22px;
  margin: 0;
  min-height: auto;
}

.check-item input:checked + span {
  color: var(--success);
  font-weight: 700;
}

/* TOGGLE */
.toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.toggle-row input {
  width: 22px;
  height: 22px;
  min-height: auto;
  margin: 0;
}

/* RESPONSIVO */
@media (min-width: 1200px) {
  .cards-list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 899px) {
  .app-shell {
    display: block;
  }

  .sidebar {
    position: static;
    width: auto;
    height: auto;
  }

  .main {
    min-height: auto;
    padding: 16px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .cards-list {
    grid-template-columns: 1fr;
  }

  .dashboard-logo {
    width: 180px;
  }
}
