// Source unique du secret JWT, avec fail-fast au boot si absent ou trop court.
// Utilisé par routes/auth.js (signature) et utils/maybeAuth.js (vérification).
const SECRET = process.env.JWT_SECRET;

if (!SECRET || SECRET.length < 32) {
  console.error(
    '[FATAL] JWT_SECRET manquant ou trop court (< 32 caracteres). ' +
    'Definis JWT_SECRET dans .env (au moins 32 caracteres).'
  );
  process.exit(1);
}

module.exports = SECRET;
