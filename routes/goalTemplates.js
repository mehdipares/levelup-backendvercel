'use strict';
const express = require('express');
const router = express.Router();
const { GoalTemplate, Category } = require('../models');
const { Op } = require('sequelize');
const validateBody = require('../utils/validateBody');
const { createTemplateSchema, toggleEnabledSchema } = require('./_validators');

/**
 * @swagger
 * tags:
 *   - name: GoalTemplates
 *     description: Catalogue de templates d’objectifs (globaux et personnels)
 */

/**
 * @swagger
 * /goal-templates:
 *   get:
 *     summary: Lister les templates d’objectifs
 *     description: |
 *       Sans `owner=me`, ne retourne que les templates `visibility=global`.
 *       Avec `owner=me`, retourne les templates du propriétaire (toutes visibilités).
 *     tags: [GoalTemplates]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: enabled
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Filtrer par enabled (true/false). Côté backend, accepte aussi 1/0.
 *       - in: query
 *         name: category_id
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filtrer par catégorie
 *       - in: query
 *         name: q
 *         required: false
 *         schema:
 *           type: string
 *         description: Recherche substring sur title
 *       - in: query
 *         name: owner
 *         required: false
 *         schema:
 *           type: string
 *           enum: [me, all]
 *         description: owner=me pour récupérer ses templates (nécessite un JWT)
 *     responses:
 *       200:
 *         description: Liste des templates
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/GoalTemplate'
 *       401:
 *         description: Auth requise pour owner=me
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 *   post:
 *     summary: Créer un template (privé par défaut)
 *     tags: [GoalTemplates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GoalTemplateCreateRequest'
 *     responses:
 *       201:
 *         description: Template créé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GoalTemplate'
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentification requise
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /goal-templates/{id}:
 *   get:
 *     summary: Récupérer un template par ID
 *     description: |
 *       Visibilité :
 *       - global : visible par tous
 *       - private/unlisted : visible uniquement par le propriétaire
 *     tags: [GoalTemplates]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Template trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GoalTemplate'
 *       404:
 *         description: Template non trouvé (ou non accessible)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /goal-templates/{id}/enabled:
 *   put:
 *     summary: Activer/désactiver un template
 *     description: |
 *       - Template perso (owner_user_id non null) : propriétaire uniquement
 *       - Template global (owner_user_id null) : admin uniquement
 *     tags: [GoalTemplates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GoalTemplateEnabledRequest'
 *     responses:
 *       200:
 *         description: État mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GoalTemplateEnabledResponse'
 *       400:
 *         description: enabled manquant ou invalide
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentification requise
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Non autorisé (propriétaire ou admin requis)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Template non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * Helper: récupère l'id utilisateur depuis le JWT (req.user).
 * ⚠️ Pas de fallback query/body pour éviter l'escalade d'accès.
 */
function getAuthUserId(req) {
  const id = req?.user?.id ?? req?.user?.userId ?? req?.user?.sub;
  return Number(id) || 0;
}

/** Helper: détecte un rôle admin (adapte selon ton payload JWT) */
function isAdmin(req) {
  return !!(req?.user && (req.user.is_admin === true || req.user.role === 'admin'));
}

/**
 * GET /goal-templates
 * Params :
 *  - enabled=1|0
 *  - category_id=<id>
 *  - q=<texte>               (recherche titre, côté SQL)
 *  - owner=me                (templates perso de l'utilisateur courant)
 *
 * Règles de visibilité :
 *  - sans owner=me  -> visibility='global' uniquement
 *  - avec owner=me  -> owner_user_id = userId (toutes visibilités du propriétaire)
 */
router.get('/', async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const where = {};

    // enabled
    if (req.query.enabled !== undefined) {
      const v = req.query.enabled;
      where.enabled = (v === '1' || v === 'true' || v === true);
    }

    // category
    if (req.query.category_id) where.category_id = Number(req.query.category_id);

    // owner=me => perso uniquement
    const ownerFlag = String(req.query.owner || '').toLowerCase();
    if (ownerFlag === 'me') {
      if (!userId) return res.status(401).json({ error: 'Authentification requise (owner=me)' });
      where.owner_user_id = userId;
      // pas de filtre visibility: le propriétaire voit ses private/unlisted/global
    } else {
      // catalogue public par défaut
      where.visibility = 'global';
    }

    // recherche plein-texte simple côté SQL (titre)
    const q = String(req.query.q || '').trim();
    if (q) where.title = { [Op.substring]: q };

    const rows = await GoalTemplate.findAll({
      where,
      include: [{ model: Category, as: 'Category' }],
      order: [['id', 'ASC']],
    });

    res.json(rows);
  } catch (e) {
    console.error('GET /goal-templates', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /goal-templates/:id
 * Visibilité :
 *  - global : visible par tous
 *  - private/unlisted : visible uniquement par le propriétaire
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const tpl = await GoalTemplate.findByPk(req.params.id, {
      include: [{ model: Category, as: 'Category' }],
    });
    if (!tpl) return res.status(404).json({ error: 'Template non trouvé' });

    if (tpl.visibility !== 'global') {
      if (!userId || Number(tpl.owner_user_id) !== Number(userId)) {
        return res.status(404).json({ error: 'Template non trouvé' });
      }
    }

    res.json(tpl);
  } catch (e) {
    console.error('GET /goal-templates/:id', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /goal-templates
 * Body (min) : { title, description?, category_id?, frequency_type?, frequency_interval?, week_start?, max_per_period?, visibility? }
 * - owner_user_id = utilisateur courant
 * - visibility par défaut = 'private'
 * - enabled par défaut = true
 */
router.post('/', validateBody(createTemplateSchema), async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentification requise' });

    const p = req.body || {};
    const title = String(p.title || '').trim();
    if (!title) return res.status(400).json({ error: 'title requis' });

    const visibility = ['global', 'private', 'unlisted'].includes(p.visibility) ? p.visibility : 'private';

    // Defaut metier : weekly = jusqu'a 7 validations par semaine (1 par jour max),
    // daily = 1 par jour. Permet de cliquer plusieurs fois sur un objectif
    // hebdomadaire si on le realise plusieurs jours dans la semaine.
    const freqType = p.frequency_type ?? 'daily';
    const defaultMaxPerPeriod = freqType === 'weekly' ? 7 : 1;

    const payload = {
      title,
      description: p.description ?? null,
      category_id: p.category_id ?? null,
      base_xp: p.base_xp ?? 40,
      frequency_type: freqType,
      frequency_interval: p.frequency_interval ?? 1,
      week_start: p.week_start ?? 1,
      max_per_period: p.max_per_period ?? defaultMaxPerPeriod,
      enabled: (typeof p.enabled === 'boolean') ? p.enabled : true,
      owner_user_id: userId,
      visibility,
    };

    const tpl = await GoalTemplate.create(payload);
    res.status(201).json(tpl);
  } catch (e) {
    console.error('POST /goal-templates', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /goal-templates/:id/enabled { enabled: true|false }
 * - Template perso (owner_user_id non null)  -> seul le propriétaire peut toggle.
 * - Template global (owner_user_id null)     -> nécessite un rôle admin.
 */
router.put('/:id/enabled', validateBody(toggleEnabledSchema), async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const { enabled } = req.body || {};
    const tpl = await GoalTemplate.findByPk(req.params.id);
    if (!tpl) return res.status(404).json({ error: 'Template non trouvé' });

    if (tpl.owner_user_id) {
      if (!userId || Number(tpl.owner_user_id) !== Number(userId)) {
        return res.status(403).json({ error: 'Non autorisé' });
      }
    } else {
      if (!isAdmin(req)) {
        return res.status(403).json({ error: 'Réservé aux administrateurs' });
      }
    }

    tpl.enabled = !!enabled;
    await tpl.save();
    res.json({ id: tpl.id, enabled: tpl.enabled });
  } catch (e) {
    console.error('PUT /goal-templates/:id/enabled', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
