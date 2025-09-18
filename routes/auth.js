const express = require('express');
const bcrypt = require('bcrypt');
const { User } = require('../models');

const router = express.Router();

// POST /auth/register – inscription d’un nouvel utilisateur
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Vérifie si l'utilisateur existe déjà
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email déjà utilisé' });
    }

    // Hachage du mot de passe
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Création du compte utilisateur
    const user = await User.create({
      username,
      email,
      password_hash: hashedPassword,
      level: 1,
      xp: 0
    });

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'levelup_secret'; // Mets un vrai secret dans .env

// POST /auth/login – connexion
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Vérifie si l’utilisateur existe
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Email ou mot de passe invalide' });

    // 2. Compare le mot de passe
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Email ou mot de passe invalide' });

    // 3. Génère un token
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      SECRET,
      { expiresIn: '7d' } // expire dans 7 jours
    );

    res.json({ message: 'Connexion réussie', token });

  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
