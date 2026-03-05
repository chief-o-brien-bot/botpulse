const fs = require('fs');

// Load env
const envContent = fs.readFileSync('/home/claude/bot/.env', 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('=');
  if (eq > 0) env[t.slice(0, eq)] = t.slice(eq + 1);
}

module.exports = {
  apps: [{
    name: 'botpulse-api',
    script: 'server.js',
    cwd: '/home/claude/workspace/botpulse-api',
    env: {
      NODE_ENV: 'production',
      PORT: 8080,
      ...env
    },
    restart_delay: 3000,
    max_restarts: 10,
    watch: false
  }]
};
