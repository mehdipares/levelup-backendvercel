'use strict';

const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const mysql2 = require('mysql2');

if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv').config(); } catch {}
}

const env = process.env.NODE_ENV || 'development';

// --- 1) Essaie de charger config/config.js (Sequelize-CLI) ---
let cfg = null;
try {
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const all = require(path.join(__dirname, '..', 'config', 'config.js'));
  cfg = all && all[env] ? all[env] : null;
} catch {
  // pas de config.js -> on utilisera les variables d'env
}

// --- 2) Crée l'instance Sequelize (priorité: DATABASE_URL > config.js > ENV séparées) ---
let sequelize;

if (process.env.DATABASE_URL) {
  // ex: mysql://user:pass@host:3306/db
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'mysql',
    dialectModule: mysql2,
    logging: false,
    // dialectOptions: { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true } }, // active si besoin
  });
} else if (cfg) {
  // Utiliser config.js du CLI (déjà compatible avec ENV via config.js si tu l'as fait)
  // On force dialect/mysql2 si absent
  sequelize = new Sequelize(
    cfg.database,
    cfg.username,
    cfg.password,
    {
      host: cfg.host,
      port: cfg.port || 3306,
      dialect: cfg.dialect || 'mysql',
      dialectModule: mysql2,
      logging: false,
      ...(cfg.dialectOptions ? { dialectOptions: cfg.dialectOptions } : {}),
    }
  );
} else {
  // Fallback : variables d'environnement séparées (ton cas Render)
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = Number(process.env.DB_PORT || 3306);
  const database = process.env.DB_NAME || 'levelup';
  const username = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || process.env.DB_PASS || '';
  const dialect = process.env.DB_DIALECT || 'mysql';

  const ssl =
    String(process.env.MYSQL_SSL || '').toLowerCase() === 'true'
      ? { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true } }
      : {};

  sequelize = new Sequelize(database, username, password, {
    host,
    port,
    dialect,
    dialectModule: mysql2,
    logging: false,
    dialectOptions: { ...ssl },
  });
}

// --- 3) Définition des modèles (imports explicites comme chez toi) ---
const db = {};

db.User               = require('./user')(sequelize, DataTypes);
db.Category           = require('./category')(sequelize, DataTypes);
db.GoalTemplate       = require('./goaltemplate')(sequelize, DataTypes);
db.UserGoal           = require('./usergoal')(sequelize, DataTypes);
db.UserGoalCompletion = require('./usergoalcompletion')(sequelize, DataTypes);
db.UserPriority       = require('./userpriority')(sequelize, DataTypes);
db.Quote              = require('./quote')(sequelize, DataTypes);

// Onboarding
db.OnboardingQuestion       = require('./OnboardingQuestion')(sequelize, DataTypes);
db.OnboardingQuestionWeight = require('./OnboardingQuestionWeight')(sequelize, DataTypes);
db.UserOnboardingSubmission = require('./UserOnboardingSubmission')(sequelize, DataTypes);
db.UserQuestionnaireAnswer  = require('./UserQuestionnaireAnswer')(sequelize, DataTypes);

// --- 4) Associations ---
Object.keys(db).forEach((modelName) => {
  if (typeof db[modelName].associate === 'function') {
    db[modelName].associate(db);
  }
});

// --- 5) Export ---
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;