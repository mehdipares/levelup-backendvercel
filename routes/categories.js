const express = require('express');
const router = express.Router();
const { Category } = require('../models');

// GET /categories – liste toutes les catégories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.findAll();
    res.json(categories);
  } catch (error) {
    console.error('Erreur GET /categories:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
