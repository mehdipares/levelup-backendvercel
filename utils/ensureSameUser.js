// utils/ensureSameUser.js
module.exports = function ensureSameUser(req, res, next) {
  const meId = Number(req.user?.id);
  const targetId = Number(req.params.id);
  if (!meId) return res.status(401).json({ error: 'Non authentifié' });
  if (meId !== targetId) return res.status(403).json({ error: 'Forbidden' });
  next();
};
