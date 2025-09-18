'use strict';
const express = require('express');
const router = express.Router();

/**
 * On importe ici toutes les entités Sequelize nécessaires.
 * - OnboardingQuestion : liste des questions affichées au questionnaire
 * - OnboardingQuestionWeight : mapping (question -> catégorie, poids)
 * - Category : catégories (Sport, Freelance, Mindset, etc.)
 * - UserOnboardingSubmission : une soumission (= une passation du questionnaire)
 * - UserQuestionnaireAnswer : réponses individuelles d'une soumission
 * - UserPriority : préférences calculées par catégorie pour l'utilisateur
 * - User : profil utilisateur (inclut le flag onboarding_done)
 */
const {
  sequelize, Sequelize,
  OnboardingQuestion,
  OnboardingQuestionWeight,
  Category,
  UserOnboardingSubmission,
  UserQuestionnaireAnswer,
  UserPriority,
  User,
} = require('../models');

const { Op } = Sequelize;

/* =============================================================================
   GET /onboarding/questions
   -----------------------------------------------------------------------------
   - Renvoie toutes les questions actives pour une langue donnée (fr par défaut)
   - 🔐 Protection : si l'utilisateur a déjà complété l'onboarding,
     on renvoie HTTP 409 (Conflict). Le front doit alors rediriger vers /DashBoard.
   - Pourquoi 409 ? Car l'état actuel de la ressource (l'onboarding) est "déjà fait"
     et la requête (obtenir des questions pour recommencer) est en conflit avec cet état.
   ========================================================================== */
router.get('/questions', async (req, res) => {
  try {
    // Langue de travail : 'fr' par défaut. On stocke les questions par langue en DB.
    const lang = (req.query.lang || 'fr').toLowerCase();

    // On identifie l'utilisateur pour savoir si on doit bloquer l'accès :
    // - soit via ?user_id=... (simple pour front sans middleware)
    // - soit via req.user?.id (si tu as un middleware d'auth JWT qui peuple req.user)
    const userId = Number(req.query.user_id || req.user?.id || 0);
    if (userId) {
      // On vérifie si l'onboarding est déjà complété.
      const u = await User.findByPk(userId, { attributes: ['id', 'onboarding_done'] });
      if (u && (u.onboarding_done === 1 || u.onboarding_done === true)) {
        // Déjà fait → on bloque ici. Le front redirigera vers /DashBoard.
        return res.status(409).json({ error: 'Onboarding déjà complété' });
      }
    }

    // On récupère la liste des questions actives de la langue demandée, triées pour l’affichage.
    const questions = await OnboardingQuestion.findAll({
      where: { enabled: true, language: lang },
      order: [['sort_order', 'ASC'], ['id', 'ASC']],
      attributes: ['id', 'code', 'question', 'sort_order'],
    });

    // Payload simple pour le front : liste + compteur + langue
    res.json({
      language: lang,
      count: questions.length,
      items: questions,
    });
  } catch (e) {
    console.error('GET /onboarding/questions', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/* =============================================================================
   POST /onboarding/answers
   -----------------------------------------------------------------------------
   Body attendu :
   {
     user_id?: number,              // utile si pas de middleware JWT
     language?: "fr",
     answers: [{question_id:number, value:1..5}, ...]   // on recommande >= 12
   }

   Pipeline :
   1) 🔐 Guard : refuse si user.onboarding_done = 1 (409 Conflict).
   2) Validation : user existant, >= 12 réponses valides, questions actives/langue ok.
   3) Création d'une submission (trace de la passation).
   4) Sauvegarde de chaque réponse (bulkCreate).
   5) Calcul des scores bruts par catégorie :
      - On centre la réponse : valueCentered = value - 3  (1→-2, 3→0, 5→+2)
      - Score brut += valueCentered * weight (poids de la question pour la catégorie)
   6) Normalisation des scores 0..100 :
      - Si min == max : on fixe 50 pour tout le monde (évite division par 0)
      - Sinon : (score - min) / (max - min) * 100
   7) Upsert dans user_priorities (bulk + updateOnDuplicate)
   8) Flag user.onboarding_done = 1
   9) Réponse : liste triée des catégories avec nom, score (0..100), rank.

   Remarques :
   - On encapsule le tout dans une transaction SQL pour garantir l'intégrité :
     soit tout passe, soit rien n'est écrit (rollback en cas d'erreur).
   ========================================================================== */
router.post('/answers', async (req, res) => {
  const t = await sequelize.transaction(); // 🔒 début transaction
  try {
    const lang = (req.body?.language || 'fr').toLowerCase();

    // On récupère l'id utilisateur : du body, ou via req.user si un middleware l'a renseigné.
    const userId = Number(req.body?.user_id || req.user?.id || 0);
    if (!userId) {
      await t.rollback();
      return res.status(400).json({ error: 'user_id requis (ou utilisez votre middleware auth)' });
    }

    // On lock le user pour éviter des courses (2 soumissions concurrentes par ex).
    const user = await User.findByPk(userId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    // 🔐 Guard : si déjà complété, on refuse.
    if (user.onboarding_done === 1 || user.onboarding_done === true) {
      await t.rollback();
      return res.status(409).json({ error: 'Onboarding déjà complété' });
    }

    // Normalisation et validation des réponses reçues
    const rawAnswers = Array.isArray(req.body?.answers) ? req.body.answers : [];
    const answers = rawAnswers
      .map(a => ({ qid: Number(a.question_id), val: Number(a.value) }))
      .filter(a => Number.isInteger(a.qid) && a.qid > 0 && a.val >= 1 && a.val <= 5);

    if (answers.length < 12) {
      await t.rollback();
      return res.status(400).json({ error: 'Au moins 12 réponses valides sont requises' });
    }

    // On ne garde que les réponses correspondant à des questions actives de la bonne langue
    const qids = [...new Set(answers.map(a => a.qid))];
    const validQuestions = await OnboardingQuestion.findAll({
      where: { id: qids, enabled: true, language: lang },
      attributes: ['id'],
      transaction: t,
    });
    const validSet = new Set(validQuestions.map(q => q.id));
    const filtered = answers.filter(a => validSet.has(a.qid));
    if (filtered.length < 12) {
      await t.rollback();
      return res.status(400).json({ error: 'Réponses insuffisantes sur questions actives' });
    }

    // On crée la "submission" (passation du questionnaire)
    const submission = await UserOnboardingSubmission.create({
      user_id: userId,
      submitted_at: new Date(),
    }, { transaction: t });

    // On enregistre les réponses une par une (bulkCreate = performant)
    const toInsert = filtered.map(a => ({
      submission_id: submission.id,
      user_id: userId,
      question_id: a.qid,
      answer_value: a.val,
      createdAt: new Date(),
    }));
    await UserQuestionnaireAnswer.bulkCreate(toInsert, { transaction: t });

    // On récupère les poids pour les questions répondues.
    // Chaque poids relie (question_id -> category_id, weight).
    const weights = await OnboardingQuestionWeight.findAll({
      where: { question_id: filtered.map(a => a.qid) },
      include: [{ model: Category, as: 'Category', attributes: ['id', 'name'] }],
      transaction: t,
    });

    // Map des réponses pour accès O(1)
    const ansMap = new Map(filtered.map(a => [a.qid, a.val]));

    // Calcul des scores bruts par catégorie :
    //   score += (answer_value - 3) * weight
    // (value - 3) centre autour de 0, range -2..+2 → permets d’avoir des additions positives/négatives.
    const scoreByCat = new Map(); // catId -> score
    for (const w of weights) {
      const qid = w.question_id;
      const val = ansMap.get(qid);
      if (typeof val !== 'number') continue;
      const centered = val - 3; // 1→-2, 2→-1, 3→0, 4→+1, 5→+2
      const add = centered * Number(w.weight);
      const catId = Number(w.category_id);
      scoreByCat.set(catId, (scoreByCat.get(catId) || 0) + add);
    }

    // On inclut toutes les catégories pour la normalisation (celles non touchées → 0)
    const allCats = await Category.findAll({ attributes: ['id', 'name'], transaction: t });
    for (const c of allCats) {
      if (!scoreByCat.has(c.id)) scoreByCat.set(c.id, 0);
    }

    // Normalisation 0..100 : on projette les scores bruts sur une échelle lisible.
    // - Si min == max → tout le monde à 50 (évite division par 0 et garde un visuel "moyen")
    const entries = [...scoreByCat.entries()];
    const rawScores = entries.map(([cid, s]) => s);
    const min = Math.min(...rawScores);
    const max = Math.max(...rawScores);

    const normalized = entries.map(([cid, s]) => {
      let score = 50.0;
      if (max !== min) score = ((s - min) / (max - min)) * 100.0;
      return { category_id: cid, score: Math.round(score * 10) / 10 }; // 1 décimale
    });

    // Upsert des priorités : on insère ou on met à jour si déjà existant (clé (user_id, category_id))
    const now = new Date();
    const priorityRows = normalized.map(n => ({
      user_id: userId,
      category_id: n.category_id,
      score: n.score,
      createdAt: now,
      updatedAt: now,
    }));
    await UserPriority.bulkCreate(priorityRows, {
      updateOnDuplicate: ['score', 'updatedAt'],
      transaction: t,
    });

    // ✅ On marque l’onboarding comme terminé.
    await user.update({ onboarding_done: true }, { transaction: t });

    // Construction d'une réponse "présentable" : on enrichit avec les noms de catégories
    // et on ajoute un rang (1 = la plus haute).
    const withNames = await Promise.all(normalized.map(async n => {
      const cat = allCats.find(c => Number(c.id) === Number(n.category_id));
      return { category_id: n.category_id, category_name: cat?.name || '', score: n.score };
    }));
    withNames.sort((a, b) => b.score - a.score);
    withNames.forEach((row, idx) => { row.rank = idx + 1; });

    // ✅ Tout s’est bien passé → commit !
    await t.commit();

    // On renvoie au front les priorités calculées. Il peut ensuite rediriger vers /DashBoard.
    res.json({
      onboarding_done: true,
      user_id: userId,
      priorities: withNames,
    });
  } catch (e) {
    // En cas d'erreur, on annule toutes les opérations DB commencées
    await t.rollback();
    console.error('POST /onboarding/answers', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;

/* =============================================================================
   NOTES / TODO
   -----------------------------------------------------------------------------
   - Si tu ajoutes un écran "éditer mes priorités" dans le Dashboard :
     * soit tu permets un "repassage" du questionnaire (dans ce cas, lever le garde),
       et tu écrases les UserPriority existantes comme ici (bulk upsert),
     * soit tu crées un écran d’édition directe des scores (avec garde admin, etc.).
   - Le choix de 409 pour "déjà complété" évite d’utiliser 403 (forbidden) car
     l’utilisateur a les droits, mais l’état courant est incompatible avec la requête.
   - La normalisation 0..100 est relative à l’ensemble des catégories du user,
     elle ne compare pas entre utilisateurs (et ce n’est pas forcément souhaitable).
   ========================================================================== */
