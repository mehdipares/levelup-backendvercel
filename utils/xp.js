// utils/xp.js

// XP nécessaire pour passer du niveau N -> N+1
function calculateNextLevelXp(level) {
  return Math.floor(50 * level + Math.pow(level, 1.8));
}

// À partir d'un XP total, calcule la progression dans le niveau courant.
// Renvoie : { level, prevTotal, nextTotal, current, span, percent }
function progressFromTotalXp(totalXp) {
  const xp = Math.max(0, Number(totalXp || 0));

  let level = 1;
  let prevTotal = 0;                       // XP cumulé au début du niveau courant
  let span = calculateNextLevelXp(level);  // XP requis pour passer au niveau suivant

  // On avance de niveau tant que l'XP total dépasse le palier courant
  while (xp >= prevTotal + span) {
    prevTotal += span;
    level += 1;
    span = calculateNextLevelXp(level);
  }

  const nextTotal = prevTotal + span;            // XP total requis pour atteindre le prochain niveau
  const current = Math.max(0, xp - prevTotal);   // progression dans le niveau courant
  const percent = Math.floor((current / span) * 100);

  return { level, prevTotal, nextTotal, current, span, percent };
}

module.exports = {
  calculateNextLevelXp,
  progressFromTotalXp,
};
