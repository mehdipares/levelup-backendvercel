const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'levelup_secret'; // même secret que ton /auth/login

module.exports = function maybeAuth(req, _res, next) {
  const auth = req.headers?.authorization || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return next();          // pas de token => on laisse passer (req.user restera undefined)

  try {
    req.user = jwt.verify(m[1], SECRET); // { id, username, email, iat, exp, ... }
  } catch {
    // Token invalide/expiré : on ignore, on n'attache pas de user
  }
  next();
};
