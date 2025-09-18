// utils/requireAuth.js
module.exports = function requireAuth(req, res, next) {
  const u =
    req.user ??
    (req.auth && (typeof req.auth === 'object' ? req.auth : { id: req.auth })) ??
    (req.userId && { id: req.userId });

  if (!u || !u.id) return res.status(401).json({ error: 'Non authentifié' });

  // normalise pour la suite de la chaîne
  req.user = { id: Number(u.id), email: u.email, username: u.username };
  next();
};
