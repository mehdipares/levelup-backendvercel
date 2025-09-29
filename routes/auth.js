// routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult, matchedData } = require('express-validator');
const { User } = require('../models');

const router = express.Router();
const SECRET = process.env.JWT_SECRET || 'levelup_secret'; // ⚠️ mets une vraie valeur en prod

// Helper de validation (retourne 400 + détails)
const validate = (rules) => [
  ...rules,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array().map(e => ({ field: e.path, msg: e.msg }))
      });
    }
    next();
  }
];

// --------- REGISTER ---------
router.post(
  '/register',
  validate([
    body('username')
      .isString().withMessage('Username requis')
      .trim()
      .isLength({ min: 3, max: 40 }).withMessage('Username 3–40 caractères'),
    body('email')
      .isEmail().withMessage('Email invalide')
      .normalizeEmail(),
    body('password')
      .isStrongPassword({ minLength: 8, minSymbols: 0 })
      .withMessage('Mot de passe trop faible (≥8, lettres/chiffres)')
  ]),
  async (req, res) => {
    // matchedData ne garde que les champs validés/sanitized
    const { username, email, password } = matchedData(req);
    const emailNorm = String(email).toLowerCase();

    try {
      // Vérifie si l'email existe déjà
      const existing = await User.findOne({ where: { email: emailNorm } });
      if (existing) {
        return res.status(400).json({ error: 'Email déjà utilisé' });
      }

      // Hash du mot de passe
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create({
        username: username.trim(),
        email: emailNorm,
        password_hash: hashedPassword,
        level: 1,
        xp: 0
      });

      return res.status(201).json({
        message: 'Utilisateur créé avec succès',
        user: { id: user.id, username: user.username, email: user.email }
      });
    } catch (error) {
      console.error('Erreur inscription:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// --------- LOGIN ---------
router.post(
  '/login',
  validate([
    body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
    body('password').isLength({ min: 1 }).withMessage('Password requis')
  ]),
  async (req, res) => {
    const { email, password } = matchedData(req);
    const emailNorm = String(email).toLowerCase();

    try {
      const user = await User.findOne({ where: { email: emailNorm } });
      // Réponse générique pour ne pas révéler si l'email existe
      if (!user) return res.status(401).json({ error: 'Email ou mot de passe invalide' });

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) return res.status(401).json({ error: 'Email ou mot de passe invalide' });

      const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email },
        SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        message: 'Connexion réussie',
        token,
        user: { id: user.id, username: user.username, email: user.email }
      });
    } catch (error) {
      console.error('Erreur login:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

module.exports = router;
