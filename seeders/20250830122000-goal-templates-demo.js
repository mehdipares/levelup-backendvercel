'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert('goal_templates', [
      // Sport (category_id = 1)
      { category_id: 1, title: '30 min de cardio', description: 'Séance légère ou HIIT', frequency: 'daily', base_xp: 40, enabled: 1, createdAt: now, updatedAt: now },
      { category_id: 1, title: '10 000 pas', description: 'Marche sportive', frequency: 'daily', base_xp: 35, enabled: 1, createdAt: now, updatedAt: now },
      // Mental (2)
      { category_id: 2, title: 'Méditer 10 minutes', description: 'Respiration + focus', frequency: 'daily', base_xp: 30, enabled: 1, createdAt: now, updatedAt: now },
      { category_id: 2, title: 'Journal 5 lignes', description: 'Gratitude/reflexion', frequency: 'daily', base_xp: 25, enabled: 1, createdAt: now, updatedAt: now },
      // Bien-être (3)
      { category_id: 3, title: 'Boire 2L d’eau', description: 'Hydratation', frequency: 'daily', base_xp: 25, enabled: 1, createdAt: now, updatedAt: now },
      { category_id: 3, title: '8h de sommeil', description: 'Coucher à heure fixe', frequency: 'daily', base_xp: 30, enabled: 1, createdAt: now, updatedAt: now },
      // Carrière & Projets (4)
      { category_id: 4, title: '1h de deep work', description: 'Sans distraction', frequency: 'daily', base_xp: 60, enabled: 1, createdAt: now, updatedAt: now },
      { category_id: 4, title: 'Pitch 1 client', description: 'Prospection freelance', frequency: 'weekly', base_xp: 80, enabled: 1, createdAt: now, updatedAt: now },
    ]);
  },

  async down (queryInterface) {
    await queryInterface.bulkDelete('goal_templates', null, {});
  }
};
