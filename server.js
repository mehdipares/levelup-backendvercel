// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');

// Routers
const usersRouter         = require('./routes/users');          // ex: /users (profil, liste, etc.)
const userGoalsRouter     = require('./routes/userGoals');      // ex: /users/:id/user-goals...
const categoriesRouter    = require('./routes/categories');
const authRouter          = require('./routes/auth');           // OK si déjà fonctionnel
const quotesRouter        = require('./routes/quotes');
const maybeAuth           = require('./utils/maybeAuth');
const goalTemplatesRouter = require('./routes/goalTemplates');
const onboardingRouter    = require('./routes/onboarding');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ CORS : autoriser localhost et ton front Vercel
const allowedOrigins = [
  'http://localhost:3001',
  'https://level-up-2n89-iota.vercel.app',
  'https://level-up-2n89-kdqchow56-dims-projects-645dd5d5.vercel.app',
  'https://level-up-2n89-xqy5538lh-dims-projects-645dd5d5.vercel.app',
  'https://front-end-level-up.onrender.com'
];


app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS bloqué pour : ' + origin));
  },
  credentials: true
}));

app.get('/db-test', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ok', message: 'Connexion réussiee ✅' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});
app.use(express.json());

// Mount des routes
app.use('/auth',           authRouter);
app.use('/categories',     categoriesRouter);
app.use('/quotes',         quotesRouter);
app.use('/goal-templates', maybeAuth, goalTemplatesRouter);
app.use('/onboarding',     onboardingRouter);

// On monte *les deux* routers sous /users (ils gèrent des sous-chemins différents)
app.use('/users', maybeAuth, usersRouter);
app.use('/users', maybeAuth, userGoalsRouter);

// Ping simple
app.get('/', (req, res) => {
  res.send('LevelUp backend is running!');
});

// 404 (après toutes les routes)
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Boot
app.listen(PORT, async () => {
  console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données réussie');
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données :', error);
  }
});
