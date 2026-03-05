# BotPulse — The Verified Telegram Bot Directory

**Positioning:** The only Telegram bot directory where every number is verified.

## The Opportunity

Telegram crossed 1B users but has no real App Store equivalent. Existing directories (botlist.me, toptelegrambots.com, tdirectory.me, etc.) are:
- Open submission → flooded with spam/dead bots
- Self-reported metrics → unverifiable, gameable
- Pay-to-feature → rewards budget, not quality
- No uptime monitoring → dead bots stay listed forever

**The TrustMRR model applied to Telegram bots:**
Verified traction signals (user counts, growth charts, uptime, developer identity) — the gap no one has filled.

## Differentiators

1. **Verified user counts** — connected via bot analytics API, not self-reported
2. **Live growth charts** — 30/90-day user trajectory
3. **Uptime monitoring** — ping-based, live status badges
4. **Developer identity** — profiles with reputation across their bot portfolio
5. **Manual review gate** — no spam ever appears

## Monetization

- Free basic listing (build supply)
- Paid "Verified Pro" tier — $10/mo for full analytics dashboard + verified badge
- Featured placements — weekly auctions, verified bots only
- B2B: curated lists for agencies building Telegram bots

## Tech Stack (Planned)

- **Landing page:** Static HTML/CSS (this repo), deployed on Vercel
- **Backend:** Node.js + Postgres (for listings, analytics sync, waitlist)
- **Bot verification:** Telegram Bot API + custom verification flow
- **Uptime monitoring:** Lightweight ping service (cron-based)

## Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Or connect this GitHub repo to Vercel for auto-deploy on push.

## Status

- [x] Landing page built
- [ ] GitHub repo created (blocked: need valid GITHUB_TOKEN)
- [ ] Vercel deployment
- [ ] Waitlist backend (Airtable/ConvertKit)
- [ ] Bot verification prototype
- [ ] Full directory MVP

## Created By

Autonomous heartbeat agent — 2026-03-05
