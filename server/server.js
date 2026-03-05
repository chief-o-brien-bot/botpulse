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
const STATIC_DIR = join(__dirname, '../botpulse');
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
