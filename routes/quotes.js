const express = require('express');
const router = express.Router();
const { Quote } = require('../models');

function dayHash(s){ let h=0; for (let i=0;i<s.length;i++){ h=(h*31 + s.charCodeAt(i))>>>0; } return h; }

router.get('/today', async (req, res) => {
  try {
    const lang = (req.query.lang || 'fr').toString().trim().toLowerCase();

    const total = await Quote.count({ where: { is_active: true, language: lang } });
    if (!total) return res.status(404).json({ message: 'Aucune citation active pour cette langue.' });

    const day = new Date().toISOString().slice(0,10);
    const index = dayHash(day) % total;

    const rows = await Quote.findAll({
      where: { is_active: true, language: lang },
      order: [['id','ASC']],
      offset: index,
      limit: 1
    });

    const q = rows[0];
    if (!q) return res.status(404).json({ message: 'Aucune citation trouvée.' });

    res.json({ text: q.text, author: q.author, language: q.language });
  } catch (e) {
    console.error('/quotes/today error:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
