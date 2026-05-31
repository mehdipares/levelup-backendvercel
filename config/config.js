require("dotenv").config();

// SSL/TLS active si MYSQL_SSL=true (requis par AlwaysData prod, TiDB Cloud, etc.).
// minVersion TLSv1.2 + verification du certificat serveur (rejectUnauthorized).
const sslEnabled = String(process.env.MYSQL_SSL || '').toLowerCase() === 'true';
const sslDialectOptions = sslEnabled
  ? { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true } }
  : {};

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    port: process.env.DB_PORT || 3306,
    dialectOptions: sslDialectOptions,
  },
  production: {
    use_env_variable: "DATABASE_URL",
    dialect: process.env.DB_DIALECT || "mysql",
    dialectOptions: sslEnabled
      ? { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true } }
      : { ssl: { require: false } },
    logging: false
  }
};
