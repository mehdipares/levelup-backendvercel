const express = require('express');
const router = express.Router();
const { Category } = require('../models');

/**
 * @swagger
 * tags:
 *   - name: Categories
 *     description: Categories d'objectifs (ex: Sante, Sport, etc.)
 */

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Lister toutes les categories
 *     tags: [Categories]
 *     security: []
 *     responses:
 *       200:
 *         description: Liste des categories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

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
