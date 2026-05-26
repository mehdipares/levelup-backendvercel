// Middleware factorise pour valider req.body contre un schema Yup.
// Style defensif : si validation echoue, on coupe avec 400 et un message clair.
// On reaffecte req.body avec la valeur "cast" (trim, lowercase, types coerces).
module.exports = function validateBody(schema) {
  return async (req, res, next) => {
    try {
      const cleaned = await schema.validate(req.body, {
        abortEarly: false,   // remonte toutes les erreurs, pas juste la 1ere
        stripUnknown: true,  // supprime les champs non declares dans le schema
      });
      req.body = cleaned;
      next();
    } catch (err) {
      return res.status(400).json({
        error: 'Donnees invalides',
        details: Array.isArray(err.errors) ? err.errors : [err.message],
      });
    }
  };
};
