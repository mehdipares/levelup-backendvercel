'use strict';
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { sequelize, User, UserPriority, Category } = require('../models'); // ⬅️ + sequelize
const { progressFromTotalXp } = require('../utils/xp');
const requireAuth = require('../utils/requireAuth'); // ✅ auth obligatoire pour PATCH & PUT

// GET /users/:id  → profil + xp_progress + onboarding_done
router.get('/:id', async (req, res) => {
  try {
    const u = await User.findByPk(req.params.id, {
      attributes: ['id', 'email', 'username', 'xp', 'level', 'onboarding_done', 'createdAt', 'updatedAt']
    });
    if (!u) return res.status(404).json({ error: 'User not found' });

    const xp_progress = progressFromTotalXp(u.xp || 0);

    res.json({
      id: u.id,
      email: u.email,
      username: u.username,
      xp: u.xp || 0,
      level: u.level || 1,
      onboarding_done: (u.onboarding_done === true || u.onboarding_done === 1 || u.onboarding_done === '1'),
      xp_progress,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    });
  } catch (e) {
    console.error('GET /users/:id', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PATCH /users/:id → update email / username (protégé)
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const meId = Number(req.user?.id);
    const targetId = Number(req.params.id);
    if (!meId) return res.status(401).json({ error: 'Non authentifié' });
    if (meId !== targetId) return res.status(403).json({ error: 'Accès refusé' });

    const { email, username } = req.body || {};
    if (email == null && username == null) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    const u = await User.findByPk(targetId);
    if (!u) return res.status(404).json({ error: 'User not found' });

    const next = {};

    // --- email ---
    if (typeof email === 'string') {
      const newEmail = email.trim().toLowerCase();
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(newEmail)) return res.status(400).json({ error: 'Email invalide' });

      if (newEmail !== (u.email || '').toLowerCase()) {
        const exists = await User.count({ where: { email: newEmail, id: { [Op.ne]: u.id } } });
        if (exists) return res.status(400).json({ error: 'Email déjà utilisé' });
        next.email = newEmail;
      }
    }

    // --- username ---
    if (typeof username === 'string') {
      const newName = username.trim();
      if (!newName.length) return res.status(400).json({ error: 'Le nom d’utilisateur est obligatoire' });
      if (newName.length > 40) return res.status(400).json({ error: 'Nom d’utilisateur trop long (≤ 40)' });

      // lettres/chiffres . _ -
      const nameRe = /^[a-zA-Z0-9._-]+$/;
      if (!nameRe.test(newName)) {
        return res.status(400).json({ error: 'Caractères autorisés: lettres, chiffres, . _ -' });
      }

      if (newName !== (u.username || '')) {
        const exists = await User.count({ where: { username: newName, id: { [Op.ne]: u.id } } });
        if (exists) return res.status(400).json({ error: 'Nom d’utilisateur déjà pris' });
        next.username = newName;
      }
    }

    // Rien à faire ?
    if (!Object.keys(next).length) {
      const xp_progress = progressFromTotalXp(u.xp || 0);
      return res.json({
        id: u.id,
        email: u.email,
        username: u.username,
        xp: u.xp || 0,
        level: u.level || 1,
        onboarding_done: (u.onboarding_done === true || u.onboarding_done === 1 || u.onboarding_done === '1'),
        xp_progress,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      });
    }

    await u.update(next);

    const xp_progress = progressFromTotalXp(u.xp || 0);
    res.json({
      id: u.id,
      email: u.email,
      username: u.username,
      xp: u.xp || 0,
      level: u.level || 1,
      onboarding_done: (u.onboarding_done === true || u.onboarding_done === 1 || u.onboarding_done === '1'),
      xp_progress,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    });
  } catch (e) {
    console.error('PATCH /users/:id', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /users/:id/priorities → préférences (catégorie + score)
router.get('/:id/priorities', async (req, res) => {
  try {
    const prefs = await UserPriority.findAll({
      where: { user_id: req.params.id },
      include: [{ model: Category, as: 'Category' }],
      order: [['score', 'DESC']]
    });
    res.json(prefs);
  } catch (e) {
    console.error('GET /users/:id/priorities', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /users/:id/priorities/order → enregistre l’ordre (protégé)
// Body: { ordered_category_ids: number[] }  (ordre du + prioritaire au - prioritaire)
router.put('/:id/priorities/order', requireAuth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const meId = Number(req.user?.id);
    const targetId = Number(req.params.id);
    if (!meId) { await t.rollback(); return res.status(401).json({ error: 'Non authentifié' }); }
    if (meId !== targetId) { await t.rollback(); return res.status(403).json({ error: 'Accès refusé' }); }

    const arrRaw = req.body?.ordered_category_ids;
    if (!Array.isArray(arrRaw) || !arrRaw.length) {
      await t.rollback();
      return res.status(400).json({ error: 'ordered_category_ids requis (array non vide)' });
    }

    // Sanitize + unicité
    const seen = new Set();
    const orderedIds = [];
    for (const x of arrRaw) {
      const n = Number(x);
      if (!Number.isFinite(n) || n <= 0) continue;
      if (seen.has(n)) continue;
      seen.add(n);
      orderedIds.push(n);
    }
    if (!orderedIds.length) {
      await t.rollback();
      return res.status(400).json({ error: 'Aucun id de catégorie valide' });
    }

    // --- Nouveau barème de scores par rang (1-indexé)
    // 1er=100, 2e=90, 3e=80, 4e=70, 5e=60, 6e=50, puis on descend plus doucement
    const SCORE_TABLE = [100, 90, 80, 70, 60, 50, 40, 35, 30, 25, 20, 15, 10, 5, 0];
    const scoreForRank = (rank) => {
      const idx = rank - 1;
      return (idx >= 0 && idx < SCORE_TABLE.length) ? SCORE_TABLE[idx] : 0;
    };

    const rows = orderedIds.map((cid, idx) => ({
      user_id: targetId,
      category_id: cid,
      score: scoreForRank(idx + 1),
    }));

    await UserPriority.bulkCreate(rows, {
      updateOnDuplicate: ['score'],
      transaction: t
    });

    await t.commit();
    return res.json({ ok: true, count: rows.length });
  } catch (e) {
    await t.rollback();
    console.error('PUT /users/:id/priorities/order', e);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});


module.exports = router;
