'use strict';
const express = require('express');
const router = express.Router();
const { GoalTemplate, Category } = require('../models');
const { Op } = require('sequelize');

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
    if (q) where.title = { [Op.substring]: q }; // MySQL: LIKE %q% (collation souvent case-insensitive)

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
        // 404 pour ne pas révéler l’existence
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
router.post('/', async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentification requise' });

    const p = req.body || {};
    const title = String(p.title || '').trim();
    if (!title) return res.status(400).json({ error: 'title requis' });

    const visibility = ['global', 'private', 'unlisted'].includes(p.visibility) ? p.visibility : 'private';

    const payload = {
      title,
      description: p.description ?? null,
      category_id: p.category_id ?? null,
      base_xp: p.base_xp ?? 40, // bonus de priorité appliqué au moment du gain d’XP
      frequency_type: p.frequency_type ?? 'daily',
      frequency_interval: p.frequency_interval ?? 1,
      week_start: p.week_start ?? 1,
      max_per_period: p.max_per_period ?? 1,
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
router.put('/:id/enabled', async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const { enabled } = req.body || {};
    const tpl = await GoalTemplate.findByPk(req.params.id);
    if (!tpl) return res.status(404).json({ error: 'Template non trouvé' });

    if (tpl.owner_user_id) {
      // perso : propriétaire requis
      if (!userId || Number(tpl.owner_user_id) !== Number(userId)) {
        return res.status(403).json({ error: 'Non autorisé' });
      }
    } else {
      // global : admin requis
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
