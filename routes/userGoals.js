'use strict';
const express = require('express');
const router = express.Router();
const { sequelize, Sequelize, User, UserGoal, GoalTemplate, UserGoalCompletion, UserPriority } = require('../models');
const { Op } = Sequelize;
const { progressFromTotalXp } = require('../utils/xp');

/* ------------------------- Helpers cadence & périodes ------------------------- */

function overridesFromCadence(cadence) {
  const c = String(cadence || '').toLowerCase();
  if (c === 'daily') {
    return {
      frequency_type_override: 'daily',
      frequency_interval_override: 1,
      week_start_override: null,
      max_per_period_override: 1,
    };
  }
  if (c === 'weekly') {
    return {
      frequency_type_override: 'weekly',
      frequency_interval_override: 1,
      week_start_override: 1, // lundi
      max_per_period_override: 1,
    };
  }
  return null;
}

// dates utilitaires
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays    = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const addMonths  = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);

/**
 * Fenêtre courante selon la cadence effective.
 * daily  -> [aujourd'hui 00:00, demain 00:00)
 * weekly -> [début de semaine, +7j) (weekStart: 1=lundi par défaut)
 * monthly-> [1er du mois, +n mois)
 * once   -> fenêtre “ouverte”
 */
function getPeriodBounds(now, type, interval = 1, weekStart = 1) {
  const today = startOfDay(now);

  if (type === 'daily') {
    return { start: today, end: addDays(today, Math.max(1, interval)) };
  }

  if (type === 'weekly') {
    // now.getDay(): 0=dim..6=sam
    // on mappe pour avoir 0=lundi..6=dim et calculer le décalage proprement
    const jsWeekday   = today.getDay();         // 0..6 (dim..sam)
    const weekdayMon0 = (jsWeekday + 6) % 7;    // 0..6 (lun..dim)
    const startMon0   = ((weekStart % 7) + 6) % 7; // 0..6 (lun..dim)
    const startOffset = (weekdayMon0 - startMon0 + 7) % 7;
    const start = addDays(today, -startOffset);
    const weeks = Math.max(1, interval);
    const end = addDays(start, 7 * weeks);
    return { start, end };
  }

  if (type === 'monthly') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end   = addMonths(start, Math.max(1, interval));
    return { start, end };
  }

  if (type === 'once') {
    return { start: new Date(1970, 0, 1), end: new Date(9999, 11, 31) };
  }

  // fallback
  return { start: today, end: addDays(today, 1) };
}

/** Multiplieur d’XP en fonction des priorités utilisateur. */
async function getXpMultiplier(userId, categoryId) {
  const prefs = await UserPriority.findAll({ where: { user_id: userId }, order: [['score', 'DESC']] });
  if (!prefs || !prefs.length) return 1.0;
  const top    = prefs[0]?.category_id;
  const second = prefs[1]?.category_id;
  if (Number(categoryId) === Number(top))    return 1.5;
  if (Number(categoryId) === Number(second)) return 1.25;
  return 1.0;
}

/* ------------------------- GET user goals (lazy rollover) ------------------------- */
// GET /users/:id/user-goals?status=active|archived|all
router.get('/:id/user-goals', async (req, res) => {
  const userId = Number(req.params.id);
  const status = String(req.query.status || 'active').toLowerCase();

  try {
    const where = { user_id: userId };
    if (status === 'active')     where.status = 'active';
    else if (status === 'archived') where.status = 'archived';

    const rows = await UserGoal.findAll({
      where,
      include: [{ model: GoalTemplate, as: 'GoalTemplate' }],
      order: [['id', 'ASC']],
    });

    const now = new Date();

    const payload = await Promise.all(
      rows.map(async (r) => {
        const gt = r.GoalTemplate;

        // cadence effective = override utilisateur sinon valeur template
        const effType     = r.frequency_type_override     || gt.frequency_type;
        const effInterval = r.frequency_interval_override ?? gt.frequency_interval;
        const effWeek     = r.week_start_override         ?? gt.week_start;
        const effMax      = r.max_per_period_override     ?? gt.max_per_period;

        // LAZY ROLLOVER : on recalcule la fenêtre courante à la lecture
        const { start, end } = getPeriodBounds(now, effType, effInterval, effWeek);

        // # de complétions dans CETTE fenêtre → “reset” implicite chaque matin / semaine
        const count = await UserGoalCompletion.count({
          where: { user_goal_id: r.id, completed_at: { [Op.gte]: start, [Op.lt]: end } },
        });

        return {
          id: r.id,
          user_id: r.user_id,
          status: r.status,

          // infos template
          template_id: gt.id,
          title: gt.title,
          category_id: gt.category_id,
          base_xp: gt.base_xp,

          // overrides stockés
          frequency_type_override: r.frequency_type_override,
          frequency_interval_override: r.frequency_interval_override,
          week_start_override: r.week_start_override,
          max_per_period_override: r.max_per_period_override,

          // effectif appliqué
          effective_frequency_type: effType,
          effective_frequency_interval: effInterval,
          effective_week_start: effWeek,
          effective_max_per_period: effMax,

          // badge simple pour l'UI
          cadence: effType === 'weekly' ? 'weekly' : (effType === 'daily' ? 'daily' : effType),

          // suivi période (calculé)
          last_completed_at: r.last_completed_at,
          completions_in_period: count,
          can_complete: count < effMax,
          period_start: start,
          period_end: end,
        };
      })
    );

    res.json(payload);
  } catch (e) {
    console.error('GET /users/:id/user-goals', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/* ------------------------- POST add user goal ------------------------- */
// POST /users/:id/user-goals { template_id, cadence: 'daily'|'weekly' }
router.post('/:id/user-goals', async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const template_id = Number(req.body?.template_id);
    const cadence = String(req.body?.cadence || '').toLowerCase();

    if (!userId || !template_id) {
      return res.status(400).json({ error: 'userId ou template_id manquant/invalide' });
    }
    if (!['daily', 'weekly'].includes(cadence)) {
      return res.status(400).json({ error: 'cadence requise (daily|weekly)' });
    }

    const tpl = await GoalTemplate.findByPk(template_id);
    if (!tpl) return res.status(404).json({ error: 'Template introuvable' });

    const ov = overridesFromCadence(cadence);
    if (!ov) return res.status(400).json({ error: 'cadence invalide (daily|weekly)' });

    const existing = await UserGoal.findOne({ where: { user_id: userId, template_id } });

    if (existing) {
      if (existing.status === 'archived') {
        existing.status = 'active';
        existing.frequency_type_override     = ov.frequency_type_override;
        existing.frequency_interval_override = ov.frequency_interval_override;
        existing.week_start_override         = ov.week_start_override;
        existing.max_per_period_override     = ov.max_per_period_override;
        await existing.save();
        return res.status(200).json({ id: existing.id, created: false, reactivated: true, cadence });
      }
      return res.status(200).json({ id: existing.id, created: false, reactivated: false, message: 'Déjà présent et actif' });
    }

    const created = await UserGoal.create({
      user_id: userId,
      template_id,
      status: 'active',
      frequency_type_override:     ov.frequency_type_override,
      frequency_interval_override: ov.frequency_interval_override,
      week_start_override:         ov.week_start_override,
      max_per_period_override:     ov.max_per_period_override,
    });

    return res.status(201).json({ id: created.id, created: true, cadence });
  } catch (e) {
    console.error('POST /users/:id/user-goals', e);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

/* ------------------------- PATCH complete ------------------------- */
// PATCH /users/:userId/user-goals/:userGoalId/complete
router.patch('/:userId/user-goals/:userGoalId/complete', async (req, res) => {
  const { userId, userGoalId } = req.params;
  const t = await sequelize.transaction();
  try {
    const userGoal = await UserGoal.findOne({
      where: { id: userGoalId, user_id: userId, status: 'active' },
      include: [{ model: GoalTemplate, as: 'GoalTemplate' }],
      lock: t.LOCK.UPDATE, transaction: t
    });
    if (!userGoal) {
      await t.rollback();
      return res.status(404).json({ error: 'UserGoal introuvable ou inactif' });
    }

    const gt = userGoal.GoalTemplate;

    const effType     = userGoal.frequency_type_override     || gt.frequency_type;
    const effInterval = userGoal.frequency_interval_override ?? gt.frequency_interval;
    const effWeek     = userGoal.week_start_override         ?? gt.week_start;
    const effMax      = userGoal.max_per_period_override     ?? gt.max_per_period;

    const now = new Date();
    const { start, end } = getPeriodBounds(now, effType, effInterval, effWeek);

    const count = await UserGoalCompletion.count({
      where: { user_goal_id: userGoal.id, completed_at: { [Op.gte]: start, [Op.lt]: end } },
      transaction: t
    });
    if (count >= effMax) {
      await t.rollback();
      return res.status(409).json({ error: 'Déjà complété pour la période en cours' });
    }

    const mult = await getXpMultiplier(userId, gt.category_id);
    const xpAwarded = Math.round(gt.base_xp * mult);

    await UserGoalCompletion.create({
      user_goal_id: userGoal.id,
      completed_at: now,
      xp_awarded: xpAwarded,
      period_key: (effType === 'weekly')
        ? `${now.getFullYear()}-W${Math.ceil(((now - new Date(now.getFullYear(),0,1)) / 86400000 + new Date(now.getFullYear(),0,1).getDay()+1)/7)}`
        : (effType === 'daily') ? now.toISOString().slice(0,10) : null
    }, { transaction: t });

    await userGoal.update({ last_completed_at: now }, { transaction: t });

    const user = await User.findByPk(userId, { transaction: t, lock: t.LOCK.UPDATE });
    const newXp = (user.xp || 0) + xpAwarded;
    const prog = progressFromTotalXp(newXp);
    await user.update({ xp: newXp, level: prog.level }, { transaction: t });

    await t.commit();
    return res.json({
      ok: true,
      awarded: xpAwarded,
      newXp,
      newLevel: prog.level,
      nextEligibleAt: end,
      xp_progress: prog,
    });
  } catch (e) {
    await t.rollback();
    console.error('PATCH /complete', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/* ------------------------- PATCH schedule ------------------------- */
// PATCH /users/:userId/user-goals/:userGoalId/schedule
router.patch('/:userId/user-goals/:userGoalId/schedule', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const userGoalId = Number(req.params.userGoalId);
    const cadence = String(req.body?.cadence || '').toLowerCase();

    if (!['daily', 'weekly'].includes(cadence)) {
      return res.status(400).json({ error: 'cadence requise (daily|weekly)' });
    }

    const ug = await UserGoal.findOne({
      where: { id: userGoalId, user_id: userId },
      include: [{ model: GoalTemplate, as: 'GoalTemplate' }]
    });
    if (!ug) return res.status(404).json({ error: 'UserGoal introuvable' });
    if (ug.status !== 'active') {
      return res.status(409).json({ error: 'Objectif archivé — réactive-le avant de changer la cadence' });
    }

    const ov = overridesFromCadence(cadence);
    if (!ov) return res.status(400).json({ error: 'cadence invalide (daily|weekly)' });

    ug.frequency_type_override     = ov.frequency_type_override;
    ug.frequency_interval_override = ov.frequency_interval_override;
    ug.week_start_override         = ov.week_start_override;
    ug.max_per_period_override     = ov.max_per_period_override;
    await ug.save();

    const gt = ug.GoalTemplate;
    const effType     = ug.frequency_type_override     || gt.frequency_type;
    const effInterval = ug.frequency_interval_override || gt.frequency_interval;
    const effWeek     = ug.week_start_override         || gt.week_start;
    const effMax      = ug.max_per_period_override     || gt.max_per_period;

    const now = new Date();
    const { start, end } = getPeriodBounds(now, effType, effInterval, effWeek);
    const count = await UserGoalCompletion.count({
      where: { user_goal_id: ug.id, completed_at: { [Op.gte]: start, [Op.lt]: end } }
    });

    return res.json({
      id: ug.id,
      updated: true,
      cadence,
      effective_frequency_type: effType,
      period_start: start,
      period_end: end,
      completions_in_period: count,
      can_complete: count < effMax
    });
  } catch (e) {
    console.error('PATCH /schedule', e);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

/* ------------------------- PATCH archive / unarchive ------------------------- */
router.patch('/:userId/user-goals/:userGoalId/archive', async (req, res) => {
  try {
    const { userId, userGoalId } = req.params;
    const row = await UserGoal.findOne({ where: { id: userGoalId, user_id: userId } });
    if (!row) return res.status(404).json({ error: 'UserGoal introuvable' });
    row.status = 'archived';
    await row.save();
    res.json({ id: row.id, status: row.status });
  } catch (e) {
    console.error('PATCH /archive', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.patch('/:userId/user-goals/:userGoalId/unarchive', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const userGoalId = Number(req.params.userGoalId);

    const ug = await UserGoal.findOne({
      where: { id: userGoalId, user_id: userId },
      include: [{ model: GoalTemplate, as: 'GoalTemplate' }]
    });
    if (!ug) return res.status(404).json({ error: 'UserGoal introuvable' });

    if (ug.status === 'active') {
      const gt = ug.GoalTemplate;
      const effType     = ug.frequency_type_override     || gt.frequency_type;
      const effInterval = ug.frequency_interval_override || gt.frequency_interval;
      const effWeek     = ug.week_start_override         || gt.week_start;
      const effMax      = ug.max_per_period_override     || gt.max_per_period;

      const now = new Date();
      const { start, end } = getPeriodBounds(now, effType, effInterval, effWeek);
      const count = await UserGoalCompletion.count({
        where: { user_goal_id: ug.id, completed_at: { [Op.gte]: start, [Op.lt]: end } }
      });

      return res.json({
        id: ug.id,
        status: 'active',
        already_active: true,
        cadence: effType === 'weekly' ? 'weekly' : 'daily',
        period_start: start,
        period_end: end,
        completions_in_period: count,
        can_complete: count < effMax
      });
    }

    ug.status = 'active';
    await ug.save();

    const gt = ug.GoalTemplate;
    const effType     = ug.frequency_type_override     || gt.frequency_type;
    const effInterval = ug.frequency_interval_override || gt.frequency_interval;
    const effWeek     = ug.week_start_override         || gt.week_start;
    const effMax      = ug.max_per_period_override     || gt.max_per_period;

    const now = new Date();
    const { start, end } = getPeriodBounds(now, effType, effInterval, effWeek);
    const count = await UserGoalCompletion.count({
      where: { user_goal_id: ug.id, completed_at: { [Op.gte]: start, [Op.lt]: end } }
    });

    return res.json({
      id: ug.id,
      reactivated: true,
      status: 'active',
      cadence: effType === 'weekly' ? 'weekly' : 'daily',
      period_start: start,
      period_end: end,
      completions_in_period: count,
      can_complete: count < effMax
    });
  } catch (e) {
    console.error('PATCH /unarchive', e);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

/* ------------------------- DELETE (archived only) ------------------------- */
router.delete('/:userId/user-goals/:userGoalId', async (req, res) => {
  const { userId, userGoalId } = req.params;
  const t = await sequelize.transaction();
  try {
    const ug = await UserGoal.findOne({ where: { id: userGoalId, user_id: userId }, transaction: t, lock: t.LOCK.UPDATE });
    if (!ug) {
      await t.rollback();
      return res.status(404).json({ error: 'UserGoal introuvable' });
    }
    if (ug.status !== 'archived') {
      await t.rollback();
      return res.status(409).json({ error: 'Suppression autorisée uniquement pour les objectifs archivés' });
    }

    await UserGoalCompletion.destroy({ where: { user_goal_id: ug.id }, transaction: t });
    await ug.destroy({ transaction: t });

    await t.commit();
    return res.json({ deleted: true });
  } catch (e) {
    await t.rollback();
    console.error('DELETE /users/:userId/user-goals/:userGoalId', e);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
