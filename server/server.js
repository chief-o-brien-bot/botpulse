import express from 'express';
import cors from 'cors';
import { createReadStream, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8080;
const WAITLIST_FILE = join(__dirname, 'waitlist.json');
const STATE_FILE = '/home/claude/workspace/state.json';
const HEARTBEAT_LOG = '/home/claude/workspace/logs/heartbeat.log';
const STATIC_DIR = join(__dirname, '..');
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GROUP_CHAT_ID = process.env.GROUP_CHAT_ID;

// Load env if not set
if (!TELEGRAM_BOT_TOKEN) {
  try {
    const envContent = readFileSync('/home/claude/bot/.env', 'utf8');
    for (const line of envContent.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq > 0) {
        const key = t.slice(0, eq);
        if (!process.env[key]) process.env[key] = t.slice(eq + 1);
      }
    }
  } catch {}
}

// ── Waitlist storage ────────────────────────────────────────────────
function loadWaitlist() {
  if (!existsSync(WAITLIST_FILE)) return [];
  try { return JSON.parse(readFileSync(WAITLIST_FILE, 'utf8')); }
  catch { return []; }
}

function saveWaitlist(list) {
  writeFileSync(WAITLIST_FILE, JSON.stringify(list, null, 2));
}

// ── Telegram notification ───────────────────────────────────────────
function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.GROUP_CHAT_ID;
  if (!token || !chatId) return;
  const body = JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' });
  const req = https.request({
    hostname: 'api.telegram.org',
    path: `/bot${token}/sendMessage`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  });
  req.write(body);
  req.end();
}

// ── App ─────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  const list = loadWaitlist();
  res.json({ status: 'ok', waitlist_count: list.length, timestamp: new Date().toISOString() });
});

// Status dashboard
app.get('/status', (req, res) => {
  const list = loadWaitlist();
  let state = {};
  try { state = JSON.parse(readFileSync(STATE_FILE, 'utf8')); } catch {}

  // Get last few heartbeat log lines
  let recentActivity = [];
  try {
    const logLines = readFileSync(HEARTBEAT_LOG, 'utf8').split('\n');
    recentActivity = logLines
      .filter(l => l.includes('──── Heartbeat'))
      .slice(-10)
      .map(l => l.replace(/^\[/, '').replace(/\]\s+────\s+/, ' — ').replace('────', '').trim());
  } catch {}

  const uptimeSeconds = Math.floor(process.uptime());
  const uptimeStr = uptimeSeconds < 60 ? `${uptimeSeconds}s`
    : uptimeSeconds < 3600 ? `${Math.floor(uptimeSeconds/60)}m ${uptimeSeconds%60}s`
    : `${Math.floor(uptimeSeconds/3600)}h ${Math.floor((uptimeSeconds%3600)/60)}m`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>BotPulse System Status</title>
  <meta http-equiv="refresh" content="60">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Courier New',monospace;background:#0a0a0f;color:#e0e0e0;padding:2rem;max-width:800px;margin:0 auto}
    h1{color:#5b8def;font-size:1.4rem;margin-bottom:0.5rem}
    .subtitle{color:#666;font-size:0.85rem;margin-bottom:2rem}
    .section{background:#111118;border:1px solid #222;border-radius:6px;padding:1.2rem;margin-bottom:1rem}
    .section-title{color:#7c5fe6;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:0.8rem}
    .stat{display:flex;justify-content:space-between;padding:0.3rem 0;border-bottom:1px solid #1a1a22}
    .stat:last-child{border-bottom:none}
    .stat-label{color:#888}
    .stat-value{color:#3ecf8e;font-weight:bold}
    .stat-value.warn{color:#f5a623}
    .stat-value.error{color:#f5423e}
    .activity-item{color:#aaa;font-size:0.8rem;padding:0.2rem 0;border-bottom:1px solid #1a1a22}
    .activity-item:last-child{border-bottom:none}
    .dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#3ecf8e;margin-right:0.5rem;animation:pulse 2s infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
    .footer{color:#444;font-size:0.75rem;text-align:center;margin-top:2rem}
  </style>
</head>
<body>
  <h1>⚡ BotPulse System Status</h1>
  <p class="subtitle">Auto-refreshes every 60s · ${new Date().toUTCString()}</p>

  <div class="section">
    <div class="section-title">🟢 API Server</div>
    <div class="stat"><span class="stat-label">Status</span><span class="stat-value"><span class="dot"></span>Online</span></div>
    <div class="stat"><span class="stat-label">Uptime</span><span class="stat-value">${uptimeStr}</span></div>
    <div class="stat"><span class="stat-label">Port</span><span class="stat-value">${PORT}</span></div>
    <div class="stat"><span class="stat-label">Waitlist signups</span><span class="stat-value">${list.length}</span></div>
  </div>

  <div class="section">
    <div class="section-title">🤖 Agent Memory</div>
    <div class="stat"><span class="stat-label">Last heartbeat</span><span class="stat-value">${state.last_heartbeat || 'unknown'}</span></div>
    <div class="stat"><span class="stat-label">Heartbeat count</span><span class="stat-value">${state.heartbeat_count || '?'}</span></div>
    <div class="stat"><span class="stat-label">Current focus</span><span class="stat-value warn">${state.current_focus || 'unknown'}</span></div>
    <div class="stat"><span class="stat-label">Blockers</span><span class="stat-value ${(state.blockers||[]).length > 0 ? 'warn' : ''}">${(state.blockers||[]).length} active</span></div>
  </div>

  ${(state.blockers||[]).length > 0 ? `
  <div class="section">
    <div class="section-title">⚠️ Active Blockers</div>
    ${(state.blockers||[]).map(b => `
    <div class="stat"><span class="stat-label">${b.project}</span><span class="stat-value warn">${b.blocker.slice(0,80)}...</span></div>
    `).join('')}
  </div>` : ''}

  <div class="section">
    <div class="section-title">📋 Recent Heartbeats</div>
    ${recentActivity.length > 0
      ? recentActivity.map(a => `<div class="activity-item">${a}</div>`).join('')
      : '<div class="activity-item">No recent activity logged</div>'}
  </div>

  <div class="footer">
    BotPulse · Autonomous Agent · <a href="https://trello.com/b/cLkE7Tyu" style="color:#5b8def">Trello Board</a> ·
    <a href="https://github.com/chief-o-brien-bot/botpulse" style="color:#5b8def">GitHub</a>
  </div>
</body>
</html>`;
  res.send(html);
});

// Waitlist signup
app.post('/api/waitlist', (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'Invalid email address' });
  }

  const list = loadWaitlist();

  // Check for duplicate
  if (list.find(e => e.email === email)) {
    return res.json({ ok: true, message: "You're already on the list!" });
  }

  const entry = { email, timestamp: new Date().toISOString(), ip: req.ip };
  list.push(entry);
  saveWaitlist(list);

  console.log(`[waitlist] New signup: ${email} (total: ${list.length})`);

  // Notify Telegram
  sendTelegram(`🎉 *BotPulse waitlist signup!*\n\n📧 \`${email}\`\n👥 Total signups: ${list.length}`);

  res.json({ ok: true, message: "You're on the list! We'll reach out when we launch." });
});

// Get waitlist count (public)
app.get('/api/waitlist/count', (req, res) => {
  const list = loadWaitlist();
  res.json({ count: list.length });
});

// Serve static landing page
app.use(express.static(STATIC_DIR));
app.get('/{*path}', (req, res) => {
  res.sendFile(join(STATIC_DIR, 'index.html'));
});

// ── Start ────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`BotPulse API server running on port ${PORT}`);
  console.log(`  Landing page: http://0.0.0.0:${PORT}/`);
  console.log(`  API: http://0.0.0.0:${PORT}/api/waitlist`);
  console.log(`  Health: http://0.0.0.0:${PORT}/health`);
});
