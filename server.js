// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');

// ---- DIAG Réseau DB (ajouts) ----
const dns = require('node:dns').promises;
const net = require('node:net');
const https = require('node:https');
const { URL } = require('node:url');

function getDbTarget() {
  const { DATABASE_URL, DB_HOST, DB_PORT = '3306', DB_NAME, DB_SSL = 'false' } = process.env;
  if (DATABASE_URL) {
    try {
      const u = new URL(DATABASE_URL);
      return { host: u.hostname, port: u.port || '3306', db: u.pathname.slice(1) || DB_NAME, ssl: DB_SSL === 'true' };
    } catch { /* ignore */ }
  }
  return { host: DB_HOST, port: DB_PORT, db: DB_NAME, ssl: DB_SSL === 'true' };
}

async function dbConnectivityDiag() {
  const target = getDbTarget();
  const out = { env: { host: target.host, port: String(target.port), db: target.db, ssl: target.ssl } };

  // DNS
  try {
    const ips = await dns.lookup(target.host, { all: true });
    out.dns = ips.map(i => i.address);
  } catch (e) {
    out.dns = { error: e.code || e.message };
  }

  // TCP
  out.tcp = await new Promise(resolve => {
    const socket = net.createConnection({ host: target.host, port: Number(target.port), timeout: 6000 }, () => {
      socket.destroy();
      resolve({ ok: true });
    });
    socket.on('timeout', () => { socket.destroy(); resolve({ ok: false, error: 'TIMEOUT' }); });
    socket.on('error', (err) => { resolve({ ok: false, error: err.code || err.message }); });
  });

  // IP sortante
  out.egress = await new Promise(res => {
    https.get('https://api.ipify.org?format=json', r => {
      let data = ''; r.on('data', c => data += c);
      r.on('end', () => { try { res(JSON.parse(data)); } catch { res({}); } });
    }).on('error', () => res({}));
  });

  return out;
}

// Routers
const usersRouter         = require('./routes/users');
const userGoalsRouter     = require('./routes/userGoals');
const categoriesRouter    = require('./routes/categories');
const authRouter          = require('./routes/auth');
const quotesRouter        = require('./routes/quotes');
const maybeAuth           = require('./utils/maybeAuth');
const goalTemplatesRouter = require('./routes/goalTemplates');
const onboardingRouter    = require('./routes/onboarding');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ CORS
const allowedOrigins = [
  'http://localhost:3001',
  'https://level-up-2n89-iota.vercel.app',
  'https://level-up-2n89-kdqchow56-dims-projects-645dd5d5.vercel.app',
  'https://level-up-2n89-xqy5538lh-dims-projects-645dd5d5.vercel.app',
  'https://front-end-level-up.onrender.com'
];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS bloqué pour : ' + origin));
  },
  credentials: true
}));

app.use(express.json());

// --- Diag endpoints ---
app.get('/db-test', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ok', message: 'Connexion réussie ✅' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.get('/__dbdiag', async (req, res) => {
  const diag = await dbConnectivityDiag();
  res.json(diag);
});

// Routes
app.use('/auth',           authRouter);
app.use('/categories',     categoriesRouter);
app.use('/quotes',         quotesRouter);
app.use('/goal-templates', maybeAuth, goalTemplatesRouter);
app.use('/onboarding',     onboardingRouter);
app.use('/users',          maybeAuth, usersRouter);
app.use('/users',          maybeAuth, userGoalsRouter);

// Ping
app.get('/', (req, res) => { res.send('LevelUp backend is running!'); });

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Boot
app.listen(PORT, async () => {
  console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);

  // Log diag réseau (utile pour ETIMEDOUT)
  const diag = await dbConnectivityDiag();
  console.log('[DB DIAG]', JSON.stringify(diag, null, 2));

  try {
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données réussie');
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données :', {
      name: error?.name,
      code: error?.parent?.code,
      fatal: error?.parent?.fatal,
      msg: error?.message
    });
  }
});
