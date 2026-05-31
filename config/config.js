require("dotenv").config();

// SSL/TLS active si MYSQL_SSL=true (requis par TiDB Cloud Serverless,
// AlwaysData avec SSL, et plupart des MySQL manages modernes).
// minVersion TLSv1.2 + verification du certificat serveur.
const sslEnabled = String(process.env.MYSQL_SSL || '').toLowerCase() === 'true';
const sslDialectOptions = sslEnabled
  ? { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true } }
  : {};

// Config commune dev/prod basee sur les variables d'environnement separees.
// Si DATABASE_URL est definie, c'est elle qui est lue en priorite dans
// models/index.js (cas Render avec URI complete) et cette config sert de
// fallback. Garder une config unique evite les divergences silencieuses
// entre environnements.
const baseConfig = {
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  dialect: process.env.DB_DIALECT || "mysql",
  port: Number(process.env.DB_PORT) || 3306,
  dialectOptions: sslDialectOptions,
  logging: false,
};

module.exports = {
  development: baseConfig,
  production: baseConfig,
  test: baseConfig,
};
